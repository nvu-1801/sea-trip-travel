/**
 * URL-safe slug from Vietnamese copy. Used by the Studio for new records:
 * "Tour Quy Nhơn – Phú Yên 4N3Đ" → "tour-quy-nhon-phu-yen-4n3d".
 */
export function slugify(input: string, maxLength = 80): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}
