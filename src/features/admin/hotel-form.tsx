"use client";

import { cloneElement, isValidElement, useId, useState, type ReactElement, type ReactNode } from "react";
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

export class HotelFormError extends Error {
  constructor(body: Record<string, unknown>, fallback: string) {
    const issues = Array.isArray(body.issues) ? body.issues as { path: string; message: string }[] : [];
    super(issues.length ? [...new Set(issues.map(({ message }) => message))].slice(0, 4).join(" · ") :
      typeof body.error === "string" ? body.error : fallback);
    this.issues = Object.fromEntries(issues.map(({ path, message }) => [path, message]));
  }

  readonly issues: Record<string, string>;
}

export function fieldIssue(issues: Record<string, string>, field: string) {
  return issues[field] ?? Object.entries(issues).find(([path]) => path.startsWith(`${field}.`))?.[1];
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
  const fieldId = useId();
  const labelId = `${fieldId}-label`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  return (
    <label className={`adm-field${error ? " adm-field--invalid" : ""}`}>
      <span className="adm-field-label" id={labelId}>{label}</span>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string; "aria-labelledby"?: string }>, {
          "aria-labelledby": labelId,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined,
        })
        : children}
      {hint ? <small className="adm-hint" id={hintId}>{hint}</small> : null}
      {error ? (
        <span className="adm-field-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function LinesField({
  label,
  hint,
  error,
  value,
  rows = 4,
  placeholder,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string[];
  rows?: number;
  error?: string;
  placeholder?: string;
  onChange: (value: string[]) => void;
}) {
  const [raw, setRaw] = useState(() => textLines(value));
  const displayed = textLines(toLines(raw)) === textLines(value) ? raw : textLines(value);
  return (
    <Field label={label} hint={hint} error={error}>
      <textarea
        rows={rows}
        value={displayed}
        placeholder={placeholder}
        onChange={(event) => {
          setRaw(event.target.value);
          onChange(toLines(event.target.value));
        }}
      />
    </Field>
  );
}

export function ChipsField({
  label,
  hint,
  error,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [raw, setRaw] = useState(() => chips(value));
  const displayed = chips(toChips(raw)) === chips(value) ? raw : chips(value);
  return (
    <Field label={label} hint={hint} error={error}>
      <input
        value={displayed}
        onChange={(event) => {
          setRaw(event.target.value);
          onChange(toChips(event.target.value));
        }}
      />
    </Field>
  );
}

export function GalleryField({
  label,
  hint,
  error,
  value,
  media,
  upload,
  maxImages,
  sizeGuide,
  busy = false,
  onChange,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: ImageAsset[];
  media: { value: string; label: string }[];
  upload: (file: File) => Promise<{ src: string; alt: string }>;
  maxImages?: number;
  sizeGuide?: string;
  busy?: boolean;
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
    <div className={`stt-hotel-gallery${error ? " adm-field--invalid" : ""}`}>
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
            sizeGuide={sizeGuide}
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
              disabled={busy || index === 0}
              onClick={() => move(index, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="adm-ghost-link"
              aria-label={`Đưa ảnh ${index + 1} xuống`}
              disabled={busy || index === value.length - 1}
              onClick={() => move(index, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className="adm-danger"
              disabled={busy}
              onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
            >
              <AdminIcon name="trash" size={14} /> Xoá
            </button>
          </div>
        </div>
      ))}
      {error && <p className="adm-field-error">{error}</p>}
      {maxImages === undefined ? (
        <button
          type="button"
          className="adm-add-row"
          onClick={() => onChange([...value, { src: "", alt: "" }])}
        >
          <AdminIcon name="plus" size={14} /> Thêm ảnh
        </button>
      ) : value.length < maxImages ? (
        <ImageField
          label="Thêm ảnh hạng phòng"
          value=""
          media={media}
          onUpload={upload}
          sizeGuide={sizeGuide}
          compact
          onChange={(src, alt) => {
            if (src) onChange([...value, { src, alt: alt ?? "" }]);
          }}
        />
      ) : (
        <p className="adm-hint">Đã đủ {maxImages} ảnh.</p>
      )}
    </div>
  );
}
