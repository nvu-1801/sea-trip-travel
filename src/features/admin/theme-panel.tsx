"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  THEMES,
  themeById,
  type ThemeId,
} from "@/config/themes";

type RecordRow = {
  data: Record<string, unknown>;
  revision: number;
  state: string;
};

/**
 * Studio → Giao diện.
 *
 * The theme list and the preview both read `src/config/themes.ts`; the preview
 * island receives the exact same custom properties that the public `<html>`
 * gets, so what the owner sees here is what ships. Selecting a card is only a
 * preview — the public site changes when "Lưu & áp dụng" publishes the settings
 * record, preserving the draft/publish contract used by the rest of the CMS.
 */
export function ThemePanel({
  record,
  busy,
  onSave,
}: {
  record: RecordRow | null;
  busy: boolean;
  onSave: (theme: ThemeId, action: "save" | "publish") => void;
}) {
  const saved = themeById(
    typeof record?.data.theme === "string"
      ? (record.data.theme as string)
      : undefined,
  ).id;
  const [preview, setPreview] = useState<ThemeId>(saved);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    // Reset the local preview when the saved record/theme changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(saved);
    setDirty(false);
  }, [saved, record?.revision]);

  const active = themeById(preview);
  const canPublish =
    Boolean(record) && !busy && (dirty || record?.state !== "published");
  const isPublishedTheme = record?.state === "published" && saved === preview;

  return (
    <section className="adm-panel adm-theme">
      <div className="adm-theme-head">
        <div>
          <p className="adm-eyebrow">Giao diện website</p>
          <h2>Chọn theme cho landing page</h2>
          <p>
            Theme áp dụng cho toàn bộ trang public: nền, chữ, nút, liên kết,
            thẻ tour và menu. Studio giữ giao diện quản trị riêng.
          </p>
        </div>
        <div className="adm-theme-status" role="status">
          <span
            className={`adm-badge ${record?.state === "published" ? "" : "draft"}`}
          >
            {record
              ? record.state === "published"
                ? "Đang xuất bản"
                : "Bản nháp"
              : "Chưa tải được cấu hình"}
          </span>
          <span>
            {record?.state === "published"
              ? "Đang áp dụng: "
              : "Bản nháp đã chọn: "}
            <strong>{themeById(saved).label}</strong>
          </span>
          {record && record.state !== "published" ? (
            <span className="adm-hint">
              Website vẫn dùng theme đã xuất bản trước đó.
            </span>
          ) : null}
        </div>
      </div>

      <div className="adm-theme-grid">
        <div
          className="adm-theme-choices"
          role="radiogroup"
          aria-label="Chọn giao diện"
        >
          {THEMES.map((theme) => {
            const selected = preview === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className="adm-theme-card"
                onClick={() => {
                  setPreview(theme.id);
                  setDirty(theme.id !== saved);
                }}
              >
                <span className="adm-theme-swatches" aria-hidden="true">
                  {theme.swatch.map((color) => (
                    <span
                      key={color}
                      className="adm-theme-swatch"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span className="adm-theme-copy">
                  <span className="adm-theme-title">
                    {theme.label}
                    {theme.tag ? (
                      <span className="adm-theme-tag">{theme.tag}</span>
                    ) : null}
                  </span>
                  <span className="adm-theme-desc">{theme.description}</span>
                </span>
                <span className="adm-theme-check" aria-hidden="true">
                  {selected ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>

        <div className="adm-theme-preview-wrap">
          <div className="adm-theme-preview-label">
            <span>Xem trước</span>
            <strong>{active.label}</strong>
          </div>
          <div
            className="adm-theme-preview"
            data-theme={active.id}
            style={active.vars as CSSProperties}
          >
            <div className="adm-theme-preview-nav">
              <span className="adm-theme-preview-brand">SEA TRIP</span>
              <span className="adm-theme-preview-links">
                <span>Trang chủ</span>
                <span>Tour</span>
                <span>Cẩm nang</span>
                <span>Liên hệ</span>
              </span>
              <span className="adm-theme-preview-nav-cta">Tư vấn</span>
            </div>
            <div className="adm-theme-preview-hero">
              <p className="adm-theme-preview-kicker">
                <span />
                01 — Chọn lọc
              </p>
              <h3>
                Chạm vào một miền <em>bình yên rất khác.</em>
              </h3>
              <p>
                Qua những cung đường ôm biển, ghé làng chài nhỏ, để một ngày
                trôi theo nhịp sóng.
              </p>
              <div className="adm-theme-preview-actions">
                <span className="adm-theme-preview-primary">
                  Xem tour Quy Nhơn
                </span>
                <span className="adm-theme-preview-secondary">
                  Nhận tư vấn
                </span>
              </div>
              <span className="adm-theme-preview-link">
                Khám phá tuyến Quy Nhơn – Phú Yên ↗
              </span>
            </div>
            <div className="adm-theme-preview-cards">
              {/* Same watermark the landing page renders behind its sections;
                  it reads --theme-wordmark, so the colour changes with the
                  theme exactly like it does on the public site. */}
              <div className="adm-theme-preview-watermark" aria-hidden="true">
                <span>SEA TRIP</span>
              </div>
              <div className="adm-theme-preview-card">
                <span className="adm-theme-preview-thumb" aria-hidden="true" />
                <strong>Kỳ Co – Eo Gió</strong>
                <span>1 ngày · từ 990.000 ₫</span>
              </div>
              <div className="adm-theme-preview-card">
                <span className="adm-theme-preview-thumb adm-theme-preview-thumb--alt" aria-hidden="true" />
                <strong>Quy Nhơn – Phú Yên</strong>
                <span>3 ngày 2 đêm · từ 2.290.000 ₫</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="adm-theme-actions">
        <span className="adm-theme-hint">
          {isPublishedTheme
            ? "Theme này đang hiển thị trên website."
            : dirty
              ? "Đang xem trước — chưa áp dụng cho website."
              : record?.state !== "published"
                ? "Bản nháp đã lưu. Xuất bản để áp dụng cho website."
                : "Chọn một theme để xem trước."}
        </span>
        <button
          type="button"
          disabled={!record || busy || !dirty}
          onClick={() => onSave(preview, "save")}
        >
          Lưu bản nháp
        </button>
        <button
          type="button"
          className="adm-primary"
          disabled={!canPublish}
          onClick={() => onSave(preview, "publish")}
        >
          {busy ? "Đang lưu…" : "Lưu & áp dụng"}
        </button>
      </div>
    </section>
  );
}
