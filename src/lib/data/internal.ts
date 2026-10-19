import { published } from "@/server/cms/store";
import { tourCategories as seed_tourCategories } from "@/content";
const current_tourCategories = () =>
  published("categories", seed_tourCategories);

/**
 * Internal helpers for the data-access layer.
 * Kept separate so `categories.ts` can stay public-API only.
 */
export function getAllDescendantCategoryIds(rootId: string): readonly string[] {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of current_tourCategories()) {
      if (
        category.parentId &&
        ids.has(category.parentId) &&
        !ids.has(category.id)
      ) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return [...ids];
}
