"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HeroConfig } from "@/domain/home-hero";
import type { Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import { ArrowRightIcon, ChevronRightIcon } from "@/components/ui/icons";
import { MaskedHeading } from "@/components/motion/word-reveal";
import { motionAllowed, subscribeMotion } from "@/lib/motion";
import type { HeroCopy } from "./hero-copy";
import { CinematicSea } from "./cinematic-sea";
import { initCinematicScroll } from "./cinematic-scroll";

export function HeroCarousel({
  config,
  copy,
  locale,
  motionEnabled,
  scrollCue,
}: {
  config: HeroConfig;
  copy: HeroCopy;
  locale: Locale;
  motionEnabled: boolean;
  scrollCue: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(!config.autoplay);
  const [blocked, setBlocked] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const frame = useRef<HTMLElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLAnchorElement>(null);
  const seaProgress = useRef(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const english = locale === "en";
  const count = config.slides.length;
  const active = config.slides[index % count];
  const label = english ? active.captionEn : active.caption;
  const title = (english ? active.titleEn : active.title) || copy.titleLine1;
  const description =
    (english ? active.descriptionEn : active.description) || copy.description;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const update = () =>
      setBlocked(
        !motionEnabled ||
          media.matches ||
          document.hidden ||
          !visible ||
          document.documentElement.dataset.motionPaused === "true",
      );
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-motion-paused"],
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    if (frame.current) intersection.observe(frame.current);
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    queueMicrotask(update);
    return () => {
      observer.disconnect();
      intersection.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [motionEnabled]);
  useEffect(() => {
    if (!config.autoplay || paused || blocked || count < 2) return;
    const timer = setTimeout(
      () => setIndex((current) => (current + 1) % count),
      config.intervalSeconds * 1000,
    );
    return () => clearTimeout(timer);
  }, [
    index,
    count,
    config.autoplay,
    config.intervalSeconds,
    paused,
    blocked,
  ]);

  /**
   * The one pinned scroll moment. GSAP owns the timeline and the scene reads
   * the same progress ref, so no React state changes on scroll and there is no
   * second scroll loop. Rebuilds only when the motion preference itself flips
   * (reduced motion or the owner pause switch); tab visibility is left to the
   * scene and the carousel.
   */
  useEffect(() => {
    const root = frame.current;
    const windowEl = windowRef.current;
    if (!root || !windowEl) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;
    let allowed = motionAllowed();

    const setup = async () => {
      if (!allowed) {
        seaProgress.current = 0.24;
        return;
      }
      try {
        const dispose = await initCinematicScroll({
          root,
          windowEl,
          copyEl: copyRef.current,
          shadeEl: shadeRef.current,
          cueEl: cueRef.current,
          progress: seaProgress,
        });
        if (disposed) dispose();
        else cleanup = dispose;
      } catch {
        // GSAP could not load; the static composition is already complete.
        cleanup = undefined;
      }
    };

    void setup();

    const unsubscribe = subscribeMotion(() => {
      if (document.hidden) return;
      const next = motionAllowed();
      if (next === allowed) return;
      allowed = next;
      cleanup?.();
      cleanup = undefined;
      seaProgress.current = next ? 0 : 0.24;
      if (next) void setup();
    });

    return () => {
      disposed = true;
      unsubscribe();
      cleanup?.();
    };
  }, []);

  const navigate = (direction: number) => {
    setIndex((current) => (current + direction + count) % count);
  };
  return (
    <section
      ref={frame}
      data-hero-mode="carousel"
      data-motion-enabled={motionEnabled}
      data-motion-blocked={blocked}
      className="stt-travel-hero stt-cinematic-hero"
      role="region"
      aria-roledescription="carousel"
      aria-label={english ? "Travel inspiration" : "Cảm hứng hành trình"}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          navigate(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
      onFocusCapture={(event) => {
        if ((event.target as HTMLElement).matches(":focus-visible")) setPaused(true);
      }}
      onPointerDown={(event) => {
        if (
          (event.target as HTMLElement).closest("a,button") ||
          event.pointerType === "mouse"
        )
          return;
        touch.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        if (!touch.current) return;
        const x = event.clientX - touch.current.x,
          y = event.clientY - touch.current.y;
        if (Math.abs(x) > 50 && Math.abs(x) > Math.abs(y) * 1.4)
          navigate(x < 0 ? 1 : -1);
        touch.current = null;
      }}
      onPointerCancel={() => {
        touch.current = null;
      }}
    >
      <div className="stt-cinema-stage" data-cinematic-stage="">
        <CinematicSea progressRef={seaProgress} />
        <div className="stt-cinema-sea-scrim" aria-hidden="true" />

        <div
          className="stt-cinema-window"
          ref={windowRef}
          data-cinematic-window=""
        >
          {config.slides.map((slide, position) => (
            <div
              key={slide.id}
              className="stt-cinema-image"
              data-active={position === index % count}
              aria-hidden={position !== index % count}
            >
              {!failed.includes(slide.id) && (
                <Image
                  src={slide.image.src}
                  alt={slide.image.alt}
                  fill
                  sizes="100vw"
                  preload={position === 0}
                  loading={position === 0 ? undefined : "eager"}
                  style={{
                    objectPosition: `${slide.image.positionX}% ${slide.image.positionY}%`,
                  }}
                  className="object-cover"
                  onError={() => setFailed((items) => [...items, slide.id])}
                />
              )}
            </div>
          ))}
          <div className="stt-cinema-shade" ref={shadeRef} aria-hidden="true" />
          {/* A single light sweep per slide change: it sells the "new chapter"
              beat without touching the photograph's own colour. */}
          <span
            key={`sweep-${active.id}`}
            className="stt-cinema-sweep"
            aria-hidden="true"
          />
          <span className="stt-cinema-window-grain" aria-hidden="true" />
        </div>

        <div className="stt-cinema-top-scrim" aria-hidden="true" />

        <div className="stt-cinema-copy" ref={copyRef}>
          <div className="stt-cinema-copy-inner" key={`copy-${active.id}`}>
            <p className="stt-cinema-eyebrow">{copy.badge}</p>
            <MaskedHeading
              as="h1"
              className="stt-cinema-title"
              lines={[
                { text: title },
                ...(copy.titleLine2
                  ? [{ text: copy.titleLine2, emphasis: true }]
                  : []),
              ]}
              stagger={58}
              lineStagger={130}
            />
            <p className="stt-cinema-description">{description}</p>
            <div className="stt-cinema-actions">
              <Link
                href={localizePath(locale, config.primaryHref)}
                className="stt-cinema-primary"
              >
                {copy.primaryLabel}
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <Link
                href={localizePath(locale, config.secondaryHref)}
                className="stt-cinema-secondary"
              >
                {copy.secondaryLabel}
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <a href="#tim-hanh-trinh" className="stt-cinema-cue" ref={cueRef}>
            <span className="stt-cinema-cue-line" aria-hidden="true" />
            {scrollCue}
          </a>
        </div>

        <div className="stt-cinema-bottom">
          <div
            className="stt-cinema-caption"
            aria-live={paused || blocked ? "polite" : "off"}
            aria-atomic="true"
          >
            <span>
              {String((index % count) + 1).padStart(2, "0")} /{" "}
              {String(count).padStart(2, "0")}
            </span>
            <p>{label}</p>
          </div>
          {count > 1 && (
            <div className="stt-cinema-rail">
              <div
                className="stt-cinema-dots"
                role="group"
                aria-label={english ? "Choose a photo" : "Chọn ảnh mở đầu"}
              >
                {config.slides.map((slide, position) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`${english ? "Photo" : "Ảnh"} ${position + 1}: ${english ? slide.captionEn : slide.caption}`}
                    aria-current={
                      position === index % count ? "true" : undefined
                    }
                    onClick={() => {
                      setIndex(position);
                    }}
                  >
                    <span />
                  </button>
                ))}
              </div>
              <div className="stt-cinema-controls">
                <button
                  type="button"
                  aria-label={english ? "Previous photo" : "Ảnh trước"}
                  onClick={() => navigate(-1)}
                >
                  <ChevronRightIcon className="h-5 w-5 rotate-180" />
                </button>
                <button
                  type="button"
                  aria-label={english ? "Next photo" : "Ảnh tiếp theo"}
                  onClick={() => navigate(1)}
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
