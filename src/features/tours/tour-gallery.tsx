"use client";

import { useRef, useState } from "react";
import type { ImageAsset } from "@/domain/common";
import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "@/components/ui/icons";

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

  const safeImages =
    images.length > 0
      ? images
      : [{ alt: fmt(labels.placeholderAlt, { title }) } as ImageAsset];
  const active = safeImages[Math.min(activeIndex, safeImages.length - 1)];

  const focusTab = (index: number) => {
    const clamped = (index + safeImages.length) % safeImages.length;
    setActiveIndex(clamped);
    tabRefs.current.get(clamped)?.focus();
  };

  return (
    <div className="mx-auto flex w-full max-w-[500px] flex-col gap-3">
      <div
        id="tour-gallery-panel"
        role="tabpanel"
        aria-labelledby={safeImages.length > 1 ? `tour-gallery-tab-${activeIndex}` : undefined}
        aria-label={fmt(labels.aria, { title })}
        className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
      >
        <AssetImage
          image={active}
          altFallback={title}
          priority
          fit="contain"
          sizes="(max-width: 532px) calc(100vw - 32px), 500px"
          className="aspect-square w-full"
          markPlaceholder
        />
        {active.caption ? (
          <p className="px-4 py-3 text-sm text-foreground-muted">{active.caption}</p>
        ) : null}
      </div>

      {safeImages.length > 1 ? (
        <div
          role="tablist"
          aria-label={labels.listAria}
          aria-orientation="horizontal"
          className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1"
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
                "relative shrink-0 overflow-hidden rounded-xl border-2 transition-[border-color,opacity] duration-200",
                index === activeIndex
                  ? "border-primary-strong opacity-100"
                  : "border-transparent opacity-70 hover:opacity-100",
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
          <span
            aria-hidden="true"
            className="ml-auto hidden items-center gap-1 self-center text-xs font-semibold text-foreground-subtle sm:flex"
          >
            {activeIndex + 1}/{safeImages.length}
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      ) : null}
    </div>
  );
}
