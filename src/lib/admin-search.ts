import { searchKey } from "./search";

/**
 * Pure helpers behind the Studio quick search (header palette).
 *
 * The API returns a compact index — id, title, subtitle and a pre-folded
 * `haystack` — so the palette can filter locally while typing without shipping
 * itineraries or article bodies to the browser. Ranking lives here so the
 * behaviour is unit-tested, not buried in JSX.
 */

export type AdminSearchKind =
  | "tours"
  | "articles"
  | "destinations"
  | "categories";

export type AdminSearchStatus = "published" | "draft" | "unknown";

export type AdminSearchItem = {
  kind: AdminSearchKind;
  id: string;
  slug?: string;
  title: string;
  subtitle: string;
  status: AdminSearchStatus;
  /** Accent-folded title + slug + subtitle + aliases. */
  haystack: string;
};

export type RankedAdminSearchItem = AdminSearchItem & {
  /** Lower is a better match; 0 is an exact title match. */
  score: number;
};

export type AdminSearchGroup = {
  kind: AdminSearchKind;
  items: RankedAdminSearchItem[];
};

const GROUP_ORDER: readonly AdminSearchKind[] = [
  "tours",
  "articles",
  "destinations",
  "categories",
];

export function buildAdminSearchItem(input: {
  kind: AdminSearchKind;
  id: string;
  slug?: string;
  title: string;
  subtitle?: string;
  status?: string;
  aliases?: readonly (string | undefined | null)[];
}): AdminSearchItem {
  const title = input.title.trim() || input.id;
  const subtitle = (input.subtitle ?? "").trim();
  const status: AdminSearchStatus =
    input.status === "published" || input.status === "draft"
      ? input.status
      : "unknown";
  const haystack = [
    title,
    input.slug ?? "",
    subtitle,
    ...(input.aliases ?? []),
  ]
    .filter(Boolean)
    .map((value) => searchKey(String(value)))
    .join(" ");

  return {
    kind: input.kind,
    id: input.id,
    ...(input.slug ? { slug: input.slug } : {}),
    title,
    subtitle,
    status,
    haystack,
  };
}

/** Prefix at a word boundary, e.g. "sa" matches "Sa Pa" and "Vịnh Sa". */
function hasWordPrefix(haystack: string, query: string): boolean {
  if (haystack.startsWith(query)) return true;
  for (let index = haystack.indexOf(" "); index !== -1; index = haystack.indexOf(" ", index + 1)) {
    if (haystack.startsWith(query, index + 1)) return true;
  }
  return false;
}

/** "sa pa" -> "sapa", so typing without spaces still matches. */
function compact(value: string): string {
  return value.replace(/\s+/g, "");
}

function scoreItem(item: AdminSearchItem, query: string): number | null {
  const title = searchKey(item.title);
  const slug = searchKey(item.slug ?? "");
  const subtitle = searchKey(item.subtitle);
  const compactQuery = compact(query);
  const titleCompact = compact(title);
  const slugCompact = compact(slug);
  const subtitleCompact = compact(subtitle);
  const haystackCompact = compact(item.haystack);

  if (title === query || titleCompact === compactQuery) return 0;
  if (title.startsWith(query) || titleCompact.startsWith(compactQuery)) return 1;
  if (hasWordPrefix(title, query)) return 2;
  if (title.includes(query) || titleCompact.includes(compactQuery)) return 3;
  if (slug.includes(query) || slugCompact.includes(compactQuery)) return 4;
  if (subtitle.includes(query) || subtitleCompact.includes(compactQuery))
    return 5;
  if (item.haystack.includes(query) || haystackCompact.includes(compactQuery))
    return 6;
  return null;
}

/**
 * Filter + rank the index for a query. An empty query returns no records: the
 * palette shows navigation and hints instead of the whole catalogue.
 */
export function rankAdminSearch(
  items: readonly AdminSearchItem[],
  query: string,
  options: { perGroup?: number; total?: number } = {},
): AdminSearchGroup[] {
  const needle = searchKey(query.trim());
  if (!needle) return [];
  const perGroup = options.perGroup ?? 6;
  const total = options.total ?? 24;

  const ranked: RankedAdminSearchItem[] = [];
  for (const item of items) {
    const score = scoreItem(item, needle);
    if (score !== null) ranked.push({ ...item, score });
  }
  ranked.sort(
    (a, b) =>
      a.score - b.score ||
      a.title.localeCompare(b.title, "vi") ||
      a.id.localeCompare(b.id),
  );

  const groups: AdminSearchGroup[] = [];
  let count = 0;
  for (const kind of GROUP_ORDER) {
    const groupItems = ranked
      .filter((item) => item.kind === kind)
      .slice(0, perGroup);
    if (!groupItems.length) continue;
    const room = total - count;
    if (room <= 0) break;
    const limited = groupItems.slice(0, room);
    groups.push({ kind, items: limited });
    count += limited.length;
  }
  return groups;
}

export const ADMIN_SEARCH_GROUP_LABELS: Record<AdminSearchKind, string> = {
  tours: "Tour du lịch",
  articles: "Cẩm nang",
  destinations: "Điểm đến",
  categories: "Danh mục",
};
