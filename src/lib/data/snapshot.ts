import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { tourSchema } from "@/domain/tour";
import { travelArticleSchema } from "@/domain/article";
import { tourCategorySchema } from "@/domain/category";
import { destinationSchema } from "@/domain/destination";
import { siteSettingsSchema } from "@/domain/settings";
import { CONTENT_LOCALES, type ContentLocale } from "@/domain/common";
import { emptyTranslations, loadTranslations, type Translations } from "@/server/repo/translations";
import { loadSettingsByLocale } from "@/server/repo/settings";
import { listPublishedArticles } from "@/server/repo/articles";
import { listPublishedTours, newestTourUpdatedAt } from "@/server/repo/tours";
import { listCategories, listDestinations } from "@/server/repo/taxonomy";
import { contentSourceKind, getDb } from "@/server/db/connection";
import { ensureLocalDatabase } from "@/server/db/bootstrap";
import type { ContentSnapshot } from "@/server/repo/types";
import { nowIso } from "@/server/db/json";

/**
 * The single cached read of everything the public site renders.
 *
 * One `use cache` scope, one tag (`content`). When the admin publishes, hides,
 * edits or reorders anything, it calls `revalidateTag("content", "max")` and the
 * next request rebuilds this snapshot — a single, explainable invalidation rule
 * instead of a dozen per-entity tags that are easy to forget.
 *
 * `CONTENT_SOURCE=remote` swaps the local SQLite read for an HTTP fetch of the
 * VPS's public API, which is what lets the public front end run on Vercel while
 * the database stays on the VPS.
 */

export const CONTENT_TAG = "content";

const translationBundleSchema = z.object({
  tour: z.record(z.string(), z.unknown()),
  category: z.record(z.string(), z.unknown()),
  destination: z.record(z.string(), z.unknown()),
  article: z.record(z.string(), z.unknown()),
});

const snapshotSchema = z.object({
  tours: z.array(tourSchema),
  articles: z.array(travelArticleSchema),
  categories: z.array(tourCategorySchema),
  destinations: z.array(destinationSchema),
  translations: z.record(z.string(), translationBundleSchema),
  settings: z.record(z.string(), siteSettingsSchema),
  updatedAt: z.string(),
});

/** Read everything directly from SQLite (no Next cache APIs — usable by tests). */
export function readLocalSnapshot(): ContentSnapshot {
  // A database-less machine (Vercel build, fresh CI) gets the schema and the
  // shipped content created on first read, instead of `no such table`.
  ensureLocalDatabase();

  const translations: Record<string, Translations> = {};
  for (const locale of CONTENT_LOCALES) {
    translations[locale] = loadTranslations(locale);
  }

  const tourUpdated = newestTourUpdatedAt();
  const settingsUpdated = (() => {
    const row = getDb().prepare("SELECT MAX(updated_at) AS value FROM site_setting").get() as {
      value: string | null;
    };
    return row.value;
  })();
  const articleUpdated = (() => {
    const row = getDb()
      .prepare("SELECT MAX(COALESCE(updated_at, published_at)) AS value FROM article WHERE status = 'published' AND deleted_at IS NULL")
      .get() as { value: string | null };
    return row.value;
  })();

  const updatedAt =
    [tourUpdated, articleUpdated, settingsUpdated].filter((value): value is string => Boolean(value)).sort().at(-1) ??
    "2026-01-01T00:00:00.000Z";

  return {
    tours: listPublishedTours(),
    articles: listPublishedArticles(),
    categories: listCategories(),
    destinations: listDestinations(),
    translations: translations as Record<string, Translations>,
    settings: loadSettingsByLocale(),
    updatedAt,
  };
}

async function readRemote(): Promise<ContentSnapshot> {
  const base = process.env.CONTENT_API_BASE_URL?.trim();
  if (!base) {
    throw new Error(
      "CONTENT_SOURCE=remote nhưng thiếu CONTENT_API_BASE_URL. Đặt biến này trỏ tới API công khai của backend.",
    );
  }
  const response = await fetch(`${base.replace(/\/+$/, "")}/api/public/content`, {
    headers: { accept: "application/json" },
    next: { tags: [CONTENT_TAG] },
  });
  if (!response.ok) {
    throw new Error(`Không đọc được nội dung từ backend (HTTP ${response.status}).`);
  }
  const payload = await response.json();
  // Never trust the wire: validate before anything renders it.
  return snapshotSchema.parse(payload) as ContentSnapshot;
}

/**
 * Published content, cached under the `content` tag for a short window.
 * `cacheLife("minutes")` is a safety net; revalidation is event-driven.
 */
export async function loadPublishedSnapshot(): Promise<ContentSnapshot> {
  "use cache";
  // `cacheLife`/`cacheTag` only exist under the Next runtime. Guarding the calls
  // keeps this module importable from the CLI and the unit tests, where the
  // directive is a no-op string and there is no cache to talk to.
  try {
    cacheLife("minutes");
    cacheTag(CONTENT_TAG);
  } catch {
    // Outside the Next runtime — no cache to configure.
  }
  if (contentSourceKind() === "remote") return readRemote();
  return readLocalSnapshot();
}

export function translationsFor(snapshot: ContentSnapshot, locale: ContentLocale): Translations {
  return snapshot.translations[locale] ?? emptyTranslations();
}

/** Deterministic fallback used when nothing has been published yet. */
export function emptySnapshot(): ContentSnapshot {
  return {
    tours: [],
    articles: [],
    categories: [],
    destinations: [],
    translations: {},
    settings: {},
    updatedAt: nowIso(),
  };
}
