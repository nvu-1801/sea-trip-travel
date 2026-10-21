"use client";
import Image from "next/image";
import { createContext, useContext, useId, useRef, useState } from "react";
import { AdmSelect } from "./ui-select";
export const MediaUploadContext = createContext<{
  csrf: string;
  onUploaded: (item: { src: string; alt: string }) => void;
  onBusy: (busy: boolean) => void;
} | null>(null);
export function MediaField({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (src: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  const context = useContext(MediaUploadContext);
  const input = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);
  const id = useId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dragging, setDragging] = useState(false);
  async function upload(file?: File) {
    if (!file || !context || uploadLock.current) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Chọn ảnh JPEG, PNG hoặc WebP.");
      return;
    }
    if (file.size > 10485760) {
      setError("Ảnh vượt quá 10 MB.");
      return;
    }
    uploadLock.current = true;
    setBusy(true);
    context.onBusy(true);
    try {
      const response = await fetch("/api/admin/media", {
        method: "POST",
        headers: {
          "content-type": file.type,
          "x-csrf-token": context.csrf,
          "x-image-alt": encodeURIComponent(file.name),
        },
        body: file,
      });
      const item = await response.json();
      if (!response.ok)
        throw new Error(item.error ?? "Không tải được ảnh. Thử lại.");
      context.onUploaded(item);
      onChange(item.src);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không tải được ảnh.");
    } finally {
      uploadLock.current = false;
      setBusy(false);
      context.onBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="adm-media-field" aria-busy={busy}>
      <label htmlFor={id}>{label}</label>
      <div
        className={`adm-dropzone ${dragging ? "is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length > 1)
            setError("Tải từng ảnh vào vị trí này; thêm ô ảnh để tạo bộ ảnh.");
          else void upload(event.dataTransfer.files[0]);
        }}
      >
        {value && /^\/(?!\/)/.test(value) && (
          <Image
            unoptimized
            src={value}
            alt="Ảnh đang chọn"
            width={360}
            height={180}
          />
        )}
        <button
          id={id}
          type="button"
          disabled={busy || !context}
          onClick={() => input.current?.click()}
        >
          {busy ? "Đang tải ảnh…" : "＋ Chọn ảnh từ máy hoặc kéo thả vào đây"}
        </button>
        <small>JPEG, PNG, WebP · Tối đa 10 MB · Ảnh được tối ưu tự động</small>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </div>
      <AdmSelect
        label="Hoặc chọn ảnh đã có"
        value={value}
        options={
          value && !options.some((item) => item.value === value)
            ? [{ value, label: "Ảnh đang sử dụng" }, ...options]
            : options
        }
        preview={(src) => (src.startsWith("/") ? src : null)}
        placeholder="Tìm ảnh trong thư viện…"
        onChange={onChange}
      />
      {value && (
        <button type="button" disabled={busy} onClick={() => onChange("")}>
          Gỡ ảnh khỏi nội dung
        </button>
      )}
      {error && (
        <p role="alert" className="adm-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
