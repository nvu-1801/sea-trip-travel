"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMediaAction,
  restoreMediaAction,
  setMediaAltAction,
} from "@/server/admin/actions";
import { emptyActionState } from "@/server/admin/action-state";
import { Alert, inputClass } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/buttons";

/** Upload control. Talks to the multipart route handler, then refreshes the grid. */
export function MediaUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("file", file);
      if (alt.trim()) body.set("alt", alt.trim());

      const response = await fetch("/api/admin/media", { method: "POST", body });
      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setMessage({ tone: "error", text: payload.error ?? "Không tải được ảnh." });
        return;
      }
      setMessage({ tone: "success", text: `Đã tải lên: ${file.name}` });
      setAlt("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Mất kết nối khi tải ảnh. Vui lòng thử lại." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
      <h2 className="text-lg font-bold text-foreground">Tải ảnh lên</h2>
      <p className="mt-1 text-xs leading-relaxed text-foreground-subtle">
        Nhận JPG, PNG, WebP. Tối đa 10 MB mỗi ảnh. Hệ thống kiểm tra định dạng thật của tệp, tự tối ưu và tạo các
        kích thước: banner 1920×1080, bìa 1200×800, nội dung rộng 1600 px, thumbnail. Ảnh nhỏ hơn sẽ không bị phóng to.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">Mô tả ảnh (alt)</span>
          <input className={inputClass} value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Ví dụ: Bãi biển Kỳ Co" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">Chọn tệp</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={inputClass}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
      </div>

      {busy ? <p className="mt-4 text-sm text-foreground-muted">Đang xử lý ảnh…</p> : null}
      {message ? (
        <div className="mt-4">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      ) : null}
    </div>
  );
}

/** Alt-text form for one image. */
export function MediaAltForm({ id, alt }: { id: string; alt: string }) {
  const [value, setValue] = useState(alt);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await setMediaAltAction(formData);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        });
      }}
      className="mt-3 flex items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <input
        name="alt"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Mô tả ảnh"
        className="min-h-9 flex-1 rounded-lg border border-border-strong bg-surface px-2.5 text-xs"
      />
      <SubmitButton variant="secondary" className="min-h-9 px-3 text-xs" pendingLabel="…">
        {saved && !pending ? "Đã lưu" : "Lưu alt"}
      </SubmitButton>
    </form>
  );
}

/** Delete with the reference check surfaced as a real message, not a silent no-op. */
export function MediaDeleteForm({ id, url }: { id: string; url: string }) {
  const [state, action] = useActionState(deleteMediaAction, emptyActionState);
  return (
    <div className="mt-2">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <ConfirmSubmit message={`Chuyển ảnh ${url} vào thùng rác?`} className="min-h-9 px-3 text-xs">
          Xoá ảnh
        </ConfirmSubmit>
      </form>
      {state.ok === false ? (
        <p className="mt-2 text-xs leading-relaxed text-danger">{state.message}</p>
      ) : null}
      {state.ok === true ? <p className="mt-2 text-xs text-success">{state.message}</p> : null}
    </div>
  );
}

export function MediaRestoreForm({ id }: { id: string }) {
  return (
    <form action={restoreMediaAction} className="mt-2">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="secondary" className="min-h-9 px-3 text-xs">
        Khôi phục
      </SubmitButton>
    </form>
  );
}
