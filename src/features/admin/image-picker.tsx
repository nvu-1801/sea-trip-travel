"use client";

import { useRef, useState, type CSSProperties } from "react";
import { AdmSelect } from "./ui-select";

export type UploadedImage = { src: string; alt: string };

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_SIZE = 10 * 1024 * 1024;

/**
 * Shared image field for every admin modal: a large dropzone (drag & drop
 * from the computer, or click to browse) with live preview, plus the media
 * library picker underneath. Uploads go through the media API (auto WebP,
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
}: {
  label: string;
  value: string;
  previewAlt?: string;
  previewStyle?: CSSProperties;
  media: { value: string; label: string }[];
  onUpload?: (file: File) => Promise<UploadedImage>;
  onChange: (src: string, alt?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const dragCount = useRef(0);

  async function handleFile(file: File | undefined) {
    if (!file || !onUpload) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Chỉ nhận file JPEG, PNG hoặc WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Ảnh vượt quá 10 MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const uploaded = await onUpload(file);
      onChange(uploaded.src, uploaded.alt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="adm-image-field">
      <span className="adm-select-label">{label}</span>
      <div
        className="adm-dropzone"
        data-dragging={dragging || undefined}
        data-uploading={uploading || undefined}
        role={onUpload ? "button" : undefined}
        tabIndex={onUpload ? 0 : undefined}
        aria-label={onUpload ? `Kéo thả hoặc bấm để tải ${label}` : undefined}
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
          <img src={value} alt="" aria-hidden="true" style={previewStyle} />
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
                ? "Kéo thả file vào đây hoặc bấm để chọn từ máy"
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
      {error && (
        <p className="adm-field-error" role="alert">
          {error}
        </p>
      )}
      <AdmSelect
        label="Ảnh từ thư viện"
        value={value}
        options={value && !media.some((o) => o.value === value) ? [...media, { value, label: `${value} (đang dùng)` }] : media}
        preview={(v) => (v.startsWith("/") ? v : null)}
        onChange={(next) =>
          onChange(
            next,
            next ? media.find((o) => o.value === next)?.label : undefined,
          )
        }
      />
    </div>
  );
}
