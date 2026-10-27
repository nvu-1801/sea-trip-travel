"use client";

import {
  HOME_GROUPS,
  HOME_SECTIONS,
  sectionSummary,
  type HomeSectionMeta,
} from "@/lib/home-sections";
import { AdminIcon, type AdminIconName } from "./admin-icons";

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
  // Số thứ tự toàn cục theo đúng thứ tự landing page (01–11).
  const numbered = HOME_SECTIONS.map((meta, i) => ({ meta, num: i + 1 }));
  return (
    <div className="adm-home-groups">
      {HOME_GROUPS.map((group) => {
        const items = numbered.filter(
          ({ meta }) => meta.group === group.key,
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
              {items.map(({ meta, num }) => {
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
                    data-group={meta.group}
                    className={`adm-section-card${meta.linkTab ? " adm-section-card--link" : ""}`}
                  >
                    <div className="adm-section-thumb" aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={meta.illustration} alt="" loading="lazy" />
                      <span className="adm-section-num">
                        {String(num).padStart(2, "0")}
                      </span>
                      <span className="adm-section-icon">
                        <AdminIcon
                          name={meta.icon as AdminIconName}
                          size={16}
                        />
                      </span>
                      {state ? (
                        <span className="adm-section-state" data-state={state}>
                          <i aria-hidden="true" />
                          {state === "published" ? "Live" : "Nháp"}
                        </span>
                      ) : null}
                    </div>
                    <div className="adm-section-body">
                      {state ? (
                        <span className="adm-sr-only">
                          Trạng thái:{" "}
                          {state === "published"
                            ? "Đang xuất bản"
                            : "Bản nháp"}
                        </span>
                      ) : null}
                      <div className="adm-section-top">
                        <p className="adm-section-where">{meta.where}</p>
                      </div>
                      <h3>{meta.title}</h3>
                      <p className="adm-section-summary">
                        {missing
                          ? "Đang tải…"
                          : sectionSummary(
                              meta,
                              meta.key === "footer" ? {} : data,
                            )}
                      </p>
                      <p className="adm-section-tip">{meta.tip}</p>
                      <div className="adm-section-actions">
                        {meta.linkTab ? (
                          <button type="button" onClick={onGoSettings}>
                            Mở Website &amp; footer{" "}
                            <span aria-hidden="true">↗</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="adm-section-edit"
                            disabled={missing}
                            onClick={() =>
                              meta.key === "hero"
                                ? onEditHero(meta)
                                : onEditSection(meta)
                            }
                          >
                            Sửa {meta.title.toLowerCase()}{" "}
                            <span aria-hidden="true">↗</span>
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
