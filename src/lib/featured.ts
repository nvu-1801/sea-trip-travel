/**
 * Shared model for the home “Tour nổi bật” block.
 *
 * The block can follow a route/region automatically or pin an ordered list of
 * tours. The same pure helpers run in the Studio editor and on the server, so
 * the preview, the saved configuration and the public homepage cannot drift
 * apart. No imports from `@/server` — safe on both sides.
 */

/** The focus route keeps working when a row predates the scope settings. */
export const FEATURED_CATEGORY_FALLBACK = "cat_quy_nhon_phu_yen";

/** The homepage shows at most seven cards (one wide lead + a 3×2 grid). */
export const FEATURED_LIMIT = 7;

/**
 * Older rows allowed up to eight pinned tours (the public side slices to the
 * display limit). The schema keeps accepting them so nothing is lost on read;
 * the editor asks the owner to trim instead of silently deleting.
 */
export const FEATURED_STORAGE_LIMIT = 8;

export type FeaturedMode = "auto" | "manual";

export type FeaturedScopeConfig = {
  mode: FeaturedMode;
  /** Manual list for this scope. Kept even in auto mode so switching back restores it. */
  tourIds: string[];
  title?: string;
  titleEn?: string;
  eyebrow?: string;
  eyebrowEn?: string;
};

export type FeaturedConfig = {
  /** Route/region currently published on the homepage. */
  categoryId: string;
  /** Mirror of the active scope, kept for older readers and tests. */
  mode: FeaturedMode;
  /** Mirror of the active scope's manual list. */
  tourIds: string[];
  /** Per-route configuration, so switching route never erases another list. */
  scopes: Record<string, FeaturedScopeConfig>;
};

export type FeaturedCategoryLike = {
  id: string;
  parentId: string | null;
};

type AutomaticTour = {
  slug: string;
  categoryIds: readonly string[];
  duration: { days: number };
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function modeOf(value: unknown): FeaturedMode | null {
  return value === "manual" || value === "auto" ? value : null;
}

/** Trim, drop empties, cap the length and keep the first occurrence. */
export function featuredKeys(
  value: unknown,
  limit = FEATURED_STORAGE_LIMIT,
): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const key = text(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= limit) break;
  }
  return out;
}

function scopeOf(value: unknown): FeaturedScopeConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const tourIds = featuredKeys(record.tourIds);
  const mode =
    modeOf(record.mode) ??
    (record.mode === undefined && tourIds.length > 0 ? "manual" : "auto");
  const scope: FeaturedScopeConfig = { mode, tourIds };
  const title = text(record.title);
  const titleEn = text(record.titleEn);
  const eyebrow = text(record.eyebrow);
  const eyebrowEn = text(record.eyebrowEn);
  if (title) scope.title = title;
  if (titleEn) scope.titleEn = titleEn;
  if (eyebrow) scope.eyebrow = eyebrow;
  if (eyebrowEn) scope.eyebrowEn = eyebrowEn;
  return scope;
}

/**
 * Read any stored shape (including rows written before scopes existed) into one
 * predictable config. Legacy rows only carry `tourIds`: an empty list means
 * automatic, a non-empty list means the owner had pinned those tours.
 */
export function featuredConfigOf(raw: unknown): FeaturedConfig {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const categoryId = text(record.categoryId) || FEATURED_CATEGORY_FALLBACK;
  const legacyIds = featuredKeys(record.tourIds);
  const legacyMode =
    modeOf(record.mode) ?? (legacyIds.length > 0 ? "manual" : "auto");

  const scopes: Record<string, FeaturedScopeConfig> = {};
  if (
    record.scopes &&
    typeof record.scopes === "object" &&
    !Array.isArray(record.scopes)
  ) {
    for (const [key, value] of Object.entries(
      record.scopes as Record<string, unknown>,
    )) {
      const id = text(key);
      if (!id) continue;
      const scope = scopeOf(value);
      if (scope) scopes[id] = scope;
    }
  }

  const active = scopes[categoryId] ?? {
    mode: legacyMode,
    tourIds: legacyIds,
  };
  scopes[categoryId] = active;

  return {
    categoryId,
    mode: active.mode,
    tourIds: active.tourIds,
    scopes,
  };
}

export function featuredScopeOf(
  config: FeaturedConfig,
  categoryId = config.categoryId,
): FeaturedScopeConfig {
  return config.scopes[categoryId] ?? { mode: "auto", tourIds: [] };
}

/** Save one scope and mirror it into the active fields. */
export function setFeaturedScope(
  config: FeaturedConfig,
  categoryId: string,
  scope: FeaturedScopeConfig,
): FeaturedConfig {
  return {
    categoryId,
    mode: scope.mode,
    tourIds: scope.tourIds,
    scopes: { ...config.scopes, [categoryId]: scope },
  };
}

/** Switch the published route without touching any other scope's list. */
export function activateFeaturedScope(
  config: FeaturedConfig,
  categoryId: string,
): FeaturedConfig {
  const scope = featuredScopeOf(config, categoryId);
  return setFeaturedScope(config, categoryId, scope);
}

/** The selected category and every descendant id. */
export function descendantCategoryIds(
  categories: readonly FeaturedCategoryLike[],
  rootId: string,
): string[] {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
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

/**
 * Automatic line-up: half day trips, half overnight programmes, then the rest
 * of the same scope. It never reaches into another route — if the scope only
 * has three tours, the homepage shows three.
 */
export function pickAutomaticFeatured<T extends AutomaticTour>(
  tours: readonly T[],
  scopeIds: ReadonlySet<string>,
  limit = FEATURED_LIMIT,
): T[] {
  const inScope = tours.filter((tour) =>
    tour.categoryIds.some((id) => scopeIds.has(id)),
  );
  const dayLimit = Math.ceil(limit / 2);
  const ordered = [
    ...inScope.filter((tour) => tour.duration.days === 1).slice(0, dayLimit),
    ...inScope.filter((tour) => tour.duration.days > 1).slice(0, limit - dayLimit),
    ...inScope,
  ];
  return [...new Map(ordered.map((tour) => [tour.slug, tour])).values()].slice(
    0,
    limit,
  );
}
