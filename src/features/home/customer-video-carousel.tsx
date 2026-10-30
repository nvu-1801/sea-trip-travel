"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { parseYouTubeUrl } from "@/lib/youtube";
import {
  customerDisplayTitle,
  customerVideoSideCount,
  customerVideoSlot,
} from "@/lib/customer-carousel";

export type CustomerVideo = {
  id: string;
  title: string;
  customer: string;
  youtubeUrl: string;
  cover?: { src?: string; alt: string };
};

export type CustomerVideoLabels = {
  play: string;
  close: string;
  fallbackTitle: string;
  previous: string;
  next: string;
  center: string;
  dialog: string;
};

const AUTOPLAY_MS = 2000;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const COMPACT_QUERY = "(max-width: 1023px)";

const subscribeReduced = (notify: () => void) => {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const getReduced = () => window.matchMedia(REDUCED_QUERY).matches;

const subscribeCompact = (notify: () => void) => {
  const query = window.matchMedia(COMPACT_QUERY);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const getCompact = () => window.matchMedia(COMPACT_QUERY).matches;

const subscribeVisibility = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify);
  return () => document.removeEventListener("visibilitychange", notify);
};
const getHidden = () => document.visibilityState === "hidden";

function label(template: string, title: string) {
  return template.replace("{title}", title);
}

/**
 * 3D coverflow for real customer videos.
 *
 * A single state value (`active`) drives every card's slot; the movement itself
 * is CSS transform/opacity, so React never renders during the 760ms transition
 * or on each autoplay frame. Autoplay steps the active index *backwards*, which
 * moves the left card into the centre and the centre card to the right - the
 * direction requested for this section. A wrapping index makes the loop
 * seamless: cards animate between slots instead of resetting to the first one.
 */
export function CustomerVideoCarousel({
  videos,
  labels,
}: {
  videos: CustomerVideo[];
  labels: CustomerVideoLabels;
}) {
  const count = videos.length;
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, () => false);
  const compact = useSyncExternalStore(subscribeCompact, getCompact, () => false);
  const hidden = useSyncExternalStore(subscribeVisibility, getHidden, () => false);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(true);
  const [playing, setPlaying] = useState<CustomerVideo | null>(null);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const stageRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const pointerStart = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const maxSide = customerVideoSideCount(count, compact);

  const move = useCallback(
    (direction: -1 | 1) => {
      if (count < 2) return;
      setActive((current) => (current + direction + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (
      count < 2 ||
      playing ||
      hovered ||
      hidden ||
      reduced ||
      !inView
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      // The site-wide motion switch is an attribute, not React state, so this
      // stays a cheap read instead of forcing another subscription.
      if (document.documentElement.dataset.motionPaused === "true") return;
      setActive((current) => (current - 1 + count) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [
    active,
    count,
    hidden,
    hovered,
    inView,
    playing,
    reduced,
  ]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInView(entry.isIntersecting);
      },
      { rootMargin: "120px 0px", threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const closeVideo = useCallback(() => {
    setPlaying(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!playing) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeVideo();
        return;
      }
      if (event.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeVideo, playing]);

  const embed = useMemo(
    () => (playing ? parseYouTubeUrl(playing.youtubeUrl) : null),
    [playing],
  );

  const modal =
    playing && embed && typeof document !== "undefined"
      ? createPortal(
          <div
            className="stt-cc-modal-veil"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeVideo();
            }}
          >
            <div
              ref={dialogRef}
              className="stt-cc-modal"
              role="dialog"
              aria-modal="true"
              aria-label={labels.dialog}
            >
              <div className="stt-cc-modal-head">
                <span>{playing.customer || labels.fallbackTitle}</span>
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label={labels.close}
                  onClick={closeVideo}
                >
                  {"\u00d7"}
                </button>
              </div>
              <div className="stt-cc-modal-frame">
                <iframe
                  src={`${embed.embedUrl}?autoplay=1&rel=0&modestbranding=1`}
                  title={playing.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <p>{playing.title}</p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className="stt-cc"
      data-playing={playing ? "true" : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={stageRef}
        className="stt-cc-stage"
        role="region"
        aria-roledescription="carousel"
        aria-label={labels.dialog}
        onPointerDown={(event) => {
          if (event.pointerType === "touch" || event.pointerType === "pen") {
            pointerStart.current = event.clientX;
          }
        }}
        onPointerUp={(event) => {
          if (pointerStart.current === null) return;
          const delta = event.clientX - pointerStart.current;
          pointerStart.current = null;
          if (Math.abs(delta) < 44) return;
          move(delta < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
      >
        {videos.map((video, index) => {
          const slot = customerVideoSlot(index, active, count);
          const visible = Math.abs(slot) <= maxSide;
          const parsed = parseYouTubeUrl(video.youtubeUrl);
          if (!parsed) return null;
          const title = video.title || labels.fallbackTitle;
          const displayTitle = customerDisplayTitle(title);
          const customer = video.customer.trim();
  const accessible = customer ? `${customer} - ${title}` : title;
          const previewSrc =
            video.cover?.src || `/api/youtube-thumb/${parsed.id}`;
          const previewFailed = failed.has(video.id);
          const isCentre = visible && slot === 0;
          return (
            <article
              key={video.id}
              className="stt-cc-card"
              data-slot={visible ? slot : "hidden"}
              data-current={isCentre ? "true" : undefined}
              aria-hidden={visible ? undefined : "true"}
            >
              <button
                type="button"
                className="stt-cc-face"
                tabIndex={visible ? 0 : -1}
                aria-label={
                  isCentre
                    ? label(labels.play, accessible)
                    : label(labels.center, accessible)
                }
                onClick={(event) => {
                  if (isCentre) {
                    triggerRef.current = event.currentTarget;
                    setPlaying(video);
                  } else {
                    setActive(index);
                  }
                }}
              >
                {previewSrc && !previewFailed ? (
                  <Image
                    src={previewSrc}
                    alt={isCentre ? video.cover?.alt || accessible : ""}
                    fill
                    sizes="(max-width: 640px) 84vw, (max-width: 1023px) 58vw, 36vw"
                    className="stt-cc-image"
                    onError={() =>
                      setFailed((current) => {
                        const next = new Set(current);
                        next.add(video.id);
                        return next;
                      })
                    }
                  />
                ) : (
                  <span className="stt-cc-fallback" aria-hidden="true">
                    SEA TRIP
                  </span>
                )}
                {isCentre ? (
                  <>
                    <span className="stt-cc-shade" aria-hidden="true" />
                    <span className="stt-cc-play" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                      </svg>
                    </span>
                    <span className="stt-cc-copy">
                      {customer ? (
                        <span className="stt-cc-customer">{customer}</span>
                      ) : null}
                      <span className="stt-cc-title">{displayTitle}</span>
                    </span>
                  </>
                ) : null}
              </button>
            </article>
          );
        })}
      </div>
      <div className="stt-cc-nav">
        <button
          type="button"
          className="stt-cc-arrow"
          data-side="previous"
          aria-label={labels.previous}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => move(-1)}
          disabled={count < 2}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m14.5 5-7 7 7 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="stt-cc-arrow"
          data-side="next"
          aria-label={labels.next}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => move(1)}
          disabled={count < 2}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m9.5 5 7 7-7 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {modal}
    </div>
  );
}
