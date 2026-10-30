import "server-only";
import { z } from "zod";
import { articles, destinations, tourCategories, tours } from "@/content";
import { tourRecordSchema } from "@/domain/tour-cms";
import { collectTourBusinessIssues } from "@/domain/tour-rules";
import { defaultThemeRecord, themeRecordSchema } from "@/domain/theme";
import { travelArticleSchema } from "@/domain/article";
import {
  destinationSchema,
  MAX_HOME_DESTINATIONS,
} from "@/domain/destination";
import { tourCategorySchema } from "@/domain/category";
import {
  db,
  audit,
  transaction,
  migrationApplied,
  markMigration,
  type AuditContext,
} from "./db";
import { homeRegionsInputSchema } from "@/domain/home-regions";
import { ROUTES } from "@/config/navigation";
import { AUDIT_FIELD_LABELS } from "@/lib/audit-activity";
import {
  isPlaceholderSlug,
  slugFromTitle,
  tourSlugFromTitle,
  uniqueSlug,
} from "@/lib/public-slug";
import { defaultHero, heroSchema } from "@/domain/home-hero";
import { defaultLanding, landingSchema } from "@/domain/landing";
import { CUSTOMER_STORIES_DEMO } from "@/features/home/customer-stories-demo";
import {
  defaultSettings,
  messageSeeds,
  messagesSchema,
  settingsSchema,
} from "./settings";

/** Chuẩn hoá SĐT Việt Nam về dạng tel:+84... để nút gọi/Zalo luôn đúng. */
export function normalizeHotlineHref(hotline: string): string {
  const digits = hotline.replace(/\D/g, "");
  let normalized = digits;
  if (normalized.startsWith("84") && normalized.length >= 11) {
    normalized = normalized;
  } else if (normalized.startsWith("0") && normalized.length >= 9) {
    normalized = `84${normalized.slice(1)}`;
  } else if (normalized.length >= 9 && !normalized.startsWith("84")) {
    normalized = `84${normalized.replace(/^0+/, "")}`;
  }
  if (!/^\d{9,12}$/.test(normalized)) return "tel:+84969297064";
  return `tel:+${normalized}`;
}

const translatedArticle = z.object({
  title: travelArticleSchema.shape.title.optional(),
  excerpt: travelArticleSchema.shape.excerpt.optional(),
  body: travelArticleSchema.shape.body.removeDefault().optional(),
  tags: travelArticleSchema.shape.tags.removeDefault().optional(),
  seo: travelArticleSchema.shape.seo,
});
export const schemas = {
  tours: tourRecordSchema,
  articles: travelArticleSchema.extend({
    _en: translatedArticle.optional(),
    _enReviewed: z.boolean().optional(),
  }),
  categories: tourCategorySchema.extend({
    _en: tourCategorySchema
      .pick({ name: true, description: true, tagline: true, seo: true })
      .partial()
      .optional(),
    _enReviewed: z.boolean().optional(),
  }),
  destinations: destinationSchema.extend({
    _en: destinationSchema
      .pick({ name: true, summary: true, province: true })
      .partial()
      .optional(),
    _enReviewed: z.boolean().optional(),
  }),
  settings: settingsSchema,
  theme: themeRecordSchema,
  hero: heroSchema,
  landing: landingSchema,
  messages: messagesSchema,
};
export type Collection = keyof typeof schemas;
const seeds = {
  tours,
  articles,
  categories: tourCategories,
  destinations,
  settings: [defaultSettings],
  theme: [defaultThemeRecord],
  hero: [defaultHero],
  landing: [defaultLanding],
  messages: messageSeeds,
};
export type CmsRecord = {
  collection: Collection;
  id: string;
  data: Record<string, unknown>;
  state: string;
  revision: number;
  updated_at: string;
};
const hasHomeFields = (data: Record<string, unknown>) =>
  typeof data.showOnHome === "boolean" &&
  typeof data.homeOrder === "number";

/**
 * Databases created before the explicit home switch existed have no
 * `showOnHome`. Backfill it once so an upgrade keeps exactly the cards the old
 * implicit rule produced (Quy Nhơn – Phú Yên, has a photo, first three by
 * `order`) instead of emptying the "Khám phá" block.
 */
function backfillDestinationHomeFlags() {
  const rows = db()
    .prepare(
      "SELECT id,data,published,state FROM records WHERE collection='destinations'",
    )
    .all() as {
    id: string;
    data: string;
    published: string | null;
    state: string;
  }[];
  const parsed = rows.map((row) => ({
    ...row,
    data: JSON.parse(row.data) as Record<string, unknown>,
  }));
  const missing = parsed.filter((row) => !hasHomeFields(row.data));
  if (!missing.length) return;

  const enabled = parsed.filter(
    (row) => row.state !== "deleted" && row.data.showOnHome === true,
  );
  let nextOrder = Math.max(
    0,
    ...enabled.map((row) => Number(row.data.homeOrder ?? 0)),
  );
  const candidates = missing
    .filter(
      (row) =>
        row.state !== "deleted" &&
        row.data.showOnHome !== true &&
        row.data.region === "quy-nhon-phu-yen" &&
        Boolean((row.data.image as { src?: string } | undefined)?.src),
    )
    .sort(
      (a, b) =>
        Number(a.data.order ?? 0) - Number(b.data.order ?? 0) ||
        a.id.localeCompare(b.id),
    );

  const assignments = new Map<string, number>();
  for (const row of candidates) {
    if (enabled.length >= MAX_HOME_DESTINATIONS) break;
    enabled.push(row);
    nextOrder += 1;
    assignments.set(row.id, nextOrder);
  }

  const update = db().prepare(
    "UPDATE records SET data=?, published=? WHERE collection='destinations' AND id=?",
  );
  for (const row of missing) {
    const homeOrder = assignments.get(row.id);
    const showOnHome = homeOrder !== undefined;
    const data = {
      ...row.data,
      showOnHome,
      homeOrder: showOnHome
        ? homeOrder
        : Number(row.data.homeOrder ?? 0),
    };
    const published = row.published
      ? JSON.stringify({
          ...(JSON.parse(row.published) as Record<string, unknown>),
          showOnHome: data.showOnHome,
          homeOrder: data.homeOrder,
        })
      : null;
    update.run(JSON.stringify(data), published, row.id);
  }
}

type StoredImage = {
  src?: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
};

/**
 * A CMS row outlives the content file it was seeded from: `seed()` inserts with
 * `INSERT OR IGNORE`, so photos added to the TypeScript content later never
 * reached rows created before them. Tour records written while the media was
 * still a placeholder therefore kept `images: [{ alt }]` with no `src`, and the
 * tour detail page rendered the branded gradient instead of the real photo.
 *
 * Fill those missing sources from the current content (alt first, then the same
 * position, then the next unused photo) and append photos the stale row never
 * had. Rows where every image already has a `src` are left untouched, so an
 * editor's own media choice is never overwritten.
 */
export function fillTourImageSources(): number {
  const sourceById = new Map(
    tours.map((tour) => [
      tour.id,
      (tour.images ?? []).filter((image) => Boolean(image.src)),
    ]),
  );
  const rows = db()
    .prepare(
      "SELECT id,data,published FROM records WHERE collection='tours' AND state!='deleted'",
    )
    .all() as { id: string; data: string; published: string | null }[];

  const update = db().prepare(
    "UPDATE records SET data=?, published=? WHERE collection='tours' AND id=?",
  );

  let repaired = 0;
  for (const row of rows) {
    const source = sourceById.get(row.id);
    if (!source?.length) continue;

    const data = JSON.parse(row.data) as { images?: StoredImage[] };
    const published = row.published
      ? (JSON.parse(row.published) as { images?: StoredImage[] })
      : null;
    const current = published?.images ?? data.images ?? [];
    if (!current.some((image) => !image.src)) continue;

    const used = new Set(
      current
        .map((image) => image.src)
        .filter((src): src is string => Boolean(src)),
    );
    const merged: StoredImage[] = [];
    for (const [index, image] of current.entries()) {
      if (image.src) {
        merged.push(image);
        continue;
      }
      const match =
        source.find(
          (candidate) =>
            candidate.src &&
            candidate.alt === image.alt &&
            !used.has(candidate.src),
        ) ??
        source.find(
          (candidate, at) =>
            at === index && candidate.src && !used.has(candidate.src),
        ) ??
        source.find(
          (candidate) => candidate.src && !used.has(candidate.src),
        );
      if (!match?.src) continue;
      used.add(match.src);
      merged.push({
        ...match,
        alt: image.alt || match.alt,
        ...(image.caption ? { caption: image.caption } : {}),
      });
    }
    // Append photos the stale record never had, so a content refresh also
    // reaches tours whose media list was shorter than the source.
    for (const image of source)
      if (image.src && !used.has(image.src)) {
        merged.push(image);
        used.add(image.src);
      }
    if (merged.length === 0) continue;

    data.images = merged;
    if (published) published.images = merged;
    update.run(
      JSON.stringify(data),
      published ? JSON.stringify(published) : null,
      row.id,
    );
    repaired += 1;
  }
  return repaired;
}

/**
 * Settings rows seeded before the SEO fields existed have no `seo` object.
 * Public metadata merges defaults at read time, but the Studio form reads the
 * stored row — without this the owner would never see the new fields. Fill the
 * defaults once, preserving any values already saved.
 */
export function backfillSettingsSeo(): number {
  const rows = db()
    .prepare("SELECT id,data,published FROM records WHERE collection='settings'")
    .all() as { id: string; data: string; published: string | null }[];
  const update = db().prepare(
    "UPDATE records SET data=?, published=? WHERE collection='settings' AND id=?",
  );
  const hasSeo = (value: unknown) => {
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    return Object.keys(defaultSettings.seo).every(
      (key) =>
        typeof record[key] === "string" &&
        (record[key] as string).trim().length > 0,
    );
  };
  const mergeSeo = (value: unknown) => ({
    ...defaultSettings.seo,
    ...(value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {}),
  });

  let repaired = 0;
  for (const row of rows) {
    const data = JSON.parse(row.data) as Record<string, unknown>;
    const published = row.published
      ? (JSON.parse(row.published) as Record<string, unknown>)
      : null;
    const dataNeeds = !hasSeo(data.seo);
    const publishedNeeds = published ? !hasSeo(published.seo) : false;
    if (!dataNeeds && !publishedNeeds) continue;
    if (dataNeeds) data.seo = mergeSeo(data.seo);
    if (published && publishedNeeds) published.seo = mergeSeo(published.seo);
    update.run(
      JSON.stringify(data),
      published ? JSON.stringify(published) : null,
      row.id,
    );
    repaired += 1;
  }
  return repaired;
}

type SinglePhotoKey = "image" | "cover";

/** The photo the content files currently ship for one category/article row. */
function seedSinglePhoto(
  collection: "categories" | "articles",
  id: string,
): { key: SinglePhotoKey; src: string; alt: string } | undefined {
  if (collection === "categories") {
    const image = tourCategories.find((item) => item.id === id)?.image;
    return image?.src ? { key: "image", src: image.src, alt: image.alt } : undefined;
  }
  const cover = articles.find((item) => item.id === id)?.cover;
  return cover?.src ? { key: "cover", src: cover.src, alt: cover.alt } : undefined;
}

/**
 * Fill a missing photo address, creating the photo object for early records
 * that omitted it. Existing alt, caption, focal points and every other field
 * stay as stored, and a photo the editor picked is never replaced.
 */
function fillMissingPhotoSource(
  payload: Record<string, unknown> | null,
  key: SinglePhotoKey,
  src: string,
  alt: string,
): boolean {
  if (!payload) return false;
  const raw = payload[key];
  // Early category records omitted the optional image object entirely.
  if (raw === undefined || raw === null) {
    payload[key] = { src, alt };
    return true;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return false;
  const photo = raw as { src?: unknown };
  // `undefined`, `null` and "" all mean "no photo" in the older rows.
  if (photo.src) return false;
  photo.src = src;
  return true;
}

/**
 * Categories (`image.src`) and articles (`cover.src`) render a branded gradient
 * whenever the stored photo has no address, which is what production showed on
 * the region cards and guide covers: those rows were seeded before the content
 * files carried their photos, and `seed()` inserts with `INSERT OR IGNORE`, so
 * a later deploy never touched them.
 *
 * This repair copies missing photos/addresses from the content files into both
 * `data` (draft) and `published` (what the site reads). Rows that already point
 * at a photo — an upload or a library pick by the owner — are left untouched,
 * and trashed rows are skipped so nothing the owner discarded is rewritten, so
 * the function is safe to run more than once.
 */
export function fillMissingMediaSources(): number {
  const rows = db()
    .prepare(
      "SELECT collection,id,data,published FROM records WHERE collection IN ('categories','articles') AND state!='deleted'",
    )
    .all() as {
    collection: "categories" | "articles";
    id: string;
    data: string;
    published: string | null;
  }[];
  const update = db().prepare(
    "UPDATE records SET data=?,published=? WHERE collection=? AND id=?",
  );

  let repaired = 0;
  for (const row of rows) {
    const photo = seedSinglePhoto(row.collection, row.id);
    if (!photo) continue;
    const data = JSON.parse(row.data) as Record<string, unknown>;
    const live = row.published
      ? (JSON.parse(row.published) as Record<string, unknown>)
      : null;
    // Evaluate both before deciding: `||` would skip the published payload.
    const filledDraft = fillMissingPhotoSource(data, photo.key, photo.src, photo.alt);
    const filledLive = fillMissingPhotoSource(live, photo.key, photo.src, photo.alt);
    if (!filledDraft && !filledLive) continue;
    update.run(
      JSON.stringify(data),
      live ? JSON.stringify(live) : null,
      row.collection,
      row.id,
    );
    repaired += 1;
  }
  return repaired;
}

/**
 * Id of the one-time media repair. Add a new id when the content files gain
 * photos for rows that already exist, so the new photos reach an older volume.
 */
export const MEDIA_SOURCE_MIGRATION = "media-sources/categories-articles:v2";

/**
 * One-time repair for rows created while the Studio wrote `noi-dung-<random>`
 * slugs. Each row gets a readable slug derived from its title, the published
 * snapshot is rewritten, references (articles, home pins) follow, and the old
 * URL is kept alive as a permanent redirect.
 */
export const PUBLIC_SLUG_MIGRATION = "slug/readable:v1";

/**
 * The owner picked the Phú Yên school film as the lead card in the customer
 * carousel. Existing volumes keep their own order, so move that one card to
 * the front once; later owner reordering is left alone.
 */
export const CUSTOMER_VIDEO_FIRST_MIGRATION = "customers/video-first:v1";
const CUSTOMER_VIDEO_FIRST_ID = "demo-video-phu-yen-ngo-le-tan";

function moveCustomerVideoFirst(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const customers = (payload as { customers?: unknown }).customers;
  if (!customers || typeof customers !== "object") return false;
  const videos = (customers as { videos?: unknown }).videos;
  if (!Array.isArray(videos)) return false;
  const index = videos.findIndex(
    (video) =>
      video &&
      typeof video === "object" &&
      (video as { id?: unknown }).id === CUSTOMER_VIDEO_FIRST_ID,
  );
  if (index <= 0) return false;
  const [video] = videos.splice(index, 1);
  videos.unshift(video);
  return true;
}

/**
 * The owner asked to publish the verified 10-logo / 6-video sample on the
 * live customer section. Only an empty list is filled; any owner-entered
 * logo, video or copy is left alone.
 */
export const CUSTOMER_SAMPLE_DATA_MIGRATION = "customers/sample-data:v1";

function fillCustomerSampleData(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const customers = (payload as { customers?: unknown }).customers;
  if (!customers || typeof customers !== "object") return false;
  const section = customers as Record<string, unknown>;
  let changed = false;
  if (!Array.isArray(section.logos) || section.logos.length === 0) {
    section.logos = CUSTOMER_STORIES_DEMO.logos;
    changed = true;
  }
  if (!Array.isArray(section.videos) || section.videos.length === 0) {
    section.videos = CUSTOMER_STORIES_DEMO.videos;
    changed = true;
  }
  if (!changed) return false;
  section.enabled = true;
  section.showLogos = true;
  section.showVideos = true;
  moveCustomerVideoFirst(payload);
  return true;
}

function repairLandingRows(
  repair: (payload: unknown) => boolean,
): number {
  const rows = db()
    .prepare(
      "SELECT id,data,published FROM records WHERE collection='landing' AND state!='deleted'",
    )
    .all() as { id: string; data: string; published: string | null }[];
  let repaired = 0;
  for (const row of rows) {
    const data = JSON.parse(row.data) as unknown;
    const published = row.published
      ? (JSON.parse(row.published) as unknown)
      : null;
    const dataChanged = repair(data);
    const publishedChanged = published ? repair(published) : false;
    if (!dataChanged && !publishedChanged) continue;
    db()
      .prepare(
        "UPDATE records SET data=?,published=?,revision=revision+1,updated_at=? WHERE collection='landing' AND id=?",
      )
      .run(
        JSON.stringify(data),
        published ? JSON.stringify(published) : null,
        new Date().toISOString(),
        row.id,
      );
    repaired += 1;
  }
  return repaired;
}

function reorderCustomerVideos(): number {
  return repairLandingRows(moveCustomerVideoFirst);
}

function seedCustomerSampleData(): number {
  return repairLandingRows(fillCustomerSampleData);
}

export function repairPlaceholderSlugs(): number {
  const now = new Date().toISOString();
  const renames = new Map<string, string>();
  let repaired = 0;
  const update = db().prepare(
    "UPDATE records SET data=?, published=?, revision=revision+1, updated_at=? WHERE collection=? AND id=?",
  );
  for (const collection of PUBLIC_SLUG_COLLECTIONS) {
    const rows = db()
      .prepare(
        "SELECT id,data,published,state FROM records WHERE collection=?",
      )
      .all(collection) as {
      id: string;
      data: string;
      published: string | null;
      state: string;
    }[];
    const entries = rows.map((row) => ({
      row,
      data: JSON.parse(row.data) as Record<string, unknown>,
      published: row.published
        ? (JSON.parse(row.published) as Record<string, unknown>)
        : null,
    }));
    const taken = new Set(
      entries
        .filter((entry) => entry.row.state !== "deleted")
        .map((entry) => String(entry.data.slug ?? ""))
        .filter(Boolean),
    );
    for (const entry of entries) {
      const oldSlug = String(entry.data.slug ?? "");
      if (!isPlaceholderSlug(oldSlug)) continue;
      const base = slugBaseFor(collection, slugTitleOf(collection, entry.data));
      if (!base) continue;
      taken.delete(oldSlug);
      const newSlug = uniqueSlug(base, taken);
      taken.add(newSlug);
      const oldPath = publicPathFor(collection, entry.data);
      entry.data.slug = newSlug;
      if (entry.published) entry.published.slug = newSlug;
      if (
        collection === "categories" &&
        entry.data.path === `/danh-muc/${oldSlug}`
      ) {
        entry.data.path = `/danh-muc/${newSlug}`;
        if (entry.published) entry.published.path = entry.data.path;
      }
      const newPath = publicPathFor(collection, entry.data);
      if (oldPath && newPath && oldPath !== newPath)
        rememberRedirect(oldPath, newPath);
      update.run(
        JSON.stringify(entry.data),
        entry.published ? JSON.stringify(entry.published) : null,
        now,
        collection,
        entry.row.id,
      );
      if (collection === "tours") renames.set(oldSlug, newSlug);
      repaired += 1;
    }
  }
  applyTourSlugReferences(renames);
  return repaired;
}

/** Applies every pending content repair. The caller owns the transaction. */
function applyPendingMigrations(): number {
  let repaired = 0;
  if (!migrationApplied(MEDIA_SOURCE_MIGRATION)) {
    repaired += fillMissingMediaSources();
    markMigration(MEDIA_SOURCE_MIGRATION);
  }
  if (!migrationApplied(PUBLIC_SLUG_MIGRATION)) {
    repaired += repairPlaceholderSlugs();
    markMigration(PUBLIC_SLUG_MIGRATION);
  }
  if (!migrationApplied(CUSTOMER_VIDEO_FIRST_MIGRATION)) {
    repaired += reorderCustomerVideos();
    markMigration(CUSTOMER_VIDEO_FIRST_MIGRATION);
  }
  if (!migrationApplied(CUSTOMER_SAMPLE_DATA_MIGRATION)) {
    repaired += seedCustomerSampleData();
    markMigration(CUSTOMER_SAMPLE_DATA_MIGRATION);
  }
  return repaired;
}

/** Public entry point for scripts/tests; a no-op once the ledger has the id. */
export function migrateContent(): number {
  return transaction(applyPendingMigrations);
}

let seeded = false;
export function seed() {
  if (seeded) return;
  transaction(() => {
    const insert = db().prepare(
      "INSERT OR IGNORE INTO records(collection,id,data,published,state,updated_at) VALUES(?,?,?,?,?,?)",
    );
    for (const [collection, items] of Object.entries(seeds))
      for (const item of items) {
        const json = JSON.stringify(item);
        insert.run(
          collection,
          item.id,
          json,
          json,
          "published",
          new Date().toISOString(),
        );
      }
    backfillDestinationHomeFlags();
    fillTourImageSources();
    backfillSettingsSeo();
    // Runs inside this transaction: SQLite has no nested BEGIN.
    applyPendingMigrations();
  });
  seeded = true;
}
export function published<T>(
  collection: Collection,
  fallback: readonly T[],
): T[] {
  if (process.env.CMS_ENABLED !== "1") return [...fallback];
  seed();
  return (
    db()
      .prepare(
        "SELECT published FROM records WHERE collection=? AND published IS NOT NULL AND state!='deleted' ORDER BY rowid",
      )
      .all(collection) as { published: string }[]
  ).map((row) => JSON.parse(row.published) as T);
}
export function list(collection: Collection): CmsRecord[] {
  seed();
  return (
    db()
      .prepare(
        "SELECT collection,id,data,state,revision,updated_at FROM records WHERE collection=? ORDER BY updated_at DESC",
      )
      .all(collection) as unknown as (Omit<CmsRecord, "data"> & {
      data: string;
    })[]
  ).map((row) => ({ ...row, data: JSON.parse(row.data) }));
}

/**
 * Permanently removes trashed rows older than the retention window.
 * Deleted rows carry `updated_at` = time of the delete action, so no
 * migration is needed. Runs lazily from the admin content API — never
 * touches published rows.
 */
export const TRASH_RETENTION_DAYS = 60;

export function purgeExpiredTrash(nowMs: number = Date.now()): number {
  const cutoff = new Date(
    nowMs - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  return transaction(() => {
    const result = db()
      .prepare("DELETE FROM records WHERE state='deleted' AND updated_at<?")
      .run(cutoff);
    return Number(result.changes ?? 0);
  });
}
const AUDIT_PREVIEW_LIMIT = 120;

function previewAuditValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.length > AUDIT_PREVIEW_LIMIT
      ? `${value.slice(0, AUDIT_PREVIEW_LIMIT - 1).trimEnd()}…`
      : value;
  }
  if (Array.isArray(value)) return `${value.length} mục`;
  if (typeof value === "object") return "Đã thay đổi";
  return String(value);
}

/**
 * Compact before/after summary for the activity page.
 *
 * Full record bodies are never stored: they are long and some collections carry
 * unpublished drafts. Only mapped, customer-readable field names are kept.
 */
function summarizeAuditChanges(
  previousData: string | undefined,
  next: Record<string, unknown>,
) {
  let before: Record<string, unknown> = {};
  if (previousData) {
    try {
      before = JSON.parse(previousData) as Record<string, unknown>;
    } catch {
      before = {};
    }
  }
  const labels: string[] = [];
  const changes: { label: string; before: string | number | boolean | null; after: string | number | boolean | null }[] = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(next)])) {
    if (key === "id" || key === "updatedAt") continue;
    let unchanged = false;
    try {
      unchanged = JSON.stringify(before[key]) === JSON.stringify(next[key]);
    } catch {
      unchanged = false;
    }
    if (unchanged) continue;
    const label = AUDIT_FIELD_LABELS[key];
    if (!label) continue;
    if (!labels.includes(label)) labels.push(label);
    if (changes.length < 8) {
      changes.push({
        label,
        before: previewAuditValue(before[key]),
        after: previewAuditValue(next[key]),
      });
    }
  }
  return { changedFields: labels, changes };
}

/**
 * Collections whose records carry a public URL. Everything else (settings,
 * hero, landing…) has no slug and is never touched by the slug helpers below.
 */
const PUBLIC_SLUG_COLLECTIONS = [
  "tours",
  "articles",
  "categories",
  "destinations",
] as const;
type PublicSlugCollection = (typeof PUBLIC_SLUG_COLLECTIONS)[number];

function isPublicSlugCollection(
  collection: Collection,
): collection is PublicSlugCollection {
  return (PUBLIC_SLUG_COLLECTIONS as readonly string[]).includes(collection);
}

function slugTitleOf(
  collection: PublicSlugCollection,
  data: Record<string, unknown>,
): string {
  const value =
    collection === "tours" || collection === "articles"
      ? data.title
      : data.name;
  return typeof value === "string" ? value : "";
}

function slugBaseFor(
  collection: PublicSlugCollection,
  title: string,
): string {
  return collection === "tours"
    ? tourSlugFromTitle(title)
    : slugFromTitle(title);
}

/** Locale-less public path of a record, used for 301 redirects. */
function publicPathFor(
  collection: Collection,
  data: Record<string, unknown>,
): string | null {
  const slug = String(data.slug ?? "");
  if (!slug) return null;
  if (collection === "tours") return `/tour/${slug}`;
  if (collection === "articles") return `/cam-nang-du-lich/${slug}`;
  if (collection === "categories") return String(data.path ?? "") || null;
  return null;
}

/**
 * Remembers that `fromPath` moved to `toPath`. Old URLs keep working with a
 * permanent redirect instead of 404-ing after an editorial rename.
 */
export function rememberRedirect(fromPath: string, toPath: string): void {
  if (!fromPath || !toPath || fromPath === toPath) return;
  db()
    .prepare(
      "INSERT INTO content_redirects(from_path,to_path,created_at) VALUES(?,?,?) ON CONFLICT(from_path) DO UPDATE SET to_path=excluded.to_path",
    )
    .run(fromPath, toPath, new Date().toISOString());
}

/** Follows a redirect chain (max 5 hops) and returns null for unknown paths. */
export function redirectTarget(path: string): string | null {
  if (!path.startsWith("/")) return null;
  const read = db().prepare(
    "SELECT to_path FROM content_redirects WHERE from_path=?",
  );
  const seen = new Set<string>([path]);
  let current = path;
  for (let hop = 0; hop < 5; hop += 1) {
    const row = read.get(current) as { to_path: string } | undefined;
    if (!row) return current === path ? null : current;
    if (seen.has(row.to_path)) return null;
    seen.add(row.to_path);
    current = row.to_path;
  }
  return null;
}

/**
 * Studio-generated slugs are placeholders, not published decisions: derive a
 * readable slug from the title while the stored slug is still `noi-dung-…`.
 * Once a record owns a real slug it stays locked, so published links and SEO
 * are never silently rewritten by a title edit.
 */
function normalizePublicSlug(
  collection: Collection,
  data: Record<string, unknown>,
  previousData: Record<string, unknown> | null,
): void {
  if (!isPublicSlugCollection(collection)) return;
  const stored = String(previousData?.slug ?? "");
  const incoming = String(data.slug ?? "");
  const taken = new Set(
    list(collection)
      .filter((row) => row.id !== data.id && row.state !== "deleted")
      .map((row) => String(row.data.slug ?? ""))
      .filter(Boolean),
  );
  const derive = () => slugBaseFor(collection, slugTitleOf(collection, data));
  const base = derive();
  // A slug that still matches the title is generated, not an editorial
  // decision: a collision gets `-2` instead of a hard error.
  const generated =
    !incoming ||
    isPlaceholderSlug(incoming) ||
    (base !== "" && incoming === base);
  const resolveSlug = () => {
    if (generated) {
      if (base) data.slug = uniqueSlug(base, taken);
      return;
    }
    if (taken.has(incoming)) {
      throw new Error("Slug/đường dẫn đã tồn tại");
    }
    data.slug = incoming;
  };

  if (!previousData || isPlaceholderSlug(stored)) resolveSlug();

  if (collection === "categories") {
    const storedPath = String(previousData?.path ?? "");
    const incomingPath = String(data.path ?? "");
    const autoPath = !previousData || storedPath === `/danh-muc/${stored}`;
    // Keep the auto-generated `/danh-muc/<slug>` path in sync; a hand-written
    // category path is an editorial decision and stays untouched.
    if (
      autoPath &&
      (!previousData ||
        incomingPath === storedPath ||
        incomingPath === `/danh-muc/${stored}`)
    )
      data.path = `/danh-muc/${String(data.slug ?? "")}`;
  }
}

/**
 * A tour rename must follow every reference that stores a slug: article
 * "tour liên quan" lists and the home-page pin list. Both accept slugs, so a
 * stale value would silently drop the tour from those sections.
 */
function applyTourSlugReferences(renames: Map<string, string>): number {
  if (renames.size === 0) return 0;
  const now = new Date().toISOString();
  let changed = 0;
  const update = db().prepare(
    "UPDATE records SET data=?, published=?, revision=revision+1, updated_at=? WHERE collection=? AND id=?",
  );
  const rewrite = (value: unknown): string[] | null => {
    if (!Array.isArray(value)) return null;
    let touched = false;
    const next = value.map((entry) => {
      const mapped = renames.get(String(entry));
      if (mapped && mapped !== entry) touched = true;
      return mapped ?? entry;
    });
    return touched ? (next as string[]) : null;
  };

  const articleRows = db()
    .prepare("SELECT id,data,published FROM records WHERE collection='articles'")
    .all() as { id: string; data: string; published: string | null }[];
  for (const row of articleRows) {
    const data = JSON.parse(row.data) as Record<string, unknown>;
    const published = row.published
      ? (JSON.parse(row.published) as Record<string, unknown>)
      : null;
    const nextData = rewrite(data.relatedTourSlugs);
    const nextPublished = published
      ? rewrite(published.relatedTourSlugs)
      : null;
    if (!nextData && !nextPublished) continue;
    if (nextData) data.relatedTourSlugs = nextData;
    if (published && nextPublished) published.relatedTourSlugs = nextPublished;
    update.run(
      JSON.stringify(data),
      published ? JSON.stringify(published) : null,
      now,
      "articles",
      row.id,
    );
    changed += 1;
  }

  const landingRows = db()
    .prepare("SELECT id,data,published FROM records WHERE collection='landing'")
    .all() as { id: string; data: string; published: string | null }[];
  for (const row of landingRows) {
    const data = JSON.parse(row.data) as Record<string, unknown>;
    const published = row.published
      ? (JSON.parse(row.published) as Record<string, unknown>)
      : null;
    const nextData = rewrite(
      (data.featured as Record<string, unknown> | undefined)?.tourIds,
    );
    const nextPublished = published
      ? rewrite(
          (published.featured as Record<string, unknown> | undefined)?.tourIds,
        )
      : null;
    if (!nextData && !nextPublished) continue;
    if (nextData)
      data.featured = {
        ...(data.featured as Record<string, unknown> | undefined),
        tourIds: nextData,
      };
    if (published && nextPublished)
      published.featured = {
        ...(published.featured as Record<string, unknown> | undefined),
        tourIds: nextPublished,
      };
    update.run(
      JSON.stringify(data),
      published ? JSON.stringify(published) : null,
      now,
      "landing",
      row.id,
    );
    changed += 1;
  }
  return changed;
}

export function save(
  collection: Collection,
  input: unknown,
  revision: number,
  action: "save" | "publish" | "unpublish" | "delete" | "restore",
  context: AuditContext = {},
) {
  seed();
  return transaction(() =>
    saveRecord(collection, input, revision, action, context),
  );
}

function saveRecord(
  collection: Collection,
  input: unknown,
  revision: number,
  action: "save" | "publish" | "unpublish" | "delete" | "restore",
  context: AuditContext = {},
) {
  let normalized = input;
  if (
    collection === "settings" &&
    normalized &&
    typeof normalized === "object" &&
    "contact" in (normalized as Record<string, unknown>)
  ) {
    const contact = (normalized as Record<string, Record<string, unknown>>)
      .contact;
    // Admin chỉ cần sửa SĐT hiển thị — link tel: tự chuẩn hoá để nút gọi/Zalo luôn đúng.
    if (contact && typeof contact.hotline === "string") {
      normalized = {
        ...(normalized as Record<string, unknown>),
        contact: {
          ...contact,
          hotlineHref: normalizeHotlineHref(contact.hotline),
        },
      };
    }
  }
  const data = schemas[collection].parse(normalized) as {
    id: string;
    slug?: string;
    path?: string;
  };
  const encoded = JSON.stringify(data);
  if (encoded.length > 500000) throw new Error("Nội dung vượt quá giới hạn");
  // Image URLs are local, cannot be protocol-relative, executable or traverse directories.
  const inspect = (value: unknown, key = "") => {
    if (
      typeof value === "string" &&
      ["src", "ogImage", "path"].includes(key) &&
      (!/^\/(?!\/)/.test(value) ||
        value.includes("..") ||
        /[\\\x00-\x1f]/.test(value))
    )
      throw new Error("Đường dẫn không an toàn");
    if (value && typeof value === "object")
      for (const [k, v] of Object.entries(value)) inspect(v, k);
  };
  return (() => {
    const previous = db()
      .prepare(
        "SELECT revision,published,state,data FROM records WHERE collection=? AND id=?",
      )
      .get(collection, data.id) as
      | {
          revision: number;
          published: string | null;
          state: string;
          data: string;
        }
      | undefined;
    const previousData = previous
      ? (JSON.parse(previous.data) as Record<string, unknown>)
      : null;
    // Studio placeholders (`noi-dung-…`) may be replaced by a readable slug
    // derived from the title; a real, already-saved slug stays immutable.
    normalizePublicSlug(
      collection,
      data as Record<string, unknown>,
      previousData,
    );
    inspect(data);
    if ((previous?.revision ?? 0) !== revision)
      throw new Error("Nội dung đã thay đổi. Tải lại trước khi lưu.");
    if (previousData) {
      const slugChanged = previousData.slug !== data.slug;
      const pathChanged = previousData.path !== data.path;
      const placeholder = isPlaceholderSlug(previousData.slug);
      if (
        (slugChanged && !(isPublicSlugCollection(collection) && placeholder)) ||
        (pathChanged && !(collection === "categories" && placeholder))
      )
        throw new Error(
          "Giữ nguyên slug/đường dẫn để bảo toàn liên kết đã phát hành.",
        );
    }
    if (
      ["settings", "messages", "hero", "landing"].includes(collection) &&
      action !== "publish" &&
      action !== "save"
    )
      throw new Error("Không thể ẩn/xóa cấu hình hệ thống");
    const all = list(collection);
    if (
      collection === "destinations" &&
      (data as Record<string, unknown>).showOnHome === true
    ) {
      const otherEnabled = all.filter(
        (row) =>
          row.id !== data.id &&
          row.state !== "deleted" &&
          row.data.showOnHome === true,
      );
      if (otherEnabled.length >= MAX_HOME_DESTINATIONS)
        throw new Error(
          `Khối Khám phá trang chủ chỉ hiện tối đa ${MAX_HOME_DESTINATIONS} điểm. Hãy tắt một điểm đang bật trước khi bật thêm.`,
        );
      const raw = data as Record<string, unknown>;
      const homeOrder = Number(raw.homeOrder ?? 0);
      if (!Number.isInteger(homeOrder) || homeOrder <= 0)
        raw.homeOrder =
          Math.max(
            0,
            ...otherEnabled.map((row) => Number(row.data.homeOrder ?? 0)),
          ) + 1;
    }
    if (
      all.some(
        (row) =>
          row.id !== data.id &&
          row.state !== "deleted" &&
          ((data.slug && row.data.slug === data.slug) ||
            (data.path && row.data.path === data.path)),
      )
    )
      throw new Error("Slug/đường dẫn đã tồn tại");
    const present = (kind: Collection, id: string) =>
      list(kind).some((row) => row.id === id && row.state !== "deleted");
    const raw = data as Record<string, unknown>;
    if (
      collection === "categories" &&
      !previous &&
      !/^\/danh-muc\/[a-z0-9/-]+$/.test(String(raw.path))
    )
      throw new Error("Danh mục mới dùng đường dẫn /danh-muc/<slug>");
    if (collection === "tours") {
      const tour = tourRecordSchema.parse(data);
      // Business rules live in `domain/tour-rules.ts` so the Studio form can
      // show the same failures next to the offending field before POSTing.
      const issues = collectTourBusinessIssues(tour, {
        categories: new Set(
          list("categories")
            .filter((row) => row.state !== "deleted")
            .map((row) => String(row.data.id)),
        ),
        destinations: new Set(
          list("destinations")
            .filter((row) => row.state !== "deleted")
            .map((row) => String(row.data.id)),
        ),
      });
      if (issues.length > 0)
        throw new Error(
          [...new Set(issues.map((issue) => issue.message))]
            .slice(0, 4)
            .join(" · "),
        );
    }
    if (collection === "articles") {
      const article = travelArticleSchema.parse(data);
      if (
        article.destinationIds.some((id) => !present("destinations", id)) ||
        article.relatedTourSlugs.some(
          (slug) =>
            !list("tours").some(
              (r) => r.data.slug === slug && r.state !== "deleted",
            ),
        )
      )
        throw new Error("Tour/điểm đến liên quan không tồn tại");
    }
    if (collection === "categories" && raw.parentId) {
      const visited = new Set([data.id]);
      let parent = String(raw.parentId);
      while (parent) {
        if (visited.has(parent)) throw new Error("Danh mục tạo thành vòng lặp");
        visited.add(parent);
        const row = list("categories").find(
          (r) => r.id === parent && r.state !== "deleted",
        );
        if (!row) throw new Error("Danh mục cha không tồn tại");
        parent = String(row.data.parentId ?? "");
      }
    }
    if (
      action === "delete" &&
      (collection === "categories" || collection === "destinations")
    ) {
      const field =
        collection === "categories" ? "categoryIds" : "destinationIds";
      if (
        list("tours").some(
          (row) =>
            row.state !== "deleted" &&
            (row.data[field] as string[]).includes(data.id),
        ) ||
        (collection === "categories" &&
          all.some(
            (row) => row.state !== "deleted" && row.data.parentId === data.id,
          ))
      )
        throw new Error("Đang được tham chiếu; gỡ liên kết trước khi xóa");
    }
    if (
      action === "delete" &&
      collection === "destinations" &&
      list("articles").some(
        (row) =>
          row.state !== "deleted" &&
          (row.data.destinationIds as string[]).includes(data.id),
      )
    )
      throw new Error("Điểm đến đang được bài viết tham chiếu");
    if (
      action === "delete" &&
      collection === "tours" &&
      list("articles").some(
        (row) =>
          row.state !== "deleted" &&
          (row.data.relatedTourSlugs as string[]).includes(data.slug ?? ""),
      )
    )
      throw new Error(
        "Tour đang được bài viết tham chiếu; gỡ liên kết trước khi xóa",
      );
    const now = new Date().toISOString();
    if (action === "save" || action === "publish") {
      if (collection === "articles")
        (data as Record<string, unknown>).updatedAt = now.slice(0, 10);
      if (collection === "tours")
        (data as Record<string, unknown>).updatedAt = now;
    } else if (previous && "updatedAt" in data) {
      // Thùng rác / ẩn / khôi phục không được đổi ngày hiển thị của bản ghi.
      (data as Record<string, unknown>).updatedAt = (
        JSON.parse(previous.data) as Record<string, unknown>
      ).updatedAt;
    }
    const json = JSON.stringify(data);
    const state =
      action === "delete"
        ? "deleted"
        : action === "publish"
          ? "published"
          : action === "unpublish" || action === "restore"
            ? "draft"
            : "draft";
    const publicValue =
      action === "publish"
        ? ["tours", "articles", "categories", "destinations"].includes(
            collection,
          )
          ? JSON.stringify({ ...data, _cmsEdited: true })
          : json
        : ["unpublish", "delete", "restore"].includes(action)
          ? null
          : (previous?.published ?? null);
    db()
      .prepare(
        "INSERT INTO records(collection,id,data,published,state,revision,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data,published=excluded.published,state=excluded.state,revision=excluded.revision,updated_at=excluded.updated_at",
      )
      .run(collection, data.id, json, publicValue, state, revision + 1, now);
    if (previousData) {
      const oldSlug = String(previousData.slug ?? "");
      const newSlug = String((data as Record<string, unknown>).slug ?? "");
      if (oldSlug && newSlug && oldSlug !== newSlug) {
        const oldPath = publicPathFor(collection, previousData);
        const newPath = publicPathFor(
          collection,
          data as Record<string, unknown>,
        );
        if (oldPath && newPath) rememberRedirect(oldPath, newPath);
        // A renamed tour is still the same tour: follow its slug in article
        // "tour liên quan" lists and the home-page pin list.
        if (collection === "tours")
          applyTourSlugReferences(new Map([[oldSlug, newSlug]]));
      }
    }
    const auditSummary = summarizeAuditChanges(
      previous?.data,
      data as Record<string, unknown>,
    );
    audit(action, `${collection}/${data.id}`, {
      ...context,
      status: "success",
      details: {
        record: {
          title: String(
            (data as Record<string, unknown>).title ??
              (data as Record<string, unknown>).name ??
              data.id,
          ).slice(0, 160),
          stateBefore: previous?.state ?? null,
          stateAfter: state,
        },
        changedFields: auditSummary.changedFields,
        changes: auditSummary.changes,
      },
    });
    return { id: data.id, revision: revision + 1 };
  })();
}
/** One atomic edit of the home introduction and its shared category cards. */
export function saveHomeRegions(raw: unknown, context: AuditContext = {}) {
  const input = homeRegionsInputSchema.parse(raw);
  seed();
  return transaction(() => {
    const landing = list("landing")[0];
    if (!landing) throw new Error("Chưa có dữ liệu trang chủ.");
    const categories = list("categories");
    const parent = categories.find(
      (row) => row.state !== "deleted" && row.data.path === ROUTES.domestic,
    );
    if (!parent) throw new Error("Không tìm thấy danh mục Tour Trong Nước.");
    if (new Set(input.cards.map((card) => card.id)).size !== input.cards.length)
      throw new Error("Thẻ vùng miền bị trùng.");
    // Keep unrelated public fields at their previous published values. Draft
    // changes in other sections/category fields must stay private.
    const persist = (
      collection: "landing" | "categories",
      row: CmsRecord,
      patch: Record<string, unknown>,
      revision: number,
    ) => {
      const before = db()
        .prepare("SELECT published FROM records WHERE collection=? AND id=?")
        .get(collection, row.id) as { published: string | null };
      if (collection === "categories" && !before.published)
        throw new Error("Vùng miền đã bị ẩn. Hãy tải lại trước khi lưu.");
      const result = saveRecord(
        collection,
        { ...row.data, ...patch },
        revision,
        input.action,
        context,
      );
      if (input.action === "publish") {
        const base = before.published ? JSON.parse(before.published) : row.data;
        db()
          .prepare("UPDATE records SET published=? WHERE collection=? AND id=?")
          .run(
            JSON.stringify({
              ...base,
              ...patch,
              ...(collection === "categories" ? { _cmsEdited: true } : {}),
            }),
            collection,
            row.id,
          );
      }
      return result;
    };
    const result = persist(
      "landing",
      landing,
      { regions: input.regions },
      input.revision,
    );
    for (const card of input.cards) {
      const row = categories.find((item) => item.id === card.id);
      if (!row || row.state === "deleted" || row.data.parentId !== parent.id)
        throw new Error(
          "Vùng miền đã thay đổi hoặc không còn thuộc Tour Trong Nước. Hãy tải lại.",
        );
      persist(
        "categories",
        row,
        {
          name: card.name,
          tagline: card.tagline || undefined,
          image: card.image,
        },
        card.revision,
      );
    }
    return result;
  });
}
export function settings() {
  const stored = published("settings", [defaultSettings])[0];
  if (!stored) return defaultSettings;
  // Settings rows written before a field existed must inherit the default for
  // that field. Merging (rather than overwriting) keeps every owner edit.
  return settingsSchema.parse({
    ...defaultSettings,
    ...stored,
    contact: { ...defaultSettings.contact, ...stored.contact },
    seo: { ...defaultSettings.seo, ...(stored as { seo?: object }).seo },
  });
}
export function siteTheme() {
  return (
    published("theme", [defaultThemeRecord])[0] ?? defaultThemeRecord
  ).theme;
}
export function homeHero() {
  return heroSchema.parse(published("hero", [defaultHero])[0] ?? defaultHero);
}
export function landingSections() {
  return landingSchema.parse(
    published("landing", [defaultLanding])[0] ?? defaultLanding,
  );
}
export function consumeLimit(key: string, max: number, windowMs: number) {
  return transaction(() => {
    const now = Date.now();
    db().prepare("DELETE FROM attempts WHERE expires<?").run(now);
    db()
      .prepare(
        "INSERT INTO attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
      )
      .run(key, now + windowMs);
    const row = db()
      .prepare("SELECT count FROM attempts WHERE key=?")
      .get(key) as { count: number };
    return row.count <= max;
  });
}
