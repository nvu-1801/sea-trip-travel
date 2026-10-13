"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CloseIcon, CompassIcon } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/form-controls";
import { TourCard, type TourCardModel } from "./tour-card";

type SortKey = "recommended" | "duration-asc" | "duration-desc";

const SORT_LABELS: Record<SortKey, string> = {
  recommended: "Đề xuất",
  "duration-asc": "Thời lượng ngắn trước",
  "duration-desc": "Thời lượng dài trước",
};

/**
 * Category listing with tag filter + duration sort.
 *
 * This is genuinely client-side on purpose: the whole catalogue for a category
 * is small, so shipping it once beats a server round-trip per keystroke. The
 * filter state is component state (not the URL) — with this few tours a URL
 * contract would be ceremony, and it would force the page into dynamic
 * rendering. If the catalogue grows past ~100 tours per category, this is the
 * component to swap for a server-side, URL-driven filter.
 */
export function TourExplorer({
  tours,
  tags,
}: {
  tours: readonly TourCardModel[];
  tags: readonly string[];
}) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recommended");
  const sortId = useId();

  /** Only offer tags that would actually return results. */
  const availableTags = useMemo(
    () => tags.filter((tag) => tours.some((tour) => tour.tags.includes(tag))),
    [tags, tours],
  );

  const visible = useMemo(() => {
    const filtered = activeTag ? tours.filter((tour) => tour.tags.includes(activeTag)) : [...tours];
    switch (sort) {
      case "duration-asc":
        return filtered.sort((a, b) => a.durationDays - b.durationDays);
      case "duration-desc":
        return filtered.sort((a, b) => b.durationDays - a.durationDays);
      default:
        return filtered;
    }
  }, [tours, activeTag, sort]);

  const isFiltered = activeTag !== null || sort !== "recommended";

  const clearFilters = () => {
    setActiveTag(null);
    setSort("recommended");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-muted p-4 sm:p-5">
        {availableTags.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            <p id="tour-filter-label" className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
              Lọc theo nhu cầu
            </p>
            <div role="group" aria-labelledby="tour-filter-label" className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={activeTag === null}
                onClick={() => setActiveTag(null)}
                data-focus-ring=""
                className={cn(
                  "inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors sm:min-h-9",
                  activeTag === null
                    ? "border-primary-strong bg-primary-strong text-white"
                    : "border-border-strong bg-surface text-foreground-muted hover:border-primary hover:text-primary-strong",
                )}
              >
                Tất cả
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={activeTag === tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  data-focus-ring=""
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                    activeTag === tag
                      ? "border-primary-strong bg-primary-strong text-white"
                      : "border-border-strong bg-surface text-foreground-muted hover:border-primary hover:text-primary-strong",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5 sm:w-60">
            <label
              htmlFor={sortId}
              className="text-xs font-bold uppercase tracking-wider text-foreground-muted"
            >
              Sắp xếp theo
            </label>
            <Select
              id={sortId}
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <p aria-live="polite" className="text-sm text-foreground-muted">
              {visible.length} tour{visible.length === 1 ? "" : ""}
            </p>
            {isFiltered ? (
              <button
                type="button"
                onClick={clearFilters}
                data-focus-ring=""
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3.5 text-sm font-semibold text-foreground-muted transition-colors hover:border-primary hover:text-primary-strong sm:min-h-9"
              >
                <CloseIcon className="h-3.5 w-3.5" />
                Xoá lọc
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {visible.length > 0 ? (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((tour) => (
            <li key={tour.slug} className="flex">
              <TourCard tour={tour} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
          <CompassIcon className="h-9 w-9 text-brand-300" />
          <div>
            <h3 className="text-lg font-bold text-foreground">Chưa có tour phù hợp bộ lọc</h3>
            <p className="mt-1 text-sm text-foreground-muted">
              Thử bỏ bộ lọc, hoặc gửi yêu cầu để SEA TRIP thiết kế lịch trình riêng cho bạn.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={clearFilters}
              data-focus-ring=""
              className="inline-flex h-11 items-center rounded-full border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-strong"
            >
              Xoá bộ lọc
            </button>
            <ButtonLink href="/lien-he" size="md">
              Gửi yêu cầu tư vấn
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
