"use client";

import { useId, useRef, useState, type CSSProperties } from "react";
import { AdmSelect } from "./ui-select";

export type UploadedImage = { src: string; alt: string };

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_SIZE = 10 * 1024 * 1024;

/**
 * Shared image field for every admin modal: a dropzone (drag & drop from the
 * computer, or click to browse) with live preview, explicit replace/remove
 * actions, the media library picker, optional alt text and a note about where
 * the image is used. Uploads go through the existing media API (auto WebP,
 * max 1920px) and the returned src is handed back via onChange.
 */
export function ImageField({
  label,
  value,
  previewAlt,
  previewStyle,
  media,
  onUpload,
  onChange,
  compact = false,
  onRemove,
  whereUsed,
  alt,
  onAltChange,
  altRequired = false,
  altHint,
  libraryLabel = "Ảnh từ thư viện",
}: {
  label: string;
  value: string;
  previewAlt?: string;
  previewStyle?: CSSProperties;
  media: { value: string; label: string }[];
  onUpload?: (file: File) => Promise<UploadedImage>;
  onChange: (src: string, alt?: string) => void;
  /** Shorter preview for gallery rows. */
  compact?: boolean;
  /** Explicit remove action. Falls back to clearing the src. */
  onRemove?: () => void;
  /** "Dùng ở …" line shown below the preview. */
  whereUsed?: string;
  /** Controlled alt text. Omit to hide the alt input. */
  alt?: string;
  onAltChange?: (alt: string) => void;
  altRequired?: boolean;
  altHint?: string;
  libraryLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const altId = useId();
  const altHelpId = useId();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const dragCount = useRef(0);

  async function handleFile(file: File | undefined) {
    if (!file || !onUpload) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Chỉ nhận file JPEG, PNG hoặc WebP.");
      setStatus("");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Ảnh vượt quá 10 MB.");
      setStatus("");
      return;
    }
    setError("");
    setStatus("");
    setUploading(true);
    try {
      const uploaded = await onUpload(file);
      onChange(uploaded.src, uploaded.alt);
      setStatus("Đã tải ảnh lên và dùng ngay trong form.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  }

  function remove() {
    setError("");
    setStatus("");
    if (onRemove) onRemove();
    else onChange("");
  }

  const describedBy = [altHint ? altHelpId : "", error ? `${altId}-error` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="adm-image-field" data-compact={compact || undefined}>
      <span className="adm-select-label">{label}</span>
      <div
        className={`adm-dropzone${compact ? " adm-dropzone--compact" : ""}`}
        data-dragging={dragging || undefined}
        data-uploading={uploading || undefined}
        role={onUpload ? "button" : undefined}
        tabIndex={onUpload ? 0 : undefined}
        aria-label={
          onUpload
            ? `Kéo thả, bấm chọn hoặc thay ${label.toLowerCase()}`
            : `${label} đang dùng`
        }
        onClick={() => {
          if (onUpload && !uploading) inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (onUpload && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          if (!onUpload) return;
          event.preventDefault();
          dragCount.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!onUpload) return;
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          if (!onUpload) return;
          event.preventDefault();
          dragCount.current -= 1;
          if (dragCount.current <= 0) {
            dragCount.current = 0;
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          if (!onUpload || uploading) return;
          event.preventDefault();
          dragCount.current = 0;
          setDragging(false);
          void handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={previewAlt || ""}
            aria-hidden={previewAlt ? undefined : "true"}
            style={previewStyle}
          />
        ) : (
          <span className="adm-dropzone-empty" aria-hidden="true">
            <span>🖼</span>
            <span>Chưa có ảnh</span>
          </span>
        )}
        <span className="adm-dropzone-hint" aria-hidden="true">
          {uploading
            ? "Đang tải ảnh…"
            : dragging
              ? "Thả file để tải lên"
              : onUpload
                ? value
                  ? "Bấm để thay ảnh · kéo thả file mới vào đây"
                  : "Kéo thả file vào đây hoặc bấm để chọn từ máy"
                : previewAlt || ""}
        </span>
        {uploading && <span className="adm-dropzone-spin" aria-hidden="true" />}
      </div>
      {onUpload && (
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          aria-label={`Chọn file ${label} từ máy tính`}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      )}

      <div className="adm-image-actions">
        {onUpload && (
          <button
            type="button"
            className="adm-image-action"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {value ? "Thay ảnh từ máy" : "Tải ảnh lên"}
          </button>
        )}
        {value && (
          <button
            type="button"
            className="adm-image-action adm-danger"
            disabled={uploading}
            onClick={remove}
          >
            Gỡ ảnh
          </button>
        )}
        <span className="adm-image-format">JPEG, PNG, WebP · tối đa 10 MB</span>
      </div>

      {whereUsed ? (
        <p className="adm-image-where">
          <span aria-hidden="true">◎</span> {whereUsed}
        </p>
      ) : null}

      {error && (
        <p className="adm-field-error" role="alert">
          {error}
        </p>
      )}
      {status && !error ? (
        <p className="adm-field-success" role="status">
          {status}
        </p>
      ) : null}

      {onAltChange ? (
        <div className="adm-image-alt">
          <label htmlFor={altId}>
            Mô tả ảnh (alt){" "}
            {altRequired ? (
              <span className="adm-required" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
          <input
            id={altId}
            value={alt ?? ""}
            maxLength={300}
            required={altRequired}
            aria-required={altRequired || undefined}
            aria-describedby={describedBy || undefined}
            aria-invalid={error ? true : undefined}
            placeholder="Ví dụ: Vịnh biển xanh Quy Nhơn nhìn từ trên cao"
            onChange={(event) => onAltChange(event.target.value)}
          />
          <small className="adm-hint" id={altHelpId}>
            {altHint ??
              "Dùng khi ảnh lỗi và cho trình đọc màn hình. Nên mô tả đúng cảnh trong ảnh."}
          </small>
          <small className="adm-hint adm-counter">
            {(alt ?? "").length}/300 ký tự
          </small>
        </div>
      ) : null}

      <AdmSelect
        label={libraryLabel}
        value={value}
        showValues={false}
        options={
          value && !media.some((o) => o.value === value)
            ? [...media, { value, label: `${value} (đang dùng)` }]
            : media
        }
        preview={(v) => (v.startsWith("/") ? v : null)}
        onChange={(next) => {
          setError("");
          setStatus("");
          onChange(
            next,
            next ? media.find((o) => o.value === next)?.label : undefined,
          );
        }}
      />
    </div>
  );
}
