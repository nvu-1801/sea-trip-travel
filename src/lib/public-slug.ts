import { slugify } from "./slugify";

/**
 * Slugs the Studio used to invent for every new record (`noi-dung-1697cdc7`).
 *
 * They are placeholders, not editorial decisions, so they are the one kind of
 * slug the CMS is still allowed to rewrite — and the repair migration uses this
 * test to find rows that were created before readable slugs existed.
 */
const PLACEHOLDER_SLUG = /^noi-dung(?:-[a-z0-9]+)?$/;

/** Titles that mean "the owner has not named this record yet". */
const UNNAMED_TITLES = new Set([
  "nội dung mới",
  "noi dung moi",
  "chưa đặt tên",
  "chua dat ten",
  "tour mới",
  "tour moi",
  "bài viết mới",
  "bai viet moi",
]);

export function isPlaceholderSlug(value: unknown): boolean {
  return typeof value === "string" && PLACEHOLDER_SLUG.test(value);
}

/**
 * URL-safe slug for articles, categories and destinations.
 * Returns "" when the title is still the generic "Nội dung mới" placeholder,
 * so callers keep the temporary slug instead of creating `noi-dung-moi` clones.
 */
export function slugFromTitle(title: unknown, maxLength = 80): string {
  const text = typeof title === "string" ? title.trim() : "";
  if (!text || UNNAMED_TITLES.has(text.toLowerCase())) return "";
  return slugify(text, maxLength);
}

/**
 * Tour slugs read like the programme they sell:
 * "Tour Ninh Bình – Tràng An 2N1Đ" → "ninh-binh-trang-an-2-ngay-1-dem".
 *
 * The leading "Tour" is redundant inside `/tour/`, and the 2N1Đ shorthand is
 * expanded because customers and search engines read "2 ngày 1 đêm" far better
 * than "2n1d".
 */
export function tourSlugFromTitle(title: unknown, maxLength = 80): string {
  const text = typeof title === "string" ? title.trim() : "";
  if (!text || UNNAMED_TITLES.has(text.toLowerCase())) return "";
  const expanded = text
    .replace(/(\d+)\s*n\s*(\d+)\s*[đd]/gi, "$1 ngày $2 đêm")
    .replace(/^\s*(?:tour|chương trình tour)\s+/i, "");
  return slugify(expanded, maxLength);
}

/**
 * First free slug: `base`, then `base-2`, `base-3`… so two tours with the same
 * name never fight over one URL.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  if (!base) return "";
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}
