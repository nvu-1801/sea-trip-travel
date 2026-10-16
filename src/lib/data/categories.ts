import type { TourCategory } from "@/domain/category";
import type { Locale } from "@/i18n/config";
import type { ContentSnapshot } from "@/server/repo/types";
import { loadPublishedSnapshot, translationsFor } from "./snapshot";
import { getAllDescendantCategoryIds } from "./internal";
import { resolveCategory } from "./localize";

/** Read-only access to the category tree, resolved for the requested locale. */

async function snap(source?: ContentSnapshot): Promise<ContentSnapshot> {
  return source ?? loadPublishedSnapshot();
}

export async function getCategories(
  locale: Locale,
  source?: ContentSnapshot,
): Promise<TourCategory[]> {
  const snapshot = await snap(source);
  const translations = translationsFor(snapshot, locale);
  return snapshot.categories.map((category) => resolveCategory(category, locale, translations));
}

export async function getTopLevelCategories(
  locale: Locale,
  source?: ContentSnapshot,
): Promise<TourCategory[]> {
  return (await getCategories(locale, source))
    .filter((category) => category.parentId === null)
    .sort((a, b) => a.order - b.order);
}

export async function getCategoryById(
  id: string,
  locale: Locale,
  source?: ContentSnapshot,
): Promise<TourCategory | undefined> {
  const snapshot = await snap(source);
  const category = snapshot.categories.find((candidate) => candidate.id === id);
  return category ? resolveCategory(category, locale, translationsFor(snapshot, locale)) : undefined;
}

export async function getCategoryByPath(
  path: string,
  locale: Locale,
  source?: ContentSnapshot,
): Promise<TourCategory | undefined> {
  const snapshot = await snap(source);
  const category = snapshot.categories.find((candidate) => candidate.path === path);
  return category ? resolveCategory(category, locale, translationsFor(snapshot, locale)) : undefined;
}

export async function getChildCategories(
  parentId: string,
  locale: Locale,
  source?: ContentSnapshot,
): Promise<TourCategory[]> {
  return (await getCategories(locale, source))
    .filter((category) => category.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

/**
 * The category and every descendant id.
 * A parent listing must include the tours filed under its children —
 * "Tour Quy Nhơn - Phú Yên" (parent) for example must list its two children.
 */
export async function getCategoryAndDescendantIds(
  id: string,
  source?: ContentSnapshot,
): Promise<string[]> {
  const snapshot = await snap(source);
  return [...getAllDescendantCategoryIds(snapshot.categories, id)];
}

/** Breadcrumb trail from the root category down to `id`. */
export async function getCategoryTrail(
  id: string,
  locale: Locale,
  source?: ContentSnapshot,
): Promise<TourCategory[]> {
  const categories = await getCategories(locale, source);
  const trail: TourCategory[] = [];
  let current = categories.find((category) => category.id === id);
  let guard = 0;
  while (current && guard < 10) {
    trail.unshift(current);
    const parentId = current.parentId;
    current = parentId ? categories.find((category) => category.id === parentId) : undefined;
    guard += 1;
  }
  return trail;
}

/** Number of published tours in `categoryId` (including descendants). */
export async function getCategoryTourCount(
  categoryId: string,
  source?: ContentSnapshot,
): Promise<number> {
  const snapshot = await snap(source);
  const ids = new Set(getAllDescendantCategoryIds(snapshot.categories, categoryId));
  return snapshot.tours.filter((tour) => tour.categoryIds.some((id) => ids.has(id))).length;
}
