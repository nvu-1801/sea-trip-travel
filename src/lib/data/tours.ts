import { published } from "@/server/cms/store";
import { tours as seed_tours } from "@/content";
const current_tours = () => published("tours", seed_tours);
import { landingSections } from "@/server/cms/store";
import type { Tour } from "@/domain/tour";
import type { Locale } from "@/i18n/config";
import { getAllDescendantCategoryIds } from "./internal";
import { resolveTour } from "./localize";
import {
  FEATURED_CATEGORY_FALLBACK,
  FEATURED_LIMIT,
  featuredConfigOf,
  featuredKeys,
  pickAutomaticFeatured,
} from "@/lib/featured";

/**
 * Read-only access to current_tours(), resolved for the requested locale.
 *
 * Every page reads current_tours() through these functions and nothing else, so moving the
 * source from TypeScript files to an API/CMS later means rewriting this file —
 * not the UI.
 */

export function getTourBySlug(slug: string, locale: Locale): Tour | undefined {
  const tour = current_tours().find((candidate) => candidate.slug === slug);
  return tour ? resolveTour(tour, locale) : undefined;
}

export function getTourSlugs(): readonly string[] {
  return current_tours().map((tour) => tour.slug);
}

/**
 * How many published tours reference each destination.
 *
 * The header search only offers places the business can actually sell, so a
 * destination with zero tours never becomes a suggestion.
 */
export function getDestinationTourCounts(): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const tour of current_tours()) {
    for (const id of tour.destinationIds)
      counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** Tours filed under `categoryId` or any of its child categories. */
export function getToursByCategoryId(
  categoryId: string,
  locale: Locale,
): readonly Tour[] {
  const ids = new Set(getAllDescendantCategoryIds(categoryId));
  return current_tours()
    .filter((tour) => tour.categoryIds.some((id) => ids.has(id)))
    .map((tour) => resolveTour(tour, locale));
}

/**
 * Home-page feature set. When the admin pins tours in
 * `landing.featured.tourIds`, exactly those tours are shown, in the chosen
 * order. The field accepts both a tour id and a slug (the Studio picker stores
 * slugs), and unknown keys are ignored.
 *
 * With no valid pin, the automatic line-up prefers the Quy Nhơn – Phú Yên
 * focus route and tops up with other regions so the section never looks thin.
 */
/**
 * Automatic home line-up for one route/region: day trips and overnight
 * programmes from that scope only. Shared with the Studio editor so its
 * preview and the public homepage use the exact same order.
 */
export function getAutomaticFeaturedTours(
  limit = FEATURED_LIMIT,
  locale: Locale,
  categoryId = FEATURED_CATEGORY_FALLBACK,
): readonly Tour[] {
  const ids = new Set(getAllDescendantCategoryIds(categoryId));
  const chosen = pickAutomaticFeatured(current_tours(), ids, limit);
  return chosen.map((tour) => resolveTour(tour, locale));
}

function featuredConfig() {
  try {
    return featuredConfigOf(landingSections().featured);
  } catch {
    return featuredConfigOf(null);
  }
}

/**
 * Home-page feature set. The active scope is read from `landing.featured`:
 * a manual scope shows exactly the pinned tours in the chosen order (unknown
 * keys are ignored, falling back to automatic when every pin is gone); an
 * automatic scope follows the route picked by the owner.
 */
export function getFeaturedTours(
  limit = FEATURED_LIMIT,
  locale: Locale,
): readonly Tour[] {
  const config = featuredConfig();
  const categoryId =
    getCategoryIdOrFallback(config.categoryId);
  const scope = config.scopes[categoryId] ?? {
    mode: "auto" as const,
    tourIds: [] as string[],
  };

  if (scope.mode === "manual") {
    const keys = featuredKeys(scope.tourIds);
    if (keys.length > 0) {
      const all = current_tours();
      const byKey = new Map<string, (typeof all)[number]>();
      for (const tour of all) {
        byKey.set(tour.id, tour);
        byKey.set(tour.slug, tour);
      }
      const pinned = keys.flatMap((key) => {
        const tour = byKey.get(key);
        return tour ? [tour] : [];
      });
      if (pinned.length > 0)
        return pinned.slice(0, limit).map((tour) => resolveTour(tour, locale));
    }
  }

  return getAutomaticFeaturedTours(limit, locale, categoryId);
}

/** A deleted/renamed scope should not blank the homepage. */
function getCategoryIdOrFallback(categoryId: string): string {
  try {
    const categories = published<{ id: string }>("categories", []);
    if (categories.length === 0) return categoryId;
    return categories.some((category) => category.id === categoryId)
      ? categoryId
      : FEATURED_CATEGORY_FALLBACK;
  } catch {
    return categoryId;
  }
}

/**
 * Related current_tours(): same category first, then anything sharing a destination.
 * Returns `limit` items and never includes the tour itself.
 */
export function getRelatedTours(
  slug: string,
  limit = 3,
  locale: Locale,
): readonly Tour[] {
  const tour = current_tours().find((candidate) => candidate.slug === slug);
  if (!tour) return [];

  const categoryIds = new Set(tour.categoryIds);
  const destinationIds = new Set(tour.destinationIds);

  const scored = current_tours()
    .filter((candidate) => candidate.slug !== tour.slug)
    .map((candidate) => {
      let score = 0;
      for (const id of candidate.categoryIds)
        if (categoryIds.has(id)) score += 3;
      for (const id of candidate.destinationIds)
        if (destinationIds.has(id)) score += 2;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const chosen =
    scored.length >= limit
      ? scored.slice(0, limit).map((entry) => entry.candidate)
      : [
          ...scored.map((entry) => entry.candidate),
          ...current_tours().filter(
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
  for (const tour of current_tours())
    for (const tag of resolveTour(tour, locale).tags) tags.add(tag);
  return [...tags].sort((a, b) =>
    a.localeCompare(b, locale === "vi" ? "vi" : "en"),
  );
}
