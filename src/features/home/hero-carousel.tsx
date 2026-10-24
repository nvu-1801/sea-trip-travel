"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HeroConfig } from "@/domain/home-hero";
import type { Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import { ArrowRightIcon, ChevronRightIcon } from "@/components/ui/icons";
import { MaskedHeading } from "@/components/motion/word-reveal";
import type { HeroCopy } from "./hero-copy";
import { HorizonCanvas } from "./horizon-canvas";

export function HeroCarousel({
  config,
  copy,
  locale,
  motionEnabled,
}: {
  config: HeroConfig;
  copy: HeroCopy;
  locale: Locale;
  motionEnabled: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(!config.autoplay);
  const [blocked, setBlocked] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const frame = useRef<HTMLElement>(null);
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
      <div className="stt-cinema-stage">
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
        <HorizonCanvas tone="dark" alpha={0.92} />
        <div className="stt-cinema-shade" aria-hidden="true" />
        {/* A single light sweep per slide change: it sells the "new chapter"
            beat without touching the photograph's own colour. */}
        <span
          key={`sweep-${active.id}`}
          className="stt-cinema-sweep"
          aria-hidden="true"
        />

        <div className="stt-cinema-copy" key={`copy-${active.id}`}>
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
