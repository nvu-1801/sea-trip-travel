import { tourCategories, tours } from "@/content";
import type { TourCategory } from "@/domain/category";
import type { Locale } from "@/i18n/config";
import { resolveCategory } from "./localize";

/** Read-only access to the category tree, resolved for the requested locale. */

export function getCategories(locale: Locale): readonly TourCategory[] {
  return tourCategories.map((category) => resolveCategory(category, locale));
}

export function getTopLevelCategories(locale: Locale): readonly TourCategory[] {
  return getCategories(locale)
    .filter((category) => category.parentId === null)
    .sort((a, b) => a.order - b.order);
}

export function getCategoryById(id: string, locale: Locale): TourCategory | undefined {
  const category = tourCategories.find((candidate) => candidate.id === id);
  return category ? resolveCategory(category, locale) : undefined;
}

export function getCategoryByPath(path: string, locale: Locale): TourCategory | undefined {
  const category = tourCategories.find((candidate) => candidate.path === path);
  return category ? resolveCategory(category, locale) : undefined;
}

export function getChildCategories(parentId: string, locale: Locale): readonly TourCategory[] {
  return getCategories(locale)
    .filter((category) => category.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

/**
 * The category and every descendant id.
 * A parent listing must include the tours filed under its children —
 * "Tour Quy Nhơn - Phú Yên" (parent) for example must list its two children.
 */
export function getCategoryAndDescendantIds(id: string): readonly string[] {
  const ids = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of tourCategories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return [...ids];
}

/** Breadcrumb trail from the root category down to `id`. */
export function getCategoryTrail(id: string, locale: Locale): readonly TourCategory[] {
  const trail: TourCategory[] = [];
  let current = getCategoryById(id, locale);
  let guard = 0;
  while (current && guard < 10) {
    trail.unshift(current);
    current = current.parentId ? getCategoryById(current.parentId, locale) : undefined;
    guard += 1;
  }
  return trail;
}

/** Categories that actually contain at least one tour (after descendants). */
export function getCategoryTourCount(categoryId: string): number {
  const ids = new Set(getCategoryAndDescendantIds(categoryId));
  return tours.filter((tour) => tour.categoryIds.some((id) => ids.has(id))).length;
}
