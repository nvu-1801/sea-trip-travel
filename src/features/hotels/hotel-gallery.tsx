"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ImageAsset } from "@/domain/common";

export function HotelGallery({
  images,
  hotelName,
  labels,
  room = false,
}: {
  images: ImageAsset[];
  hotelName: string;
  labels: { open: string; close: string; all: string; previous: string; next: string };
  room?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [preview, setPreview] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const photos = images.filter((image) => image.src);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
  }, [open]);

  if (!photos.length) return null;

  const count = photos.length;
  const current = photos[index] ?? photos[0];
  const offset = (position: number, direction: number) =>
    (position + direction + count) % count;

  function show(position: number, button: HTMLButtonElement) {
    trigger.current = button;
    setIndex(position);
    setOpen(true);
  }

  return (
    <div className={room ? "stt-photo-room" : "stt-photo-gallery"}>
      <div className="stt-photo-grid" data-count={room ? 1 : Math.min(count, 5)}>
        {(room ? [photos[preview] ?? photos[0]] : photos.slice(0, 5)).map((image, i) => (
          <button
            className="stt-photo-tile"
            key={i}
            type="button"
            aria-label={`${labels.open} · ${hotelName} · ${(room ? preview : i) + 1}/${count}`}
            onClick={(event) => show(room ? preview : i, event.currentTarget)}
          >
            <Image
              src={image.src!}
              alt={image.alt}
              fill
              sizes={room ? "(max-width: 640px) 100vw, 320px" : "(max-width: 640px) 100vw, 50vw"}
              preload={!room && i === 0}
            />
            {!room && i === 4 && count > 5 ? <span>+{count - 5}</span> : null}
          </button>
        ))}
      </div>
      {!room ? (
        <button className="stt-photo-all" type="button" onClick={(event) => show(0, event.currentTarget)}>
          {labels.all}
        </button>
      ) : count > 1 ? (
        <div className="stt-photo-controls">
          <button type="button" aria-label={labels.previous} onClick={() => setPreview(offset(preview, -1))}>‹</button>
          <span aria-live="polite">{preview + 1}/{count}</span>
          <button type="button" aria-label={labels.next} onClick={() => setPreview(offset(preview, 1))}>›</button>
        </div>
      ) : null}

      <dialog
        ref={dialog}
        className="stt-hotel-lightbox"
        aria-label={hotelName}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            setIndex(offset(index, event.key === "ArrowLeft" ? -1 : 1));
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        {open ? (
          <div className="stt-photo-viewer">
            <button className="stt-hotel-lightbox-close" type="button" onClick={() => dialog.current?.close()}>
              {labels.close}
            </button>
            <div className="stt-hotel-lightbox-row">
              <Image src={current.src!} alt={current.alt} width={1400} height={900} sizes="90vw" />
              {count > 1 ? (
                <>
                  <button className="stt-hotel-lightbox-nav" type="button" aria-label={labels.previous} onClick={() => setIndex(offset(index, -1))}>‹</button>
                  <button className="stt-hotel-lightbox-nav" type="button" aria-label={labels.next} onClick={() => setIndex(offset(index, 1))}>›</button>
                </>
              ) : null}
            </div>
            <p aria-live="polite">{current.caption || hotelName} · {index + 1}/{count}</p>
            {count > 1 ? (
              <div className="stt-photo-thumbs">
                {photos.map((image, i) => (
                  <button key={i} type="button" aria-label={`${hotelName} · ${i + 1}/${count}`} aria-current={i === index} onClick={() => setIndex(i)}>
                    <Image src={image.src!} alt="" width={80} height={54} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
