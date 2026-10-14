import { tours } from "@/content";
import type { Tour } from "@/domain/tour";
import type { Locale } from "@/i18n/config";
import { getAllDescendantCategoryIds } from "./internal";
import { resolveTour } from "./localize";

/**
 * Read-only access to tours, resolved for the requested locale.
 *
 * Every page reads tours through these functions and nothing else, so moving the
 * source from TypeScript files to an API/CMS later means rewriting this file —
 * not the UI.
 */

export function getTourBySlug(slug: string, locale: Locale): Tour | undefined {
  const tour = tours.find((candidate) => candidate.slug === slug);
  return tour ? resolveTour(tour, locale) : undefined;
}

export function getTourSlugs(): readonly string[] {
  return tours.map((tour) => tour.slug);
}

/** Tours filed under `categoryId` or any of its child categories. */
export function getToursByCategoryId(categoryId: string, locale: Locale): readonly Tour[] {
  const ids = new Set(getAllDescendantCategoryIds(categoryId));
  return tours
    .filter((tour) => tour.categoryIds.some((id) => ids.has(id)))
    .map((tour) => resolveTour(tour, locale));
}

/**
 * Home-page feature set. Prefers the Quy Nhơn – Phú Yên line-up (the site's
 * focus) and tops up with other regions so the section never looks empty.
 */
export function getFeaturedTours(limit = 6, locale: Locale): readonly Tour[] {
  const focus = new Set(getAllDescendantCategoryIds("cat_quy_nhon_phu_yen"));
  const inFocus = tours.filter((tour) => tour.categoryIds.some((id) => focus.has(id)));
  const chosen =
    inFocus.length >= limit ? inFocus.slice(0, limit) : [...inFocus, ...tours.filter((t) => !inFocus.includes(t))].slice(0, limit);
  return chosen.map((tour) => resolveTour(tour, locale));
}

/**
 * Related tours: same category first, then anything sharing a destination.
 * Returns `limit` items and never includes the tour itself.
 */
export function getRelatedTours(slug: string, limit = 3, locale: Locale): readonly Tour[] {
  const tour = tours.find((candidate) => candidate.slug === slug);
  if (!tour) return [];

  const categoryIds = new Set(tour.categoryIds);
  const destinationIds = new Set(tour.destinationIds);

  const scored = tours
    .filter((candidate) => candidate.slug !== tour.slug)
    .map((candidate) => {
      let score = 0;
      for (const id of candidate.categoryIds) if (categoryIds.has(id)) score += 3;
      for (const id of candidate.destinationIds) if (destinationIds.has(id)) score += 2;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const chosen =
    scored.length >= limit
      ? scored.slice(0, limit).map((entry) => entry.candidate)
      : [
          ...scored.map((entry) => entry.candidate),
          ...tours.filter(
            (candidate) =>
              candidate.slug !== tour.slug &&
              !scored.some((entry) => entry.candidate.slug === candidate.slug),
          ),
        ].slice(0, limit);

  return chosen.map((candidate) => resolveTour(candidate, locale));
}

/** Distinct tags across the catalogue — drives the listing filter chips. */
export function getTourTags(locale: Locale): readonly string[] {
  const tags = new Set<string>();
  for (const tour of tours) for (const tag of resolveTour(tour, locale).tags) tags.add(tag);
  return [...tags].sort((a, b) => a.localeCompare(b, locale === "vi" ? "vi" : "en"));
}
