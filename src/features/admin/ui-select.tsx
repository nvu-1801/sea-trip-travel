"use client";

import { useId, useMemo, useState } from "react";

export type SelectOption = { value: string; label: string };



/** Single searchable dropdown — thay thế <select> native trong admin. */
export function AdmSelect({
  label,
  value,
  options,
  placeholder = "Chọn một mục…",
  preview,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  preview?: (value: string) => string | null;
  onChange: (next: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value);
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
    <div className="adm-select">
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
          <input
            autoFocus
            placeholder="Tìm kiếm…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={`Tìm trong ${label}`}
          />
          <div className="adm-select-list">
            <button type="button" role="option" aria-selected={!value} onClick={() => { onChange(""); setOpen(false); }}>
              {placeholder}
            </button>
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                data-active={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                <span>{o.label}</span>
                <small>{o.value}</small>
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

/** Multi-select dạng chip — dùng cho categoryIds/destinationIds/relatedTourSlugs/tags. */
export function AdmMultiSelect({
  label,
  values,
  options,
  placeholder = "Thêm mục…",
  onChange,
}: {
  label: string;
  values: string[];
  options: SelectOption[];
  placeholder?: string;
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
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
    <div className="adm-multiselect">
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
                <span>{o.label}</span><small>{o.value}</small>
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
