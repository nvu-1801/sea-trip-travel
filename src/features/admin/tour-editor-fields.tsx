"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImageField, type UploadedImage } from "./image-picker";
import type { TourIssue } from "@/domain/tour-rules";
import { describeTourIssue } from "@/domain/tour-rules";

/** Small, defensive accessors for the untyped CMS record. */
export type AdminRecord = Record<string, unknown>;

export function rec(value: unknown): AdminRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AdminRecord)
    : {};
}

export function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function recordsOf(value: unknown): AdminRecord[] {
  return listOf(value).map(rec);
}

export function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function numberOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function stringsOf(value: unknown): string[] {
  return listOf(value).filter((item): item is string => typeof item === "string");
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const fieldId = (path: string) => `tour-field-${path}`;

/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */

export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`adm-field${error ? " adm-field--invalid" : ""}`}>
      {id ? (
        <label htmlFor={id}>
          {label}
          {required ? (
            <span className="adm-required" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </label>
      ) : (
        <span className="adm-field-label">
          {label}
          {required ? (
            <span className="adm-required" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </span>
      )}
      {children}
      {error ? (
        <p className="adm-field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <small className="adm-hint">{hint}</small>
      ) : null}
    </div>
  );
}

export function TextField({
  path,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  required = false,
  multiline = false,
  maxLength,
  placeholder,
  type = "text",
  disabled = false,
  rows = 3,
}: {
  path: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  rows?: number;
}) {
  const id = fieldId(path);
  const describedBy = error ? `${id}-error` : undefined;
  const common = {
    id,
    value,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "data-tour-error": error ? "true" : undefined,
    disabled,
    onBlur,
    placeholder,
  };
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      {multiline ? (
        <textarea
          {...common}
          rows={rows}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          {...common}
          type={type}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {maxLength ? (
        <small className="adm-hint adm-counter">
          {value.length}/{maxLength} ký tự
        </small>
      ) : null}
    </Field>
  );
}

export function NumberField({
  path,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  min,
  max,
  disabled = false,
  suffix,
}: {
  path: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  suffix?: string;
}) {
  const id = fieldId(path);
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div className="adm-number-wrap">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          data-tour-error={error ? "true" : undefined}
          onBlur={onBlur}
          onChange={(event) =>
            onChange(event.target.value === "" ? 0 : Number(event.target.value))
          }
        />
        {suffix ? <span className="adm-number-suffix">{suffix}</span> : null}
      </div>
    </Field>
  );
}

const VND = new Intl.NumberFormat("vi-VN");

/**
 * Price input in VND.
 *
 * A plain `type=number` field made "012222" look like a quantity and hid the
 * thousands separators. This control accepts digits, strips leading zeroes and
 * formats the value as Vietnamese money while typing; the parent still stores
 * an integer.
 */
export function PriceField({
  path,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  disabled = false,
  max = 1_000_000_000,
}: {
  path: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  max?: number;
}) {
  const id = fieldId(path);
  const focused = useRef(false);
  const [text, setText] = useState(value > 0 ? VND.format(value) : "");

  useEffect(() => {
    if (!focused.current) setText(value > 0 ? VND.format(value) : "");
  }, [value]);

  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div className="adm-number-wrap">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          placeholder="Ví dụ: 2.290.000"
          disabled={disabled}
          maxLength={15}
          aria-invalid={error ? true : undefined}
          data-tour-error={error ? "true" : undefined}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            setText(value > 0 ? VND.format(value) : "");
            onBlur?.();
          }}
          onChange={(event) => {
            const digits = event.target.value
              .replace(/\D/g, "")
              .replace(/^0+(?=\d)/, "");
            const amount = digits ? Math.min(Number(digits), max) : 0;
            setText(amount > 0 ? VND.format(amount) : "");
            onChange(amount);
          }}
        />
        <span className="adm-number-suffix">₫</span>
      </div>
    </Field>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="adm-toggle" data-disabled={disabled || undefined}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        {label}
        {hint ? <small className="adm-hint">{hint}</small> : null}
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* String lists                                                               */
/* -------------------------------------------------------------------------- */

export function StringListEditor({
  idPrefix,
  label,
  hint,
  values,
  onChange,
  error,
  errorFor,
  onBlurPath,
  multiline = true,
  placeholder,
  addLabel,
  itemLabel = "mục",
  emptyText,
}: {
  idPrefix: string;
  label: string;
  hint?: string;
  values: readonly string[];
  onChange: (next: string[]) => void;
  error?: string;
  errorFor?: (index: number) => string | undefined;
  onBlurPath?: (path: string) => void;
  multiline?: boolean;
  placeholder?: string;
  addLabel?: string;
  itemLabel?: string;
  emptyText?: string;
}) {
  return (
    <div className={`adm-tour-list${error ? " adm-field--invalid" : ""}`}>
      <div className="adm-tour-list-head">
        <strong>{label}</strong>
        <span>{values.length}</span>
      </div>
      {hint ? <p className="adm-hint">{hint}</p> : null}
      {values.length === 0 ? (
        <p className="adm-empty-note">{emptyText ?? "Chưa có mục nào."}</p>
      ) : null}
      {values.map((item, index) => {
        const path = `${idPrefix}.${index}`;
        const id = fieldId(path);
        const itemError = errorFor?.(index);
        return (
          <div className="adm-list-row" key={`${idPrefix}-${index}`}>
            <div className="adm-list-main">
              {multiline ? (
                <textarea
                  id={id}
                  rows={2}
                  value={item}
                  placeholder={placeholder}
                  aria-invalid={itemError ? true : undefined}
                  data-tour-error={itemError ? "true" : undefined}
                  onBlur={() => onBlurPath?.(path)}
                  onChange={(event) =>
                    onChange(
                      values.map((current, i) =>
                        i === index ? event.target.value : current,
                      ),
                    )
                  }
                />
              ) : (
                <input
                  id={id}
                  value={item}
                  placeholder={placeholder}
                  aria-invalid={itemError ? true : undefined}
                  data-tour-error={itemError ? "true" : undefined}
                  onBlur={() => onBlurPath?.(path)}
                  onChange={(event) =>
                    onChange(
                      values.map((current, i) =>
                        i === index ? event.target.value : current,
                      ),
                    )
                  }
                />
              )}
              {itemError ? (
                <p className="adm-field-error" role="alert">
                  {itemError}
                </p>
              ) : null}
            </div>
            <div className="adm-list-actions">
              <button
                type="button"
                aria-label={`Đưa ${itemLabel} ${index + 1} lên`}
                title="Đưa lên"
                disabled={index === 0}
                onClick={() => onChange(moveItem(values, index, index - 1))}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Đưa ${itemLabel} ${index + 1} xuống`}
                title="Đưa xuống"
                disabled={index === values.length - 1}
                onClick={() => onChange(moveItem(values, index, index + 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className="adm-danger"
                aria-label={`Xóa ${itemLabel} ${index + 1}`}
                title="Xóa"
                onClick={() =>
                  onChange(values.filter((_, i) => i !== index))
                }
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="adm-add-row"
        onClick={() => onChange([...values, ""])}
      >
        ＋ {addLabel ?? `Thêm ${itemLabel}`}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Error summary                                                              */
/* -------------------------------------------------------------------------- */

export function ErrorSummary({
  issues,
  onJump,
}: {
  issues: readonly TourIssue[];
  onJump: (issue: TourIssue) => void;
}) {
  if (issues.length === 0) return null;
  const shown = issues.slice(0, 8);
  return (
    <div className="adm-error-summary" role="alert">
      <strong>{issues.length} mục cần sửa trước khi lưu</strong>
      <ul>
        {shown.map((issue, index) => (
          <li key={`${issue.path.join(".")}-${index}`}>
            <button type="button" onClick={() => onJump(issue)}>
              {describeTourIssue(issue)}: {issue.message}
            </button>
          </li>
        ))}
      </ul>
      {issues.length > shown.length ? (
        <p className="adm-hint">
          … và {issues.length - shown.length} mục khác. Sửa các mục trên rồi
          kiểm tra lại.
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Images                                                                     */
/* -------------------------------------------------------------------------- */

export function ImageListEditor({
  images,
  media,
  errorFor,
  onChange,
  onUploadImage,
  onBlurPath,
}: {
  images: readonly AdminRecord[];
  media: readonly { value: string; label: string }[];
  errorFor: (path: string) => string | undefined;
  onChange: (next: AdminRecord[]) => void;
  onUploadImage?: (file: File) => Promise<UploadedImage>;
  onBlurPath: (path: string) => void;
}) {
  const updateAt = (index: number, patch: AdminRecord) =>
    onChange(
      images.map((image, i) => (i === index ? { ...image, ...patch } : image)),
    );

  return (
    <div className="adm-tour-list">
      <div className="adm-tour-list-head">
        <strong>Thư viện ảnh</strong>
        <span>{images.length}</span>
      </div>
      <p className="adm-hint">
        Ảnh đầu tiên là ảnh bìa trên thẻ tour, gallery và ảnh chia sẻ mặc định.
        Dùng ↑ / ↓ để đổi ảnh bìa.
      </p>
      {images.length === 0 ? (
        <p className="adm-empty-note">
          Chưa có ảnh. Thêm ảnh từ thư viện hoặc tải lên để tour có ảnh bìa.
        </p>
      ) : null}
      {images.map((image, index) => {
        const altPath = `images.${index}.alt`;
        const captionPath = `images.${index}.caption`;
        const altError = errorFor(altPath);
        return (
          <div className="adm-tour-image-row" key={`image-${index}`}>
            <div className="adm-tour-image-head">
              <strong>
                Ảnh {index + 1}
                {index === 0 ? " · Ảnh bìa" : ""}
              </strong>
              <div className="adm-list-actions">
                <button
                  type="button"
                  aria-label={`Đưa ảnh ${index + 1} lên`}
                  disabled={index === 0}
                  onClick={() => onChange(moveItem(images, index, index - 1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Đưa ảnh ${index + 1} xuống`}
                  disabled={index === images.length - 1}
                  onClick={() => onChange(moveItem(images, index, index + 1))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="adm-danger"
                  aria-label={`Xóa ảnh ${index + 1}`}
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              </div>
            </div>
            <ImageField
              label={`Ảnh ${index + 1}`}
              value={textOf(image.src)}
              previewAlt={textOf(image.alt)}
              media={[...media]}
              onUpload={onUploadImage}
              compact
              whereUsed={
                index === 0
                  ? "Ảnh bìa thẻ tour, gallery trang chi tiết và ảnh chia sẻ mặc định."
                  : "Ảnh trong gallery trang chi tiết tour."
              }
              onRemove={() =>
                onChange(images.filter((_, i) => i !== index))
              }
              onChange={(src, alt) =>
                updateAt(index, {
                  src: src || undefined,
                  alt: alt || textOf(image.alt),
                })
              }
            />
            <TextField
              path={altPath}
              label="Mô tả ảnh (bắt buộc)"
              value={textOf(image.alt)}
              error={altError}
              onBlur={() => onBlurPath(altPath)}
              onChange={(value) => updateAt(index, { alt: value })}
            />
            <TextField
              path={captionPath}
              label="Chú thích ảnh (tuỳ chọn)"
              value={textOf(image.caption)}
              onBlur={() => onBlurPath(captionPath)}
              onChange={(value) => updateAt(index, { caption: value })}
            />
          </div>
        );
      })}
      <button
        type="button"
        className="adm-add-row"
        onClick={() => onChange([...images, { alt: "", caption: "" }])}
      >
        ＋ Thêm ảnh
      </button>
    </div>
  );
}
