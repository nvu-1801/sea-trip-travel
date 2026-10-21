"use client";

import {
  HOME_SECTIONS,
  sectionSummary,
  type HomeSectionMeta,
} from "@/lib/home-sections";

/**
 * "Trang chủ" tab: one visual card per landing-page section, in the exact
 * order the sections render on the website. Each card shows a fixed
 * illustration, where the section appears, a live summary of the current
 * data, and an edit action that opens a focused modal (hero uses the full
 * HeroEditor, landing sections reuse the generic Editor filtered to one
 * field). The footer card links to the settings tab instead.
 */
export function HomeSections({
  heroData,
  landingData,
  onEditHero,
  onEditSection,
  onGoSettings,
}: {
  heroData: unknown;
  landingData: unknown;
  onEditHero: (title: string) => void;
  onEditSection: (meta: HomeSectionMeta) => void;
  onGoSettings: () => void;
}) {
  return (
    <div className="adm-home-grid">
      {HOME_SECTIONS.map((meta, index) => {
        const data = meta.key === "hero" ? heroData : landingData;
        const missing = meta.collection !== null && !data;
        return (
          <article key={meta.key} className="adm-section-card">
            <div className="adm-section-thumb" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={meta.illustration} alt="" loading="lazy" />
              <span className="adm-section-num">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="adm-section-body">
              <p className="adm-section-where">{meta.where}</p>
              <h3>{meta.title}</h3>
              <p className="adm-section-summary">
                {missing
                  ? "Đang tải…"
                  : sectionSummary(meta, meta.key === "footer" ? {} : data)}
              </p>
              <div className="adm-section-actions">
                {meta.linkTab ? (
                  <button type="button" onClick={onGoSettings}>
                    Mở Website & footer ↗
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={missing}
                    onClick={() =>
                      meta.key === "hero"
                        ? onEditHero(meta.title)
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
  );
}
