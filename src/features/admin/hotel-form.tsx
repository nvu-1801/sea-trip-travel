"use client";

import type { ReactNode } from "react";
import type { ImageAsset } from "@/domain/common";
import { ImageField } from "./image-picker";
import { AdminIcon } from "./admin-icons";

/** Small form primitives shared by the hotel editor and its room rows. */

export function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function numberOf(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function textLines(value: unknown): string {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").join("\n")
    : "";
}

export function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function chips(value: unknown): string {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").join(", ")
    : "";
}

export function toChips(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function imagesOf(value: unknown): ImageAsset[] {
  return Array.isArray(value)
    ? (value.filter(
        (item): item is ImageAsset =>
          Boolean(item) && typeof item === "object" && "alt" in item,
      ) as ImageAsset[])
    : [];
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className={`adm-field${error ? " adm-field--invalid" : ""}`}>
      <span className="adm-field-label">{label}</span>
      {children}
      {hint ? <small className="adm-hint">{hint}</small> : null}
      {error ? (
        <span className="adm-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function LinesField({
  label,
  hint,
  value,
  rows = 4,
  placeholder,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string[];
  rows?: number;
  placeholder?: string;
  onChange: (value: string[]) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        rows={rows}
        value={textLines(value)}
        placeholder={placeholder}
        onChange={(event) => onChange(toLines(event.target.value))}
      />
    </Field>
  );
}

export function ChipsField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        value={chips(value)}
        onChange={(event) => onChange(toChips(event.target.value))}
      />
    </Field>
  );
}

export function GalleryField({
  label,
  hint,
  value,
  media,
  upload,
  onChange,
}: {
  label: string;
  hint?: string;
  value: ImageAsset[];
  media: { value: string; label: string }[];
  upload: (file: File) => Promise<{ src: string; alt: string }>;
  onChange: (value: ImageAsset[]) => void;
}) {
  const update = (index: number, patch: Partial<ImageAsset>) => {
    const next = value.map((image, itemIndex) =>
      itemIndex === index ? { ...image, ...patch } : image,
    );
    onChange(next);
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <div className="stt-hotel-gallery">
      <div>
        <span className="adm-field-label">{label}</span>
        {hint ? <p className="adm-hint">{hint}</p> : null}
      </div>
      {value.map((image, index) => (
        <div className="stt-hotel-gallery-row" key={`${image.src ?? "new"}-${index}`}>
          <ImageField
            label={`Ảnh ${index + 1}${index === 0 ? " (ảnh bìa)" : ""}`}
            value={text(image.src)}
            alt={text(image.alt)}
            media={media}
            onUpload={upload}
            compact
            altRequired
            onAltChange={(alt) => update(index, { alt })}
            onChange={(src, alt) =>
              update(index, { src, ...(alt ? { alt } : {}) })
            }
            onRemove={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
          />
          <div className="stt-hotel-actions">
            <button
              type="button"
              className="adm-ghost-link"
              aria-label={`Đưa ảnh ${index + 1} lên`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="adm-ghost-link"
              aria-label={`Đưa ảnh ${index + 1} xuống`}
              disabled={index === value.length - 1}
              onClick={() => move(index, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className="adm-danger"
              onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
            >
              <AdminIcon name="trash" size={14} /> Xoá
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="adm-add-row"
        onClick={() => onChange([...value, { src: "", alt: "" }])}
      >
        <AdminIcon name="plus" size={14} /> Thêm ảnh
      </button>
    </div>
  );
}
