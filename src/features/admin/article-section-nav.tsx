"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { EditorValue } from "./editor";

type FieldKey =
  | "title"
  | "slug"
  | "excerpt"
  | "cover"
  | "publishedAt"
  | "author"
  | "readingMinutes"
  | "featured"
  | "tags"
  | "destinationIds"
  | "relatedTourSlugs"
  | "contentStatus"
  | "body"
  | "seo"
  | "_en"
  | "_enReviewed"
  | "id"
  | "updatedAt";

type Group = {
  label: string;
  items: readonly { key: FieldKey; label: string }[];
};

const GROUPS: readonly Group[] = [
  {
    label: "Thông tin chung",
    items: [
      { key: "title", label: "Tiêu đề" },
      { key: "slug", label: "Slug" },
      { key: "excerpt", label: "Giới thiệu" },
      { key: "cover", label: "Ảnh bìa" },
      { key: "publishedAt", label: "Ngày đăng" },
      { key: "author", label: "Tác giả" },
      { key: "readingMinutes", label: "Thời gian đọc" },
      { key: "featured", label: "Bài nổi bật" },
    ],
  },
  {
    label: "Phân loại & liên kết",
    items: [
      { key: "tags", label: "Nhãn" },
      { key: "destinationIds", label: "Điểm đến liên quan" },
      { key: "relatedTourSlugs", label: "Tour liên quan" },
      { key: "contentStatus", label: "Trạng thái xác minh" },
    ],
  },
  {
    label: "Nội dung bài",
    items: [{ key: "body", label: "Các khối nội dung" }],
  },
  {
    label: "SEO & bản dịch",
    items: [
      { key: "seo", label: "SEO & chia sẻ" },
      { key: "_en", label: "Bản dịch tiếng Anh" },
      { key: "_enReviewed", label: "Duyệt bản dịch" },
    ],
  },
  {
    label: "Nâng cao",
    items: [
      { key: "id", label: "Mã nội dung" },
      { key: "updatedAt", label: "Cập nhật" },
    ],
  },
];

function countOf(data: Record<string, EditorValue>, key: FieldKey): number {
  const value = data[key];
  if (Array.isArray(value)) return value.length;
  if (key === "seo" && value && typeof value === "object" && !Array.isArray(value)) {
    return Object.values(value).filter(
      (entry) => typeof entry === "string" && entry.trim(),
    ).length;
  }
  if ((key === "_en" || key === "cover") && value && typeof value === "object") {
    return 1;
  }
  return 0;
}

export function ArticleSectionNav({
  data,
}: {
  data: Record<string, EditorValue>;
}) {
  const [active, setActive] = useState<FieldKey | null>(null);
  const present = new Set(Object.keys(data));
  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => present.has(item.key)),
  })).filter((group) => group.items.length > 0);
  const availableKeys = groups.flatMap((group) =>
    group.items.map((item) => item.key),
  );
  const keys = availableKeys.join("|");

  useEffect(() => {
    const sections = keys
      .split("|")
      .map((key) => document.getElementById(`record-field-${key}`))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!sections.length) return;
    const update = () => {
      const main = document.querySelector<HTMLElement>(".adm-main");
      const stickyOffset =
        (main
          ? parseFloat(
              getComputedStyle(main).getPropertyValue("--adm-edit-offset"),
            )
          : 0) || 160;
      const threshold = Math.max(
        stickyOffset + 40,
        Math.round(window.innerHeight * 0.42),
      );
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= threshold) current = section;
        else break;
      }
      setActive(current.id.replace("record-field-", "") as FieldKey);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [keys]);

  const jump = (key: FieldKey) => {
    const element = document.getElementById(`record-field-${key}`);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#record-field-${key}`);
    setActive(key);
  };

  return (
    <nav className="adm-tour-nav adm-article-nav" aria-label="Các phần nội dung bài">
      <header className="adm-tour-nav-head">
        <p className="adm-eyebrow">Nội dung bài</p>
        <span className="adm-tour-nav-total">{availableKeys.length} mục</span>
      </header>
      {groups.map((group) => (
        <div className="adm-tour-nav-group" key={group.label}>
          <p className="adm-tour-nav-group-label">{group.label}</p>
          {group.items.map((item) => {
            const count = countOf(data, item.key);
            return (
              <a
                key={item.key}
                href={`#record-field-${item.key}`}
                data-active={active === item.key ? "true" : undefined}
                title={
                  count > 0 ? `${item.label} · ${count} mục` : item.label
                }
                onClick={(event) => {
                  event.preventDefault();
                  jump(item.key);
                }}
              >
                <span className="adm-tour-nav-label">{item.label}</span>
                {count > 0 ? (
                  <span className="adm-tour-nav-count">{count}</span>
                ) : null}
              </a>
            );
          })}
        </div>
      ))}
      <div className="adm-tour-nav-actions">
        <button type="button" className="adm-ghost-link" onClick={() => jump("title")}>
          Về đầu bài
        </button>
        {present.has("seo") ? (
          <button type="button" className="adm-ghost-link" onClick={() => jump("seo")}>
            Tới phần SEO
          </button>
        ) : present.has("body") ? (
          <button type="button" className="adm-ghost-link" onClick={() => jump("body")}>
            Tới nội dung
          </button>
        ) : null}
      </div>
    </nav>
  );
}

/** Shared two-column shell: article section rail + the existing record form. */
export function ArticleEditorLayout({
  data,
  children,
}: {
  data: Record<string, EditorValue> | null;
  children: ReactNode;
}) {
  if (!data) return <>{children}</>;
  return (
    <div className="adm-record-editor">
      <ArticleSectionNav data={data} />
      <div className="adm-record-editor-body">{children}</div>
    </div>
  );
}
