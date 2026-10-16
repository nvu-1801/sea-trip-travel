import type { Tour } from "@/domain/tour";
import type { Locale } from "@/i18n/config";
import type { ContentSnapshot } from "@/server/repo/types";
import { loadPublishedSnapshot, translationsFor } from "./snapshot";
import { getAllDescendantCategoryIds } from "./internal";
import { resolveTour } from "./localize";
import { getSiteSettings } from "./settings";

/**
 * Read-only access to tours, resolved for the requested locale.
 *
 * Every page reads tours through these functions and nothing else, so the
 * source is a single cached snapshot (`loadPublishedSnapshot`). Only published,
 * non-deleted records are ever present in that snapshot. Unit tests pass an
 * explicit snapshot to skip the Next cache wrapper.
 */

async function snap(source?: ContentSnapshot): Promise<ContentSnapshot> {
  return source ?? loadPublishedSnapshot();
}

export async function getTours(locale: Locale, source?: ContentSnapshot): Promise<Tour[]> {
  const snapshot = await snap(source);
  const translations = translationsFor(snapshot, locale);
  return snapshot.tours.map((tour) => resolveTour(tour, locale, translations));
}

export async function getTourBySlug(
  slug: string,
  locale: Locale,
  source?: ContentSnapshot,
): Promise<Tour | undefined> {
  const snapshot = await snap(source);
  const tour = snapshot.tours.find((candidate) => candidate.slug === slug);
  if (!tour) return undefined;
  return resolveTour(tour, locale, translationsFor(snapshot, locale));
}

export async function getTourSlugs(source?: ContentSnapshot): Promise<string[]> {
  const snapshot = await snap(source);
  return snapshot.tours.map((tour) => tour.slug);
}

/** Tours filed under `categoryId` or any of its child categories. */
export async function getToursByCategoryId(
  categoryId: string,
  locale: Locale,
  source?: ContentSnapshot,
): Promise<Tour[]> {
  const snapshot = await snap(source);
  const ids = new Set(getAllDescendantCategoryIds(snapshot.categories, categoryId));
  const translations = translationsFor(snapshot, locale);
  return snapshot.tours
    .filter((tour) => tour.categoryIds.some((id) => ids.has(id)))
    .map((tour) => resolveTour(tour, locale, translations));
}

/**
 * Home-page feature set. The owner can pin an explicit list in Trang chủ →
 * tour nổi bật; otherwise fall back to the Quy Nhơn – Phú Yên line-up (the
 * site's focus), topped up with other regions so the section is never empty.
 */
export async function getFeaturedTours(
  limit = 6,
  locale: Locale,
  source?: ContentSnapshot,
): Promise<Tour[]> {
  const snapshot = await snap(source);
  const translations = translationsFor(snapshot, locale);
  const settings = await getSiteSettings(locale, snapshot);

  const pinned = settings.home?.featuredTourSlugs ?? [];
  if (pinned.length > 0) {
    const chosen = pinned
      .map((slug) => snapshot.tours.find((tour) => tour.slug === slug))
      .filter((tour): tour is Tour => Boolean(tour))
      .slice(0, limit);
    if (chosen.length > 0) return chosen.map((tour) => resolveTour(tour, locale, translations));
  }

  const focus = new Set(getAllDescendantCategoryIds(snapshot.categories, "cat_quy_nhon_phu_yen"));
  const inFocus = snapshot.tours.filter((tour) => tour.categoryIds.some((id) => focus.has(id)));
  const dayLimit = Math.ceil(limit / 2);
  const diverse = [
    ...inFocus.filter((tour) => tour.duration.days === 1).slice(0, dayLimit),
    ...inFocus.filter((tour) => tour.duration.days > 1).slice(0, limit - dayLimit),
    ...inFocus,
    ...snapshot.tours.filter((tour) => !inFocus.includes(tour)),
  ];
  const chosen = [...new Map(diverse.map((tour) => [tour.id, tour])).values()].slice(0, limit);
  return chosen.map((tour) => resolveTour(tour, locale, translations));
}

/** Related tours: same category first, then anything sharing a destination. */
export async function getRelatedTours(
  slug: string,
  limit = 3,
  locale: Locale,
  source?: ContentSnapshot,
): Promise<Tour[]> {
  const snapshot = await snap(source);
  const translations = translationsFor(snapshot, locale);
  const tour = snapshot.tours.find((candidate) => candidate.slug === slug);
  if (!tour) return [];

  const categoryIds = new Set(tour.categoryIds);
  const destinationIds = new Set(tour.destinationIds);

  const scored = snapshot.tours
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
          ...snapshot.tours.filter(
            (candidate) =>
              candidate.slug !== tour.slug &&
              !scored.some((entry) => entry.candidate.slug === candidate.slug),
          ),
        ].slice(0, limit);

  return chosen.map((candidate) => resolveTour(candidate, locale, translations));
}

/** Distinct tags across the catalogue — drives the listing filter chips. */
export async function getTourTags(locale: Locale, source?: ContentSnapshot): Promise<string[]> {
  const snapshot = await snap(source);
  const translations = translationsFor(snapshot, locale);
  const tags = new Set<string>();
  for (const tour of snapshot.tours) {
    for (const tag of resolveTour(tour, locale, translations).tags) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b, locale === "vi" ? "vi" : "en"));
}
