/**
 * Search normalisation (pure, no server imports).
 *
 * Vietnamese visitors type either "Quy Nhon" or "Quy Nhơn" and expect the same
 * result, so every searchable string is folded to ASCII before comparison:
 *   - NFD decomposition + stripping combining marks
 *   - `đ/Đ` handled explicitly (NFD does not decompose them)
 *   - lower-cased, punctuation collapsed to single spaces
 */

export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True when every token of `query` appears in `haystack` (already normalised). */
export function matchesNormalized(haystack: string, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}
