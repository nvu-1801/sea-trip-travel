import { tours } from "@/content";
import type { Tour } from "@/domain/tour";
import { getAllDescendantCategoryIds } from "./internal";

/**
 * Read-only access to tours.
 *
 * Every page reads tours through these functions and nothing else, so moving
 * the source from TypeScript files to an API/CMS later means rewriting this
 * file — not the UI.
 */

export function getTours(): readonly Tour[] {
  return tours;
}

export function getTourBySlug(slug: string): Tour | undefined {
  return tours.find((tour) => tour.slug === slug);
}

export function getTourSlugs(): readonly string[] {
  return tours.map((tour) => tour.slug);
}

/** Tours filed under `categoryId` or any of its child categories. */
export function getToursByCategoryId(categoryId: string): readonly Tour[] {
  const ids = new Set(getAllDescendantCategoryIds(categoryId));
  return tours.filter((tour) => tour.categoryIds.some((id) => ids.has(id)));
}

export function getToursByIds(ids: readonly string[]): readonly Tour[] {
  const wanted = new Set(ids);
  return tours.filter((tour) => wanted.has(tour.slug));
}

/**
 * Home-page feature set. Prefers the Quy Nhơn – Phú Yên line-up (the site's
 * focus) and tops up with other regions so the section never looks empty.
 */
export function getFeaturedTours(limit = 6): readonly Tour[] {
  const focus = new Set(getAllDescendantCategoryIds("cat_quy_nhon_phu_yen"));
  const inFocus = tours.filter((tour) => tour.categoryIds.some((id) => focus.has(id)));
  if (inFocus.length >= limit) return inFocus.slice(0, limit);

  const rest = tours.filter((tour) => !inFocus.includes(tour));
  return [...inFocus, ...rest].slice(0, limit);
}

/**
 * Related tours: same category first, then anything sharing a destination.
 * Returns `limit` items and never includes the tour itself.
 */
export function getRelatedTours(slug: string, limit = 3): readonly Tour[] {
  const tour = getTourBySlug(slug);
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

  if (scored.length >= limit) {
    return scored.slice(0, limit).map((entry) => entry.candidate);
  }

  const chosen = new Set(scored.map((entry) => entry.candidate.slug));
  const fallback = tours.filter(
    (candidate) => candidate.slug !== tour.slug && !chosen.has(candidate.slug),
  );
  return [...scored.map((entry) => entry.candidate), ...fallback].slice(0, limit);
}

/** Distinct tags across the catalogue — drives the listing filter chips. */
export function getTourTags(): readonly string[] {
  const tags = new Set<string>();
  for (const tour of tours) for (const tag of tour.tags) tags.add(tag);
  return [...tags].sort((a, b) => a.localeCompare(b, "vi"));
}
