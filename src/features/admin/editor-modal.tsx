"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function EditorModal({
  title,
  onClose,
  busy,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  const blocked = useRef(busy);
  useEffect(() => {
    close.current = onClose;
    blocked.current = busy;
  }, [onClose, busy]);
  useEffect(() => {
    const dialog = ref.current!,
      trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    const cancel = (event: Event) => {
      event.preventDefault();
      if (!blocked.current) close.current();
    };
    dialog.addEventListener("cancel", cancel);
    return () => {
      dialog.removeEventListener("cancel", cancel);
      dialog.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="adm-editor-dialog"
      aria-labelledby="studio-dialog-title"
    >
      <header>
        <div>
          <p className="adm-eyebrow">Chỉnh sửa nội dung</p>
          <h2 id="studio-dialog-title">{title}</h2>
        </div>
        <button
          type="button"
          aria-label="Đóng chỉnh sửa"
          disabled={busy}
          onClick={onClose}
        >
          ✕
        </button>
      </header>
      <div className="adm-dialog-content">{children}</div>
      <footer>{footer}</footer>
    </dialog>
  );
}
