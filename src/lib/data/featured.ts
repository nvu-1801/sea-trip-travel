import "server-only";
import { REGION_LABELS_EN } from "@/domain/common";
import type { TourCategory } from "@/domain/category";
import type { Tour } from "@/domain/tour";
import type { Locale } from "@/i18n/config";
import {
  FEATURED_CATEGORY_FALLBACK,
  FEATURED_LIMIT,
  featuredConfigOf,
  type FeaturedConfig,
  type FeaturedScopeConfig,
} from "@/lib/featured";
import { landingSections } from "@/server/cms/store";
import { getCategoryById } from "./categories";
import { getFeaturedTours } from "./tours";

/**
 * Everything the public “Tour nổi bật” section and the Studio preview need:
 * the active route, its saved scope (mode, pins, title overrides) and the exact
 * tours the homepage will render.
 */
export type FeaturedHome = {
  config: FeaturedConfig;
  scope: FeaturedScopeConfig;
  category: TourCategory | undefined;
  categoryId: string;
  /** True when the route is the default focus route (Quy Nhơn – Phú Yên). */
  focus: boolean;
  tours: readonly Tour[];
};

export function getFeaturedHome(locale: Locale): FeaturedHome {
  let config: FeaturedConfig;
  try {
    config = featuredConfigOf(landingSections().featured);
  } catch {
    config = featuredConfigOf(null);
  }
  const resolved = getCategoryById(config.categoryId, locale);
  const categoryId = resolved ? config.categoryId : FEATURED_CATEGORY_FALLBACK;
  const category = resolved ?? getCategoryById(categoryId, locale);
  const scope = config.scopes[categoryId] ?? {
    mode: "auto" as const,
    tourIds: [] as string[],
  };
  return {
    config,
    scope,
    category,
    categoryId,
    focus: categoryId === FEATURED_CATEGORY_FALLBACK,
    tours: getFeaturedTours(FEATURED_LIMIT, locale),
  };
}

/** Localized heading/eyebrow copy, falling back to the route name. */
export function featuredCopy(
  section: FeaturedHome,
  locale: Locale,
  fallback: { eyebrow: string; title: string; description: string },
): { eyebrow: string; title: string; description: string } {
  const name = section.category?.name.trim() ?? "";
  // An English visitor should not read a Vietnamese route name just because
  // the CMS copy has no EN translation yet.
  const looksVietnamese = /[\u1EA0-\u1EF9ăâđêôơư]/i.test(name);
  const titleName =
    locale === "en" && looksVietnamese && section.category
      ? `${REGION_LABELS_EN[section.category.region]} tours`
      : name;
  const title =
    (locale === "en" ? section.scope.titleEn : section.scope.title)?.trim() ||
    (titleName
      ? locale === "en"
        ? `Featured ${titleName}`
        : `${titleName} nổi bật`
      : fallback.title);
  const eyebrow =
    (locale === "en" ? section.scope.eyebrowEn : section.scope.eyebrow)?.trim() ||
    (section.focus
      ? fallback.eyebrow
      : locale === "en"
        ? "Regions"
        : "Vùng miền");
  const description = section.focus
    ? fallback.description
    : section.category?.description.trim() || fallback.description;
  return { eyebrow, title, description };
}
