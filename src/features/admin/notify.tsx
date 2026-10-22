"use client";

import { useEffect } from "react";

export type ToastKind = "success" | "info" | "error";
export type ToastItem = { id: number; kind: ToastKind; text: string };

const ICON: Record<ToastKind, string> = {
  success: "✓",
  info: "i",
  error: "!",
};

/**
 * Bottom-right toast stack. Success/info auto-dismiss; errors stay until
 * the user closes them so nothing important is missed.
 */
export function ToastStack({
  items,
  onClose,
}: {
  items: readonly ToastItem[];
  onClose: (id: number) => void;
}) {
  return (
    <div className="adm-toasts" aria-live="polite" aria-atomic="false">
      {items.map((toast) => (
        <ToastRow
          key={toast.id}
          toast={toast}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastRow({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  useEffect(() => {
    if (toast.kind === "error") return;
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [toast.kind, onClose]);
  return (
    <div
      className={`adm-toast adm-toast--${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
    >
      <span className="adm-toast-icon" aria-hidden="true">
        {ICON[toast.kind]}
      </span>
      <p>{toast.text}</p>
      <button type="button" aria-label="Đóng thông báo" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

export type ConfirmRequest = {
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
} | null;

/**
 * Replacement for native confirm(). Focus lands on Cancel by default so a
 * destructive action is never one stray Enter away. Escape closes as cancel.
 */
export function ConfirmModal({
  request,
  busy,
  onCancel,
  onConfirm,
}: {
  request: ConfirmRequest;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!request) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [request, onCancel]);
  if (!request) return null;
  return (
    <div
      className="adm-modal-veil"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="adm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="adm-confirm-title"
        aria-describedby="adm-confirm-body"
      >
        <h2 id="adm-confirm-title">{request.title}</h2>
        <p id="adm-confirm-body">{request.body}</p>
        <div className="adm-modal-actions">
          <button type="button" autoFocus disabled={busy} onClick={onCancel}>
            Hủy bỏ
          </button>
          <button
            type="button"
            className={request.danger === false ? "adm-primary" : "adm-danger"}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Đang xử lý…" : (request.confirmLabel ?? "Đồng ý")}
          </button>
        </div>
      </div>
    </div>
  );
}
