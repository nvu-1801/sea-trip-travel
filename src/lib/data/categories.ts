import { tourCategories, tours } from "@/content";
import type { TourCategory } from "@/domain/category";
import type { Region } from "@/domain/common";

/** Read-only access to the category tree. Never touches a data source directly. */

export function getCategories(): readonly TourCategory[] {
  return tourCategories;
}

export function getTopLevelCategories(): readonly TourCategory[] {
  return tourCategories
    .filter((category) => category.parentId === null)
    .sort((a, b) => a.order - b.order);
}

export function getCategoryById(id: string): TourCategory | undefined {
  return tourCategories.find((category) => category.id === id);
}

export function getCategoryByPath(path: string): TourCategory | undefined {
  return tourCategories.find((category) => category.path === path);
}

export function getChildCategories(parentId: string): readonly TourCategory[] {
  return tourCategories
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
export function getCategoryTrail(id: string): readonly TourCategory[] {
  const trail: TourCategory[] = [];
  let current = getCategoryById(id);
  let guard = 0;
  while (current && guard < 10) {
    trail.unshift(current);
    current = current.parentId ? getCategoryById(current.parentId) : undefined;
    guard += 1;
  }
  return trail;
}

/** Categories that actually contain at least one tour (after descendants). */
export function getCategoryTourCount(categoryId: string): number {
  const ids = new Set(getCategoryAndDescendantIds(categoryId));
  return tours.filter((tour) => tour.categoryIds.some((id) => ids.has(id))).length;
}

export function getCategoriesByRegion(region: Region): readonly TourCategory[] {
  return tourCategories.filter((category) => category.region === region);
}
