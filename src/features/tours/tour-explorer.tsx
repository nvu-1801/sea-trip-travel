"use client";

import { useId, useMemo, useState } from "react";
import { CloseIcon, CompassIcon } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/form-controls";
import { TourCard, type TourCardModel } from "./tour-card";
import "./tour-explorer.css";

type SortKey = "recommended" | "duration-asc" | "duration-desc";

export type TourExplorerLabels = {
  filterLabel: string;
  all: string;
  sortLabel: string;
  sortRecommended: string;
  sortDurationAsc: string;
  sortDurationDesc: string;
  /** Plural form, `{count}` placeholder. */
  tourCount: { one: string; other: string };
  clearFilter: string;
  emptyTitle: string;
  emptyBody: string;
  clearFiltersShort: string;
  sendRequest: string;
  contactHref: string;
};

function countLabel(label: { one: string; other: string }, count: number): string {
  return (count === 1 ? label.one : label.other).replace("{count}", String(count));
}

/**
 * Category listing with tag filter + duration sort.
 *
 * This is genuinely client-side on purpose: the whole catalogue for a category
 * is small, so shipping it once beats a server round-trip per keystroke. Every
 * string arrives in `labels`; the catalogs stay on the server.
 *
 * Layout owns two behaviours the page relies on:
 *   - the filter toolbar sticks below the site header while browsing cards;
 *   - the first row of cards arrives as one staggered group instead of one
 *     observer per card.
 */
export function TourExplorer({
  tours,
  tags,
  labels,
}: {
  tours: readonly TourCardModel[];
  tags: readonly string[];
  labels: TourExplorerLabels;
}) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recommended");
  const sortLabelId = useId();

  const sortLabels: Record<SortKey, string> = {
    recommended: labels.sortRecommended,
    "duration-asc": labels.sortDurationAsc,
    "duration-desc": labels.sortDurationDesc,
  };

  const sortOptions = (Object.keys(sortLabels) as SortKey[]).map((key) => ({
    value: key,
    label: sortLabels[key],
  }));

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
    <div className="stt-explorer">
      <div className="stt-explorer-panel">
        <div className="stt-explorer-head">
          {availableTags.length > 0 ? (
            <p id="tour-filter-label" className="stt-explorer-label">
              {labels.filterLabel}
            </p>
          ) : (
            <span aria-hidden="true" />
          )}
          <p aria-live="polite" className="stt-explorer-count">
            {countLabel(labels.tourCount, visible.length)}
          </p>
        </div>

        {availableTags.length > 0 ? (
          <div
            role="group"
            aria-labelledby="tour-filter-label"
            className="stt-explorer-chips no-scrollbar"
          >
            <button
              type="button"
              aria-pressed={activeTag === null}
              onClick={() => setActiveTag(null)}
              data-focus-ring=""
              data-active={activeTag === null}
              className="stt-explorer-chip"
            >
              {labels.all}
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={activeTag === tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                data-focus-ring=""
                data-active={activeTag === tag}
                className="stt-explorer-chip"
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}

        <div className="stt-explorer-sort">
          <div className="stt-explorer-sort-field">
            <label id={sortLabelId} className="stt-explorer-label">
              {labels.sortLabel}
            </label>
            <Select
              aria-labelledby={sortLabelId}
              className="h-9 rounded-lg pl-3 pr-10 text-[0.8125rem]"
              value={sort}
              options={sortOptions}
              onChange={(next) => setSort(next as SortKey)}
            />
          </div>

          {isFiltered ? (
            <button
              type="button"
              onClick={clearFilters}
              data-focus-ring=""
              className="stt-explorer-clear"
            >
              <CloseIcon className="h-3.5 w-3.5" />
              {labels.clearFilter}
            </button>
          ) : null}
        </div>
      </div>

      {visible.length > 0 ? (
        <ul className="stt-explorer-grid">
          {visible.map((tour) => (
            <li key={tour.slug} className="flex">
              <TourCard tour={tour} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
          <CompassIcon className="h-9 w-9 text-brand-300" />
          <div>
            <h3 className="text-lg font-bold text-foreground">{labels.emptyTitle}</h3>
            <p className="mt-1 text-sm text-foreground-muted">{labels.emptyBody}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={clearFilters}
              data-focus-ring=""
              className="inline-flex h-11 items-center rounded-full border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-strong"
            >
              {labels.clearFiltersShort}
            </button>
            <ButtonLink href={labels.contactHref} size="md">
              {labels.sendRequest}
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
