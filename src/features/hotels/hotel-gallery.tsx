"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ImageAsset } from "@/domain/common";

/**
 * Photo gallery for a hotel.
 *
 * Opens on an explicit user action, traps focus inside a native `<dialog>`,
 * supports arrow keys / Escape, and returns focus to the trigger. No autoplay
 * and no motion beyond a simple fade, so reduced-motion users lose nothing.
 */
export function HotelGallery({
  images,
  hotelName,
  labels,
}: {
  images: ImageAsset[];
  hotelName: string;
  labels: { open: string; close: string; counter: string };
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight")
        setIndex((current) => (current + 1) % images.length);
      if (event.key === "ArrowLeft")
        setIndex((current) => (current - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, open]);

  if (images.length === 0) return null;
  const current = images[Math.min(index, images.length - 1)];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="stt-hotel-gallery-open"
        onClick={() => setOpen(true)}
      >
        <span className="stt-hotel-gallery-main">
          <Image
            src={current.src ?? "/opengraph-image.png"}
            alt={current.alt}
            width={1200}
            height={750}
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
          />
        </span>
        <span className="stt-hotel-gallery-count">
          {labels.open} · {images.length}
        </span>
      </button>

      {images.length > 1 ? (
        <div className="stt-hotel-gallery-thumbs" aria-hidden="true">
          {images.slice(1, 5).map((image, thumbIndex) => (
            <span key={`${image.src}-${thumbIndex}`} className="stt-hotel-gallery-thumb">
              <Image
                src={image.src ?? "/opengraph-image.png"}
                alt=""
                width={320}
                height={200}
                sizes="200px"
              />
            </span>
          ))}
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        className="stt-hotel-lightbox"
        aria-label={`${hotelName} — ${labels.counter
          .replace("{index}", String(index + 1))
          .replace("{total}", String(images.length))}`}
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        onCancel={() => setOpen(false)}
      >
        <div className="stt-hotel-lightbox-inner">
          <div className="stt-hotel-lightbox-bar">
            <span>
              {labels.counter
                .replace("{index}", String(index + 1))
                .replace("{total}", String(images.length))}
            </span>
            <button
              type="button"
              className="stt-hotel-lightbox-close"
              onClick={() => setOpen(false)}
            >
              {labels.close}
            </button>
          </div>
          <div className="stt-hotel-lightbox-stage">
            <button
              type="button"
              className="stt-hotel-lightbox-nav"
              aria-label="‹"
              onClick={() =>
                setIndex((current) => (current - 1 + images.length) % images.length)
              }
            >
              ‹
            </button>
            <Image
              src={current.src ?? "/opengraph-image.png"}
              alt={current.alt}
              width={1400}
              height={900}
              style={{ maxWidth: "100%", height: "auto" }}
            />
            <button
              type="button"
              className="stt-hotel-lightbox-nav"
              aria-label="›"
              onClick={() => setIndex((current) => (current + 1) % images.length)}
            >
              ›
            </button>
          </div>
          {current.caption ? (
            <p className="stt-hotel-lightbox-caption">{current.caption}</p>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
