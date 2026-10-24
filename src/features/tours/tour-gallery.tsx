"use client";

import { useEffect, useRef, useState } from "react";
import type { ImageAsset } from "@/domain/common";
import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

export type TourGalleryLabels = {
  /** "Ảnh tour {title}" */
  aria: string;
  listAria: string;
  /** "Ảnh {index}" */
  imageSr: string;
  /** "{title} — ảnh {index}" */
  alt: string;
  /** "{title} — ảnh minh hoạ" */
  placeholderAlt: string;
  /** "Ảnh trước" */
  prev: string;
  /** "Ảnh sau" */
  next: string;
  /** "Ảnh {index}/{total}" */
  counter: string;
};

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    vars[key] === undefined ? match : String(vars[key]),
  );
}

/**
 * Tour gallery.
 *
 * Implements the ARIA tabs pattern: thumbnails are `role="tab"` buttons that
 * control the active panel. Arrow keys move between thumbnails, Home/End jump
 * to the ends — so the gallery is fully usable without a pointer.
 *
 * The thumbnail rail is a horizontal scroller flanked by a previous/next pair,
 * and it keeps the selected thumbnail centred. Centring is the point: a
 * left-aligned scroller looks like a complete row of photos, so a visitor never
 * learns that more photos are hidden past the right edge.
 */
export function TourGallery({
  images,
  title,
  labels,
}: {
  images: readonly ImageAsset[];
  title: string;
  labels: TourGalleryLabels;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef(new Map<number, HTMLButtonElement>());
  const railRef = useRef<HTMLDivElement | null>(null);

  const safeImages =
    images.length > 0
      ? images
      : [{ alt: fmt(labels.placeholderAlt, { title }) } as ImageAsset];
  const active = safeImages[Math.min(activeIndex, safeImages.length - 1)];
  const canSlide = safeImages.length > 1;

  /** Bring the selected thumbnail to the middle of the rail. */
  useEffect(() => {
    const rail = railRef.current;
    const tab = tabRefs.current.get(activeIndex);
    if (!rail || !tab) return;

    const railBox = rail.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    const centred =
      rail.scrollLeft +
      (tabBox.left - railBox.left) -
      (rail.clientWidth - tabBox.width) / 2;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    rail.scrollTo({
      left: Math.max(0, centred),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeIndex]);

  const focusTab = (index: number) => {
    const clamped = (index + safeImages.length) % safeImages.length;
    setActiveIndex(clamped);
    tabRefs.current.get(clamped)?.focus();
  };

  const step = (direction: -1 | 1) =>
    setActiveIndex((current) => {
      const next = current + direction;
      return next < 0 || next > safeImages.length - 1 ? current : next;
    });

  return (
    <div className="mx-auto flex w-full max-w-[500px] flex-col gap-3">
      <div
        id="tour-gallery-panel"
        role="tabpanel"
        aria-labelledby={canSlide ? `tour-gallery-tab-${activeIndex}` : undefined}
        aria-label={fmt(labels.aria, { title })}
        className="overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-soft"
      >
        <div className="relative">
          <AssetImage
            image={active}
            altFallback={title}
            priority
            fit="cover"
            sizes="(max-width: 532px) calc(100vw - 32px), 500px"
            className="aspect-[4/3] w-full sm:aspect-[16/10]"
            markPlaceholder
          />

          {canSlide ? (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-3 rounded-full bg-foreground/55 px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide text-white backdrop-blur-sm"
              >
                {activeIndex + 1}/{safeImages.length}
              </span>
              <span className="sr-only">
                {fmt(labels.counter, {
                  index: activeIndex + 1,
                  total: safeImages.length,
                })}
              </span>
            </>
          ) : null}
        </div>

        {active.caption ? (
          <p className="px-4 py-3 text-sm text-foreground-muted">{active.caption}</p>
        ) : null}
      </div>

      {canSlide ? (
        <div className="flex items-center gap-1.5">
          <RailArrow
            label={labels.prev}
            direction="prev"
            disabled={activeIndex === 0}
            onClick={() => step(-1)}
          />

          <div
            ref={railRef}
            role="tablist"
            aria-label={labels.listAria}
            aria-orientation="horizontal"
            className="no-scrollbar flex flex-1 gap-2.5 overflow-x-auto pb-1"
          >
            {safeImages.map((image, index) => (
              <button
                key={`${image.alt}-${index}`}
                ref={(node) => {
                  if (node) tabRefs.current.set(index, node);
                  else tabRefs.current.delete(index);
                }}
                type="button"
                role="tab"
                id={`tour-gallery-tab-${index}`}
                aria-selected={index === activeIndex}
                aria-controls="tour-gallery-panel"
                tabIndex={index === activeIndex ? 0 : -1}
                data-focus-ring=""
                onClick={() => setActiveIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    focusTab(activeIndex + 1);
                  }
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    focusTab(activeIndex - 1);
                  }
                  if (event.key === "Home") {
                    event.preventDefault();
                    focusTab(0);
                  }
                  if (event.key === "End") {
                    event.preventDefault();
                    focusTab(safeImages.length - 1);
                  }
                }}
                className={cn(
                  "relative shrink-0 overflow-hidden rounded-xl border-2 transition-[border-color,opacity,transform] duration-200",
                  index === activeIndex
                    ? "border-primary-strong opacity-100"
                    : "border-transparent opacity-65 hover:opacity-100 focus-visible:opacity-100",
                )}
              >
                <AssetImage
                  image={image}
                  altFallback={fmt(labels.alt, { title, index: index + 1 })}
                  sizes="120px"
                  variant="plain"
                  className="h-16 w-24 sm:h-20 sm:w-32"
                />
                <span className="sr-only">{fmt(labels.imageSr, { index: index + 1 })}</span>
              </button>
            ))}
          </div>

          <RailArrow
            label={labels.next}
            direction="next"
            disabled={activeIndex === safeImages.length - 1}
            onClick={() => step(1)}
          />
        </div>
      ) : null}
    </div>
  );
}

function RailArrow({
  label,
  direction,
  disabled,
  onClick,
}: {
  label: string;
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-[color,background-color,border-color,opacity,transform] duration-200",
        "hover:border-primary-strong hover:text-primary-strong active:scale-95",
        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
