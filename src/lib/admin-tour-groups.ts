/**
 * Pure helpers for the admin tour list: duration/line grouping, trash
 * countdown and price labels. No DB, no DOM — fully unit-testable.
 */

export const TRASH_RETENTION_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export const QNPY_ROOT_CATEGORY_ID = "cat_quy_nhon_phu_yen";

/** Fallback when the CMS category tree cannot be loaded. */
const QNPY_FALLBACK_IDS = new Set([
  "cat_quy_nhon_phu_yen",
  "cat_quy_nhon_1_ngay",
  "cat_quy_nhon_dai_ngay",
]);

export type DurationGroup = "1day" | "multi" | "unknown";
export type LineGroup = "qnpy" | "domestic" | "unknown";

type CategoryRow = { id: string; parentId?: string | null };

/** All ids under the Quy Nhơn – Phú Yên root (root included). */
export function qnpyCategoryIds(
  categories: readonly CategoryRow[],
): Set<string> {
  if (categories.length === 0) return new Set(QNPY_FALLBACK_IDS);
  const byParent = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const list = byParent.get(category.parentId) ?? [];
    list.push(category.id);
    byParent.set(category.parentId, list);
  }
  const ids = new Set<string>([QNPY_ROOT_CATEGORY_ID]);
  const queue = [QNPY_ROOT_CATEGORY_ID];
  while (queue.length > 0) {
    const current = queue.pop() as string;
    for (const child of byParent.get(current) ?? []) {
      if (!ids.has(child)) {
        ids.add(child);
        queue.push(child);
      }
    }
  }
  return ids.size > 1 ? ids : new Set(QNPY_FALLBACK_IDS);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** "1day" when duration.days is exactly 1, "multi" when > 1. */
export function durationGroupOf(data: unknown): DurationGroup {
  const duration = asRecord(asRecord(data).duration);
  const days = duration.days;
  if (typeof days !== "number" || !Number.isFinite(days) || days < 1)
    return "unknown";
  return days === 1 ? "1day" : "multi";
}

/** "qnpy" when any categoryId belongs to the Quy Nhơn – Phú Yên tree. */
export function lineGroupOf(
  data: unknown,
  qnpyIds: ReadonlySet<string>,
): LineGroup {
  const ids = asStringArray(asRecord(data).categoryIds);
  if (ids.length === 0) return "unknown";
  return ids.some((id) => qnpyIds.has(id)) ? "qnpy" : "domestic";
}

/**
 * Days left before a trashed row is auto-deleted, counted from the row's
 * `updated_at` (the delete action stamps it). Null when not applicable.
 */
export function trashDaysLeft(
  updatedAt: string,
  nowMs: number = Date.now(),
  retentionDays: number = TRASH_RETENTION_DAYS,
): number | null {
  const deletedAt = new Date(updatedAt).getTime();
  if (!Number.isFinite(deletedAt)) return null;
  const elapsedDays = Math.floor((nowMs - deletedAt) / DAY_MS);
  const left = retentionDays - elapsedDays;
  return left < 0 ? 0 : left;
}

/** "2.290.000 ₫" for {amount} or null when there is no price. */
export function priceLabelOf(data: unknown): string | null {
  const amount = asRecord(asRecord(data).priceFrom).amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)
    return null;
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

/** "3N2Đ" style badge, null when days is missing. */
export function durationBadgeOf(data: unknown): string | null {
  const duration = asRecord(asRecord(data).duration);
  const days = duration.days;
  const nights = duration.nights;
  if (typeof days !== "number" || !Number.isFinite(days) || days < 1)
    return null;
  if (typeof nights === "number" && Number.isFinite(nights) && nights >= 0)
    return `${days}N${nights}Đ`;
  return `${days} ngày`;
}

/** First tour image src, if any. */
export function coverSrcOf(data: unknown): string | null {
  const images = asRecord(data).images;
  if (!Array.isArray(images) || images.length === 0) return null;
  const src = asRecord(images[0]).src;
  return typeof src === "string" && src.startsWith("/") ? src : null;
}

/** Cover src for articles (`cover.src`) or tours (`images[0].src`). */
export function articleCoverSrcOf(data: unknown): string | null {
  const cover = asRecord(asRecord(data).cover).src;
  if (typeof cover === "string" && cover.startsWith("/")) return cover;
  return coverSrcOf(data);
}

/** Short text helpers shared by admin cards (defensive, unit-testable). */
export function articleExcerptOf(data: unknown): string {
  const record = asRecord(data);
  for (const key of ["excerpt", "summary", "description"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  const slug = record.slug;
  if (typeof slug === "string" && slug) return `/${slug}`;
  const id = record.id;
  return typeof id === "string" ? id : "";
}

export function articleTagsOf(data: unknown): string[] {
  return asStringArray(asRecord(data).tags).slice(0, 3);
}

/** Auto-delete timestamp (ms) for a trashed row, null when not applicable. */
export function trashDeleteAtMs(
  updatedAt: string,
  retentionDays: number = TRASH_RETENTION_DAYS,
): number | null {
  const deletedAt = new Date(updatedAt).getTime();
  if (!Number.isFinite(deletedAt)) return null;
  return deletedAt + retentionDays * DAY_MS;
}

/** 0..1 progress of the retention window (1 = about to be auto-deleted). */
export function trashElapsedRatio(
  updatedAt: string,
  nowMs: number = Date.now(),
  retentionDays: number = TRASH_RETENTION_DAYS,
): number | null {
  const deletedAt = new Date(updatedAt).getTime();
  if (!Number.isFinite(deletedAt)) return null;
  const total = retentionDays * DAY_MS;
  const elapsed = nowMs - deletedAt;
  if (elapsed <= 0) return 0;
  if (elapsed >= total) return 1;
  return elapsed / total;
}
