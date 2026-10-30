"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };



/** Single searchable dropdown — thay thế <select> native trong admin. */
export function AdmSelect({
  label,
  value,
  options,
  placeholder = "Chọn một mục…",
  preview,
  onChange,
  showValues = true,
  searchable = true,
  className,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  preview?: (value: string) => string | null;
  onChange: (next: string) => void;
  /** Hide raw ids/codes in the dropdown; the label is the user-facing name. */
  showValues?: boolean;
  /** Short lists (status, payment method) do not need a search field. */
  searchable?: boolean;
  className?: string;
}) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options.slice(0, 60);
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(needle) ||
        o.value.toLowerCase().includes(needle),
    ).slice(0, 60);
  }, [options, q]);
  const img = preview?.(value);

  return (
    <div
      className={`adm-select${className ? ` ${className}` : ""}`}
      ref={wrapRef}
    >
      <span className="adm-select-label" id={id}>{label}</span>
      <button
        type="button"
        className="adm-select-btn"
        aria-labelledby={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {img ? (
          <span className="adm-select-thumb" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" />
          </span>
        ) : null}
        <span className="adm-select-current">{current?.label || value || placeholder}</span>
        <span aria-hidden="true" className="adm-select-caret">▾</span>
      </button>
      {open && (
        <div className="adm-select-pop" role="listbox">
          {searchable ? (
            <input
              autoFocus
              placeholder="Tìm kiếm…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={`Tìm trong ${label}`}
            />
          ) : null}
          <div className="adm-select-list">
            <button type="button" role="option" aria-selected={!value} onClick={() => { onChange(""); setOpen(false); }}>
              {placeholder}
            </button>
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                data-value={o.value}
                aria-selected={o.value === value}
                data-active={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                <span>{o.label}</span>
                {showValues ? <small>{o.value}</small> : null}
              </button>
            ))}
            {!filtered.length && <span className="adm-select-empty">Không tìm thấy</span>}
          </div>
          <button type="button" className="adm-select-close" onClick={() => setOpen(false)}>Đóng</button>
        </div>
      )}
    </div>
  );
}

/** Pretty status filter — thay <select> native (xấu, highlight xanh) bằng dropdown custom. */export function AdmFilterSelect({
  value,
  options,
  label = "Trạng thái nội dung",
  onChange,
}: {
  value: string;
  options: { value: string; label: string; count?: number }[];
  label?: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current =
    options.find((o) => o.value === value) ?? options[0] ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <div className="adm-filter" ref={wrapRef}>
      <button
        type="button"
        className="adm-filter-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        data-open={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={`adm-filter-dot adm-filter-dot--${current?.value ?? "all"}`}
          aria-hidden="true"
        />
        <span className="adm-filter-current">{current?.label ?? "Tất cả"}</span>
        {typeof current?.count === "number" && (
          <span className="adm-filter-count">{current.count}</span>
        )}
        <svg
          className="adm-filter-caret"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="adm-filter-pop" role="listbox" aria-label={label}>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                data-active={active}
                className="adm-filter-opt"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span
                  className={`adm-filter-dot adm-filter-dot--${o.value}`}
                  aria-hidden="true"
                />
                <span className="adm-filter-opt-label">{o.label}</span>
                {typeof o.count === "number" && (
                  <span className="adm-filter-pill">{o.count}</span>
                )}
                <span className="adm-filter-check" aria-hidden="true">
                  {active ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Multi-select dạng chip — dùng cho categoryIds/destinationIds/relatedTourSlugs/tags. */
export function AdmMultiSelect({
  label,
  values,
  options,
  placeholder = "Thêm mục…",
  onChange,
  showValues = true,
}: {
  label: string;
  values: string[];
  options: SelectOption[];
  placeholder?: string;
  onChange: (next: string[]) => void;
  /** Hide raw ids/slugs in the dropdown; the label is the user-facing name. */
  showValues?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return options
      .filter((o) => !values.includes(o.value))
      .filter(
        (o) =>
          !needle ||
          o.label.toLowerCase().includes(needle) ||
          o.value.toLowerCase().includes(needle),
      )
      .slice(0, 40);
  }, [options, values, q]);

  return (
    <div className="adm-multiselect" ref={wrapRef}>
      <span className="adm-select-label">{label} <span className="adm-count">{values.length}</span></span>
      <div className="adm-chips">
        {values.map((v) => {
          const opt = options.find((o) => o.value === v);
          return (
            <span key={v} className="adm-chip">
              {opt?.label ?? v}
              <button
                type="button"
                aria-label={`Gỡ ${opt?.label ?? v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
              >×</button>
            </span>
          );
        })}
        {values.length === 0 && <span className="adm-chips-empty">Chưa chọn mục nào</span>}
      </div>
      <div className="adm-multi-row">
        <input
          placeholder={placeholder}
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          aria-label={`Tìm để thêm vào ${label}`}
        />
      </div>
      {open && (
        <div className="adm-select-pop adm-select-pop-inline" role="listbox">
          <div className="adm-select-list">
            {filtered.map((o) => (
              <button key={o.value} type="button" onClick={() => { onChange([...values, o.value]); setQ(""); }}>
                <span>{o.label}</span>
                {showValues ? <small>{o.value}</small> : null}
              </button>
            ))}
            {!filtered.length && <span className="adm-select-empty">Hết mục để thêm hoặc không tìm thấy</span>}
          </div>
          <button type="button" className="adm-select-close" onClick={() => setOpen(false)}>Đóng</button>
        </div>
      )}
      {values.some((v) => !options.some((o) => o.value === v)) && (
        <p className="adm-warn">Có mã không tồn tại trong danh mục — kiểm tra lại trước khi xuất bản.</p>
      )}
    </div>
  );
}

/** Trạng thái chăm sóc khách — dropdown custom thay <select> native. */
export const LEAD_STATUSES = [
  { value: "new", label: "Mới", dot: "#2e90fa", hint: "Chưa liên hệ" },
  { value: "contacted", label: "Đã liên hệ", dot: "#e8a13d", hint: "Đang trao đổi" },
  { value: "qualified", label: "Tiềm năng", dot: "#9b5cf6", hint: "Có khả năng chốt" },
  { value: "won", label: "Đã chốt", dot: "#12a56b", hint: "Thành công" },
  { value: "lost", label: "Chưa phù hợp", dot: "#98a2b3", hint: "Dừng chăm sóc" },
] as const;

export function AdmLeadStatusSelect({
  value,
  onChange,
  label = "Trạng thái",
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current =
    LEAD_STATUSES.find((s) => s.value === value) ?? LEAD_STATUSES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="adm-lead-status" ref={wrapRef}>
      <span className="adm-lead-status-label" id={`lead-status-${value}`}>
        {label}
      </span>
      <button
        type="button"
        className="adm-lead-status-btn"
        data-tone={current.value}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-open={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="adm-lead-status-dot"
          style={{ background: current.dot }}
          aria-hidden="true"
        />
        <span className="adm-lead-status-current">{current.label}</span>
        <svg
          className="adm-filter-caret"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="adm-lead-status-pop" role="listbox" aria-label={label}>
          {LEAD_STATUSES.map((s) => {
            const active = s.value === value;
            return (
              <button
                key={s.value}
                type="button"
                role="option"
                aria-selected={active}
                data-active={active}
                data-tone={s.value}
                className="adm-lead-status-opt"
                onClick={() => {
                  onChange(s.value);
                  setOpen(false);
                }}
              >
                <span
                  className="adm-lead-status-dot"
                  style={{ background: s.dot }}
                  aria-hidden="true"
                />
                <span className="adm-lead-status-opt-text">
                  <span>{s.label}</span>
                  <small>{s.hint}</small>
                </span>
                <span className="adm-filter-check" aria-hidden="true">
                  {active ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
