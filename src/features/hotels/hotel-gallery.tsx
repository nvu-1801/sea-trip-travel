"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ImageAsset } from "@/domain/common";

/**
 * Photo strip + lightbox for a hotel.
 *
 * The first photo already lives in the hero, so the strip starts at the second
 * one and the lightbox still opens on the full set. Opening is an explicit user
 * action, focus moves inside a native `<dialog>`, arrow keys and Escape work,
 * and focus returns to the trigger on close. No autoplay and no motion beyond a
 * fade, so reduced-motion users lose nothing.
 */
export function HotelGallery({
  images,
  hotelName,
  labels,
}: {
  images: ImageAsset[];
  hotelName: string;
  labels: { open: string; close: string; counter: string; all: string };
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
  const strip = images.slice(1, 4);

  return (
    <div className="stt-hotel-gallery">
      <div className="stt-hotel-gallery-strip">
        {strip.map((image, thumbIndex) => (
          <button
            key={`${image.src}-${thumbIndex}`}
            type="button"
            className="stt-hotel-gallery-cell"
            data-hotel-depth={((thumbIndex % 3) + 1) as 1 | 2 | 3}
            onClick={() => {
              triggerRef.current = null;
              setIndex(thumbIndex + 1);
              setOpen(true);
            }}
            aria-label={`${hotelName} — ${labels.counter
              .replace("{index}", String(thumbIndex + 2))
              .replace("{total}", String(images.length))}`}
          >
            <Image
              src={image.src ?? "/opengraph-image.png"}
              alt=""
              width={640}
              height={420}
              sizes="(max-width: 768px) 50vw, 320px"
            />
          </button>
        ))}

        {strip.length > 0 ? (
          <button
            ref={triggerRef}
            type="button"
            className="stt-hotel-gallery-open"
            onClick={() => {
              setIndex(0);
              setOpen(true);
            }}
          >
            {images.length > 1 ? labels.all : labels.open}
          </button>
        ) : null}
      </div>

      {strip.length === 0 ? (
        <button
          ref={triggerRef}
          type="button"
          className="stt-hotel-gallery-open stt-hotel-gallery-open--solo"
          onClick={() => {
            setIndex(0);
            setOpen(true);
          }}
        >
          {labels.open}
        </button>
      ) : null}

      <dialog
        ref={dialogRef}
        className="stt-hotel-lightbox"
        aria-label={hotelName}
        onClick={(event) => {
          // Click on the shell - not on the photo, a button or the caption.
          if ((event.target as HTMLElement).dataset.close === "true")
            setOpen(false);
        }}
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        onCancel={() => setOpen(false)}
      >
        <div className="stt-hotel-lightbox-inner" data-close="true">
          <div className="stt-hotel-lightbox-bar">
            <button
              type="button"
              className="stt-hotel-lightbox-close"
              onClick={() => setOpen(false)}
            >
              {labels.close}
            </button>
          </div>
          <div className="stt-hotel-lightbox-row">
            <button
              type="button"
              className="stt-hotel-lightbox-nav"
              aria-label="‹"
              onClick={() =>
                setIndex(
                  (current) => (current - 1 + images.length) % images.length,
                )
              }
            >
              ‹
            </button>
            <figure className="stt-hotel-lightbox-stage">
              <Image
                src={current.src ?? "/opengraph-image.png"}
                alt={current.alt}
                width={1400}
                height={900}
              />
            </figure>
            <button
              type="button"
              className="stt-hotel-lightbox-nav"
              aria-label="›"
              onClick={() =>
                setIndex((current) => (current + 1) % images.length)
              }
            >
              ›
            </button>
          </div>
          {current.caption ? (
            <p className="stt-hotel-lightbox-caption">{current.caption}</p>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
