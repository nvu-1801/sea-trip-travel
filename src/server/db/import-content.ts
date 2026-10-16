import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { articles, destinations, tours, tourCategories } from "@/content";
import {
  articleTranslations,
  categoryTranslations,
  destinationTranslations,
  tourTranslations,
} from "@/content/locales/en";
import { getDb } from "./connection";
import { runMigrations } from "./migrate";
import { upsertCategory, upsertDestination } from "@/server/repo/taxonomy";
import { saveTour, getTourRecordById } from "@/server/repo/tours";
import { saveArticle, getArticleRecordById } from "@/server/repo/articles";
import { saveTranslation, getTranslation } from "@/server/repo/translations";
import { findMediaByUrl, insertMedia } from "@/server/repo/media";

/**
 * One-shot, re-runnable import of the TypeScript content into SQLite.
 *
 * Guarantees:
 *   - Idempotent: records are matched by their domain `id`, translations by
 *     `(entity, id, locale)`, media by URL. Running it twice changes nothing.
 *   - Slugs, images, price tables, itineraries and both languages are preserved
 *     exactly as authored, so no public URL moves.
 *   - The 28 approved photographs under `public/images/tours` are registered in
 *     the media library with their original URLs (never copied, never renamed).
 */

export type ImportReport = {
  categories: { inserted: number; updated: number };
  destinations: { inserted: number; updated: number };
  tours: { inserted: number; updated: number };
  articles: { inserted: number; updated: number };
  translations: { inserted: number; updated: number };
  media: { inserted: number; skipped: number };
};

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function fileSha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function importContent(): ImportReport {
  runMigrations(getDb());

  const report: ImportReport = {
    categories: { inserted: 0, updated: 0 },
    destinations: { inserted: 0, updated: 0 },
    tours: { inserted: 0, updated: 0 },
    articles: { inserted: 0, updated: 0 },
    translations: { inserted: 0, updated: 0 },
    media: { inserted: 0, skipped: 0 },
  };

  const db = getDb();
  const categoryExists = (id: string) =>
    Boolean(db.prepare("SELECT 1 AS x FROM category WHERE id = ?").get(id));
  const destinationExists = (id: string) =>
    Boolean(db.prepare("SELECT 1 AS x FROM destination WHERE id = ?").get(id));

  for (const category of tourCategories) {
    const existed = categoryExists(category.id);
    upsertCategory({
      id: category.id,
      slug: category.slug,
      path: category.path,
      name: category.name,
      parentId: category.parentId,
      region: category.region,
      description: category.description,
      tagline: category.tagline,
      imageSrc: category.image?.src,
      imageAlt: category.image?.alt,
      order: category.order,
      contentStatus: category.contentStatus,
    });
    report.categories[existed ? "updated" : "inserted"] += 1;
  }

  for (const destination of destinations) {
    const existed = destinationExists(destination.id);
    upsertDestination({
      id: destination.id,
      slug: destination.slug,
      name: destination.name,
      region: destination.region,
      summary: destination.summary,
      province: destination.province,
      imageSrc: destination.image?.src,
      imageAlt: destination.image?.alt,
      imageWidth: destination.image?.width,
      imageHeight: destination.image?.height,
      imageCaption: destination.image?.caption,
      order: destination.order,
      contentStatus: destination.contentStatus,
    });
    report.destinations[existed ? "updated" : "inserted"] += 1;
  }

  tours.forEach((tour, index) => {
    const existed = Boolean(getTourRecordById(tour.id));
    saveTour({ tour, status: "published", featured: false, sortOrder: index });
    report.tours[existed ? "updated" : "inserted"] += 1;
  });

  articles.forEach((article, index) => {
    const existed = Boolean(getArticleRecordById(article.id));
    saveArticle({ article, status: "published", featured: article.featured, sortOrder: index });
    report.articles[existed ? "updated" : "inserted"] += 1;
  });

  const translationBatches: [string, Record<string, Record<string, unknown>>][] = [
    ["tour", tourTranslations as Record<string, Record<string, unknown>>],
    ["category", categoryTranslations as Record<string, Record<string, unknown>>],
    ["destination", destinationTranslations as Record<string, Record<string, unknown>>],
    ["article", articleTranslations as Record<string, Record<string, unknown>>],
  ];

  for (const [entityType, batch] of translationBatches) {
    for (const [entityId, overlay] of Object.entries(batch)) {
      const { translationStatus, sourceUpdatedAt, ...rest } = overlay as {
        translationStatus?: string;
        sourceUpdatedAt?: string;
      } & Record<string, unknown>;
      const existed = Boolean(getTranslation(entityType as never, entityId, "en"));
      saveTranslation({
        entityType: entityType as never,
        entityId,
        locale: "en",
        status: typeof translationStatus === "string" ? translationStatus : "draft",
        sourceUpdatedAt: typeof sourceUpdatedAt === "string" ? sourceUpdatedAt : null,
        payload: rest,
      });
      report.translations[existed ? "updated" : "inserted"] += 1;
    }
  }

  report.media = registerStaticMedia();

  return report;
}

/** Register the shipped tour photographs as `static` media rows. */
function registerStaticMedia(): { inserted: number; skipped: number } {
  const dir = resolve(process.cwd(), "public/images/tours");
  if (!existsSync(dir)) return { inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;
  for (const filename of readdirSync(dir)) {
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    if (!MIME_BY_EXT[ext]) continue;
    const url = `/images/tours/${filename}`;
    if (findMediaByUrl(url)) {
      skipped += 1;
      continue;
    }
    const absolute = join(dir, filename);
    const buffer = readFileSync(absolute);
    insertMedia({
      storage: "static",
      url,
      filename,
      originalName: filename,
      mime: MIME_BY_EXT[ext],
      bytes: buffer.byteLength,
      width: null,
      height: null,
      sha256: fileSha256(absolute),
      variants: [],
      altDefault: null,
    });
    inserted += 1;
  }
  return { inserted, skipped };
}
