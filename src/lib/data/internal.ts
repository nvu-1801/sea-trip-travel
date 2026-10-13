import { tourCategories } from "@/content";

/**
 * Internal helpers for the data-access layer.
 * Kept separate so `categories.ts` can stay public-API only.
 */
export function getAllDescendantCategoryIds(rootId: string): readonly string[] {
  const ids = new Set<string>([rootId]);
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
