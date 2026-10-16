import { getDb } from "@/server/db/connection";
import { nowIso, nullable, toJson } from "@/server/db/json";
import { categoryFromRow, destinationFromRow, type Row } from "./mappers";
import type { TourCategory } from "@/domain/category";
import type { Destination } from "@/domain/destination";
import type { Region } from "@/domain/common";

/** Categories and destinations (read + admin write). */

export function listCategories(): TourCategory[] {
  const rows = getDb()
    .prepare("SELECT * FROM category ORDER BY sort_order ASC, name ASC")
    .all() as Row[];
  return rows.map(categoryFromRow);
}

export function getCategoryById(id: string): TourCategory | undefined {
  const row = getDb().prepare("SELECT * FROM category WHERE id = ?").get(id) as Row | undefined;
  return row ? categoryFromRow(row) : undefined;
}

export function getCategoryByPath(path: string): TourCategory | undefined {
  const row = getDb().prepare("SELECT * FROM category WHERE path = ?").get(path) as Row | undefined;
  return row ? categoryFromRow(row) : undefined;
}

export function getCategoryBySlug(slug: string): TourCategory | undefined {
  const row = getDb().prepare("SELECT * FROM category WHERE slug = ?").get(slug) as Row | undefined;
  return row ? categoryFromRow(row) : undefined;
}

/** Number of published tours per category id (descendants are counted by the caller). */
export function publishedTourCountByCategory(): Map<string, number> {
  const rows = getDb()
    .prepare(
      `SELECT tc.category_id AS id, COUNT(*) AS n
       FROM tour_category tc
       JOIN tour t ON t.id = tc.tour_id
       WHERE t.status = 'published' AND t.deleted_at IS NULL
       GROUP BY tc.category_id`,
    )
    .all() as { id: string; n: number }[];
  return new Map(rows.map((row) => [row.id, row.n]));
}

export function upsertCategory(record: {
  id: string;
  slug: string;
  path: string;
  name: string;
  parentId: string | null;
  region: Region;
  description: string;
  tagline?: string;
  imageSrc?: string;
  imageAlt?: string;
  order: number;
  contentStatus: "demo" | "verified";
}): void {
  getDb()
    .prepare(
      `INSERT INTO category (id, slug, path, name, parent_id, region, description, tagline,
         image_src, image_alt, sort_order, content_status)
       VALUES (:id, :slug, :path, :name, :parentId, :region, :description, :tagline,
         :imageSrc, :imageAlt, :order, :contentStatus)
       ON CONFLICT(id) DO UPDATE SET
         slug = excluded.slug,
         path = excluded.path,
         name = excluded.name,
         parent_id = excluded.parent_id,
         region = excluded.region,
         description = excluded.description,
         tagline = excluded.tagline,
         image_src = excluded.image_src,
         image_alt = excluded.image_alt,
         sort_order = excluded.sort_order,
         content_status = excluded.content_status`,
    )
    .run({
      id: record.id,
      slug: record.slug,
      path: record.path,
      name: record.name,
      parentId: nullable(record.parentId),
      region: record.region,
      description: record.description,
      tagline: nullable(record.tagline),
      imageSrc: nullable(record.imageSrc),
      imageAlt: nullable(record.imageAlt),
      order: record.order,
      contentStatus: record.contentStatus,
    });
}

export function listDestinations(): Destination[] {
  const rows = getDb()
    .prepare("SELECT * FROM destination ORDER BY sort_order ASC, name ASC")
    .all() as Row[];
  return rows.map(destinationFromRow);
}

export function getDestinationById(id: string): Destination | undefined {
  const row = getDb().prepare("SELECT * FROM destination WHERE id = ?").get(id) as Row | undefined;
  return row ? destinationFromRow(row) : undefined;
}

export function upsertDestination(record: {
  id: string;
  slug: string;
  name: string;
  region: Region;
  summary: string;
  province?: string;
  imageSrc?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageCaption?: string;
  order: number;
  contentStatus: "demo" | "verified";
}): void {
  getDb()
    .prepare(
      `INSERT INTO destination (id, slug, name, region, summary, province,
         image_src, image_alt, image_width, image_height, image_caption, sort_order, content_status)
       VALUES (:id, :slug, :name, :region, :summary, :province,
         :imageSrc, :imageAlt, :imageWidth, :imageHeight, :imageCaption, :order, :contentStatus)
       ON CONFLICT(id) DO UPDATE SET
         slug = excluded.slug,
         name = excluded.name,
         region = excluded.region,
         summary = excluded.summary,
         province = excluded.province,
         image_src = excluded.image_src,
         image_alt = excluded.image_alt,
         image_width = excluded.image_width,
         image_height = excluded.image_height,
         image_caption = excluded.image_caption,
         sort_order = excluded.sort_order,
         content_status = excluded.content_status`,
    )
    .run({
      id: record.id,
      slug: record.slug,
      name: record.name,
      region: record.region,
      summary: record.summary,
      province: nullable(record.province),
      imageSrc: nullable(record.imageSrc),
      imageAlt: nullable(record.imageAlt),
      imageWidth: nullable(record.imageWidth),
      imageHeight: nullable(record.imageHeight),
      imageCaption: nullable(record.imageCaption),
      order: record.order,
      contentStatus: record.contentStatus,
    });
}

export function countCategories(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM category").get() as { n: number };
  return row.n;
}

/** Timestamp used by the import script to know whether anything changed. */
export function taxonomyUpdatedAt(): string {
  return nowIso();
}

export { toJson };
