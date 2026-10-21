"use client";

import {
  HOME_GROUPS,
  HOME_SECTIONS,
  sectionSummary,
  type HomeSectionMeta,
} from "@/lib/home-sections";

/**
 * "Trang chủ" tab: cards grouped Đầu / Giữa / Cuối trang, in the exact order
 * the sections render on the website. Each card shows a thumbnail, its
 * position number, a live status pill (published/draft), a live summary of
 * the current data, a tip about what to edit, and an action that opens a
 * focused modal (or jumps to the settings tab for the footer).
 */
export function HomeSections({
  heroData,
  landingData,
  heroState,
  landingState,
  onEditHero,
  onEditSection,
  onGoSettings,
}: {
  heroData: unknown;
  landingData: unknown;
  heroState?: string;
  landingState?: string;
  onEditHero: (meta: HomeSectionMeta) => void;
  onEditSection: (meta: HomeSectionMeta) => void;
  onGoSettings: () => void;
}) {
  let counter = 0;
  return (
    <div className="adm-home-groups">
      {HOME_GROUPS.map((group) => {
        const items = HOME_SECTIONS.filter(
          (meta) => meta.group === group.key,
        );
        if (items.length === 0) return null;
        return (
          <section key={group.key} className="adm-home-group">
            <header className="adm-home-group-head">
              <div>
                <h3>{group.title}</h3>
                <p>{group.hint}</p>
              </div>
              <span className="adm-tour-group-count">
                {items.length} phần
              </span>
            </header>
            <div className="adm-home-grid">
              {items.map((meta) => {
                counter += 1;
                const num = counter;
                const data = meta.key === "hero" ? heroData : landingData;
                const state =
                  meta.collection === null
                    ? undefined
                    : meta.key === "hero"
                      ? heroState
                      : landingState;
                const missing = meta.collection !== null && !data;
                return (
                  <article
                    key={meta.key}
                    className={`adm-section-card${meta.linkTab ? " adm-section-card--link" : ""}`}
                  >
                    <div className="adm-section-thumb" aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={meta.illustration} alt="" loading="lazy" />
                      <span className="adm-section-num">
                        {String(num).padStart(2, "0")}
                      </span>
                      <span className="adm-section-icon">{meta.icon}</span>
                    </div>
                    <div className="adm-section-body">
                      <div className="adm-section-top">
                        <p className="adm-section-where">{meta.where}</p>
                        {state === "published" ? (
                          <span className="adm-badge">Đang xuất bản</span>
                        ) : state === "draft" ? (
                          <span className="adm-badge draft">Bản nháp</span>
                        ) : null}
                      </div>
                      <h3>
                        {meta.icon} {meta.title}
                      </h3>
                      <p className="adm-section-summary">
                        {missing
                          ? "Đang tải…"
                          : sectionSummary(
                              meta,
                              meta.key === "footer" ? {} : data,
                            )}
                      </p>
                      <p className="adm-section-tip">💡 {meta.tip}</p>
                      <div className="adm-section-actions">
                        {meta.linkTab ? (
                          <button type="button" onClick={onGoSettings}>
                            Mở Website & footer ↗
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="adm-primary"
                            disabled={missing}
                            onClick={() =>
                              meta.key === "hero"
                                ? onEditHero(meta)
                                : onEditSection(meta)
                            }
                          >
                            Sửa {meta.title.toLowerCase()} ✎
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
