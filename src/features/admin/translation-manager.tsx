"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdmFilterSelect } from "./ui-select";
import { searchKey } from "@/lib/search";
import {
  TRANSLATABLE_KINDS,
  TRANSLATABLE_KIND_LABELS,
  TRANSLATION_STATE_LABELS,
  type TranslationQueue,
  type TranslationState,
} from "@/lib/translation-coverage";

type StatusFilter = "all" | "incomplete" | TranslationState;

const STATUS_ORDER: Record<TranslationState, number> = {
  missing: 0,
  partial: 1,
  complete: 2,
};

function matchesStatus(status: TranslationState, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "incomplete") return status !== "complete";
  return status === filter;
}

/**
 * Studio queue for records whose English overlay is not finished.
 *
 * The server derives every status from the stored `data._en` fields, so coming
 * back after saving a record shows the new state without a stored flag to sync.
 */
export function TranslationManager() {
  const [queue, setQueue] = useState<TranslationQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("incomplete");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/translations", {
        cache: "no-store",
      });
      if (response.status === 401) {
        window.location.replace("/admin/login?expired=1");
        return;
      }
      const body = (await response.json()) as
        | TranslationQueue
        | { error?: string };
      if (!response.ok) {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "Không tải được danh sách bản dịch.",
        );
      }
      setQueue(body as TranslationQueue);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không tải được danh sách bản dịch.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The loader owns its own error/loading state; this effect only starts it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // Saving a translation navigates back here; focus refresh also catches a
    // record saved in another Studio tab.
    const onFocus = () => void load();
    const onPageShow = (event: PageTransitionEvent) => {
      // Back/Forward may restore the page from bfcache with the old queue.
      if (event.persisted) void load();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [load]);

  const items = useMemo(() => queue?.items ?? [], [queue]);
  const summary = queue?.summary;

  const visible = useMemo(() => {
    const needle = searchKey(query.trim());
    return items
      .filter((item) => {
        if (kind !== "all" && item.kind !== kind) return false;
        if (!matchesStatus(item.status, status)) return false;
        if (!needle) return true;
        return searchKey(
          `${item.title} ${item.slug} ${item.kindLabel} ${TRANSLATION_STATE_LABELS[item.status]}`,
        ).includes(needle);
      })
      .sort(
        (a, b) =>
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
          a.title.localeCompare(b.title, "vi"),
      );
  }, [items, kind, query, status]);

  const stateCards = [
    {
      key: "incomplete" as const,
      label: "Chưa đủ bản EN",
      count: summary?.incomplete ?? 0,
      hint: "Cần bổ sung trước khi khách đọc bản tiếng Anh.",
      tone: "missing",
    },
    {
      key: "missing" as const,
      label: TRANSLATION_STATE_LABELS.missing,
      count: summary?.missing ?? 0,
      hint: "Chưa có trường nội dung tiếng Anh nào.",
      tone: "missing",
    },
    {
      key: "partial" as const,
      label: TRANSLATION_STATE_LABELS.partial,
      count: summary?.partial ?? 0,
      hint: "Đã dịch một phần, trang EN còn dùng tiếng Việt.",
      tone: "partial",
    },
    {
      key: "complete" as const,
      label: TRANSLATION_STATE_LABELS.complete,
      count: summary?.complete ?? 0,
      hint: "Đủ các trường nội dung tương ứng bản tiếng Việt.",
      tone: "complete",
    },
  ];

  return (
    <section className="adm-panel adm-translations" aria-labelledby="adm-tr-title">
      <header className="adm-translations-head">
        <div>
          <p className="adm-eyebrow">Translation status</p>
          <h2 id="adm-tr-title">Bản dịch tiếng Anh</h2>
          <p>
            Theo dõi những tour, cẩm nang, danh mục và điểm đến chưa đủ nội dung
            tiếng Anh. Trạng thái được tính trực tiếp từ phần bản dịch đã lưu
            trong CMS, nên chỉ cần lưu đủ nội dung là danh sách tự cập nhật.
          </p>
          <p className="adm-translations-legend">
            <strong>Chưa dịch</strong>: chưa có trường EN nào.{" "}
            <strong>Dịch chưa đầy đủ</strong>: đã có một phần.{" "}
            <strong>Đã dịch</strong>: đủ các trường nội dung có trong bản tiếng
            Việt. Ô trống, khoảng trắng và câu tiếng Việt còn sót lại đều được
            tính là chưa dịch. Trạng thái tính trên bản đang sửa; bản dịch chỉ
            lên website sau khi Xuất bản.
          </p>
        </div>
        <button
          type="button"
          className="adm-translations-refresh"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Đang tải…" : "Làm mới"}
        </button>
      </header>

      <div className="adm-translation-summary" role="group" aria-label="Tổng quan bản dịch tiếng Anh">
        {stateCards.map((card) => (
          <button
            key={card.key}
            type="button"
            className="adm-translation-summary-card"
            data-tone={card.tone}
            data-active={status === card.key}
            aria-pressed={status === card.key}
            aria-label={`${card.label}: ${card.count}`}
            onClick={() => setStatus(card.key)}
            title={`${card.label}: ${card.count} — ${card.hint}`}
          >
            <span>{card.label}</span>
            <strong>{card.count}</strong>
            <small>{card.hint}</small>
          </button>
        ))}
      </div>

      <div className="adm-toolbar adm-translation-toolbar">
        <input
          type="search"
          aria-label="Tìm nội dung theo tên tiếng Việt"
          placeholder="Tìm theo tên tiếng Việt, slug…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <AdmFilterSelect
          label="Loại nội dung"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: "Tất cả loại nội dung", count: summary?.total },
            ...TRANSLATABLE_KINDS.map((value) => ({
              value,
              label: TRANSLATABLE_KIND_LABELS[value],
              count: summary?.byKind[value] ?? 0,
            })),
          ]}
        />
        <AdmFilterSelect
          label="Trạng thái bản EN"
          value={status}
          onChange={(next) => setStatus(next as StatusFilter)}
          options={[
            { value: "all", label: "Tất cả trạng thái", count: summary?.total },
            {
              value: "incomplete",
              label: "Chưa đủ bản EN",
              count: summary?.incomplete,
            },
            {
              value: "missing",
              label: TRANSLATION_STATE_LABELS.missing,
              count: summary?.missing,
            },
            {
              value: "partial",
              label: TRANSLATION_STATE_LABELS.partial,
              count: summary?.partial,
            },
            {
              value: "complete",
              label: TRANSLATION_STATE_LABELS.complete,
              count: summary?.complete,
            },
          ]}
        />
      </div>

      <p className="adm-translation-count" role="status">
        {loading
          ? "Đang tải danh sách…"
          : `Hiển thị ${visible.length}/${items.length} mục${
              summary ? ` · ${summary.incomplete} mục chưa đủ bản EN` : ""
            }`}
        {queue?.generatedAt ? (
          <span>
            {" "}
            · Cập nhật{" "}
            {new Date(queue.generatedAt).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : null}
      </p>

      {error ? (
        <div className="adm-translation-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>
            Thử lại
          </button>
        </div>
      ) : null}

      {!error && loading && !queue ? (
        <p className="adm-translation-empty" role="status">
          Đang tải…
        </p>
      ) : null}

      {!error && queue && visible.length === 0 ? (
        <p className="adm-translation-empty" role="status">
          Không có nội dung phù hợp với bộ lọc này.
        </p>
      ) : null}

      {visible.length > 0 ? (
        <ul className="adm-translation-list">
          {visible.map((item) => (
            <li
              key={`${item.kind}:${item.id}`}
              className="adm-translation-row"
              data-state={item.status}
            >
              <div className="adm-translation-row-main">
                <div className="adm-translation-row-meta">
                  <span className="adm-translation-kind">{item.kindLabel}</span>
                  {item.state === "draft" ? (
                    <span className="adm-badge draft">Bản nháp</span>
                  ) : null}
                  {item.reviewed ? (
                    <span className="adm-badge">Đã duyệt EN</span>
                  ) : null}
                  <span className="adm-translation-slug">{item.slug || item.id}</span>
                </div>
                <h3>{item.title}</h3>
                {item.status !== "complete" && item.missingFields.length > 0 ? (
                  <p className="adm-translation-missing">
                    Còn thiếu: {item.missingFields.slice(0, 4).join(" · ")}
                    {item.missingFields.length > 4 ? " …" : ""}
                  </p>
                ) : item.status !== "complete" ? (
                  <p className="adm-translation-missing">
                    Còn {Math.max(0, item.required - item.filled)} trường chưa có
                    nội dung tiếng Anh.
                  </p>
                ) : (
                  <p className="adm-translation-complete">
                    Đủ {item.filled}/{item.required} trường nội dung. Trang EN
                    không còn hiện thông báo bản dịch đang hoàn thiện.
                  </p>
                )}
              </div>
              <div className="adm-translation-row-side">
                <span
                  className="adm-translation-state"
                  data-state={item.status}
                >
                  {TRANSLATION_STATE_LABELS[item.status]}
                </span>
                <Link href={item.editHref} className="adm-translation-edit">
                  {item.status === "complete"
                    ? "Xem / sửa bản dịch"
                    : "Bổ sung bản dịch"}
                  <span aria-hidden="true"> ↗</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
