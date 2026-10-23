"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Follow the actual toolbar height, including wrapping on small screens. */
export function StickyEditorActions({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const actions = ref.current;
    const main = actions?.closest<HTMLElement>(".adm-main");
    const toolbar = main?.querySelector<HTMLElement>(".adm-topbar");
    if (!actions || !main || !toolbar) return;
    const update = () => {
      const top = toolbar.getBoundingClientRect().height + 8;
      actions.style.top = `${top}px`;
      main.style.setProperty(
        "--adm-edit-offset",
        `${top + actions.getBoundingClientRect().height + 12}px`,
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(toolbar);
    observer.observe(actions);
    update();
    return () => {
      observer.disconnect();
      main.style.removeProperty("--adm-edit-offset");
    };
  }, []);
  return (
    <div
      ref={ref}
      className="adm-savebar adm-edit-actions"
      role="group"
      aria-label="Thao tác chỉnh sửa"
    >
      {children}
    </div>
  );
}
