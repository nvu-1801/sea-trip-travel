import { getDb } from "@/server/db/connection";
import { boolToInt, newId, nullable, nowIso, toJson } from "@/server/db/json";
import { withTransaction } from "@/server/db/tx";
import { normalizeForSearch } from "@/lib/search";
import { tourFromParts, type Row } from "./mappers";
import type { ContentState, TourRecord } from "./types";
import type { Tour } from "@/domain/tour";

/**
 * Tours repository.
 *
 * `saveTour` writes the whole aggregate (row + images + itinerary + prices +
 * relations) inside one transaction, replacing the child collections rather
 * than diffing them. Child rows are owned by the tour, so replacement is both
 * simpler and impossible to get out of sync.
 */

const TOUR_COLUMNS = `id, slug, title, summary, tour_code, duration_days, duration_nights,
  price_amount, price_currency, price_note, departure_points, return_points, transport,
  highlights, overview, included, excluded, notes, policies, tags, gifts, source_documents,
  seo_title, seo_description, seo_og_image, content_status, status, featured, sort_order,
  search_text, created_at, updated_at, published_at, deleted_at`;

type TourRow = Row & { status: string; featured: number; sort_order: number };

function childRows(tourId: string, table: string, orderBy = "position ASC"): Row[] {
  return getDb()
    .prepare(`SELECT * FROM ${table} WHERE tour_id = ? ORDER BY ${orderBy}`)
    .all(tourId) as Row[];
}

function relations(tourId: string, table: string, column: string): string[] {
  const rows = getDb()
    .prepare(`SELECT ${column} AS value FROM ${table} WHERE tour_id = ? ORDER BY rowid ASC`)
    .all(tourId) as { value: string }[];
  return rows.map((row) => row.value);
}

export function tourRecordFromRow(row: TourRow): TourRecord {
  const parts = {
    images: childRows(row.id as string, "tour_image"),
    itinerary: childRows(row.id as string, "tour_itinerary_day"),
    pricing: childRows(row.id as string, "tour_pricing_option"),
    categoryIds: relations(row.id as string, "tour_category", "category_id"),
    destinationIds: relations(row.id as string, "tour_destination", "destination_id"),
  };
  return {
    tour: tourFromParts(row, parts),
    status: row.status as ContentState,
    featured: row.featured === 1,
    sortOrder: row.sort_order,
    createdAt: String(row.created_at),
    publishedAt: row.published_at === null ? null : String(row.published_at),
    deletedAt: row.deleted_at === null ? null : String(row.deleted_at),
  };
}

export function getTourRecordBySlug(slug: string): TourRecord | undefined {
  const row = getDb()
    .prepare(`SELECT ${TOUR_COLUMNS} FROM tour WHERE slug = ?`)
    .get(slug) as TourRow | undefined;
  return row ? tourRecordFromRow(row) : undefined;
}

export function getTourRecordById(id: string): TourRecord | undefined {
  const row = getDb().prepare(`SELECT ${TOUR_COLUMNS} FROM tour WHERE id = ?`).get(id) as
    | TourRow
    | undefined;
  return row ? tourRecordFromRow(row) : undefined;
}

export type TourListOptions = {
  status?: ContentState | "all";
  includeDeleted?: boolean;
  query?: string;
  categoryId?: string;
  onlyFeatured?: boolean;
};

export function listTourRecords(options: TourListOptions = {}): TourRecord[] {
  const clauses: string[] = [];
  const params: Record<string, string | number> = {};

  if (!options.includeDeleted) clauses.push("t.deleted_at IS NULL");
  if (options.status && options.status !== "all") {
    clauses.push("t.status = :status");
    params.status = options.status;
  }
  if (options.onlyFeatured) clauses.push("t.featured = 1");
  if (options.query && options.query.trim()) {
    clauses.push("t.search_text LIKE :q");
    params.q = `%${normalizeForSearch(options.query)}%`;
  }
  if (options.categoryId) {
    clauses.push(
      "EXISTS (SELECT 1 FROM tour_category tc WHERE tc.tour_id = t.id AND tc.category_id = :categoryId)",
    );
    params.categoryId = options.categoryId;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(
      `SELECT ${TOUR_COLUMNS.split(",")
        .map((column) => `t.${column.trim()}`)
        .join(", ")}
       FROM tour t ${where}
       ORDER BY t.status = 'published' DESC, t.sort_order ASC, t.updated_at DESC`,
    )
    .all(params) as TourRow[];

  return rows.map(tourRecordFromRow);
}

export function listPublishedTours(): Tour[] {
  const rows = getDb()
    .prepare(`SELECT ${TOUR_COLUMNS} FROM tour WHERE status = 'published' AND deleted_at IS NULL ORDER BY sort_order ASC, rowid ASC`)
    .all() as TourRow[];
  return rows.map((row) => tourRecordFromRow(row).tour);
}

export function listAllTours(): Tour[] {
  const rows = getDb()
    .prepare(`SELECT ${TOUR_COLUMNS} FROM tour WHERE deleted_at IS NULL ORDER BY sort_order ASC, rowid ASC`)
    .all() as TourRow[];
  return rows.map((row) => tourRecordFromRow(row).tour);
}

export function tourSlugExists(slug: string, excludeId?: string): boolean {
  const row = getDb()
    .prepare("SELECT id FROM tour WHERE slug = ? AND (? IS NULL OR id <> ?)")
    .get(slug, nullable(excludeId), nullable(excludeId)) as { id: string } | undefined;
  return Boolean(row);
}

export function countToursByState(): Record<ContentState | "trash" | "total", number> {
  const rows = getDb()
    .prepare("SELECT status, deleted_at FROM tour")
    .all() as { status: string; deleted_at: string | null }[];
  const counts = { draft: 0, published: 0, hidden: 0, trash: 0, total: rows.length };
  for (const row of rows) {
    if (row.deleted_at) counts.trash += 1;
    else if (row.status === "published") counts.published += 1;
    else if (row.status === "hidden") counts.hidden += 1;
    else counts.draft += 1;
  }
  return counts;
}

export function recentlyUpdatedTours(limit = 5): TourRecord[] {
  const rows = getDb()
    .prepare(`SELECT ${TOUR_COLUMNS} FROM tour WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT ?`)
    .all(limit) as TourRow[];
  return rows.map(tourRecordFromRow);
}

function searchTextFor(tour: Tour): string {
  const destinationNames = tour.destinationIds.length
    ? (getDb()
        .prepare(
          `SELECT name FROM destination WHERE id IN (${tour.destinationIds.map(() => "?").join(",")})`,
        )
        .all(...tour.destinationIds) as { name: string }[]).map((row) => row.name)
    : [];
  return normalizeForSearch(
    [tour.title, tour.tourCode ?? "", tour.slug, ...destinationNames, ...tour.tags].join(" "),
  );
}

export function saveTour(record: {
  tour: Tour;
  status: ContentState;
  featured: boolean;
  sortOrder: number;
}): TourRecord {
  const tour = record.tour;
  // Enforce the price invariant at the storage boundary: when a package table
  // exists, "Từ …" is always its cheapest adult rate. A tour with no packages
  // keeps whatever `priceFrom` it came with (or `null` ⇒ "Liên hệ tư vấn").
  const priceAmount =
    tour.pricingOptions.length > 0
      ? Math.min(...tour.pricingOptions.map((option) => option.adultPrice))
      : (tour.priceFrom?.amount ?? null);
  const now = nowIso();

  withTransaction((db) => {
    const existing = db.prepare("SELECT id, slug, created_at, published_at FROM tour WHERE id = ?").get(tour.id) as
      | { id: string; slug: string; created_at: string; published_at: string | null }
      | undefined;

    // Slug changes are allowed but never silent: the old slug is redirected.
    if (existing && existing.slug !== tour.slug) {
      db.prepare(
        `INSERT INTO slug_redirect (entity_type, from_slug, to_slug, created_at)
         VALUES ('tour', ?, ?, ?)
         ON CONFLICT(entity_type, from_slug) DO UPDATE SET to_slug = excluded.to_slug`,
      ).run(existing.slug, tour.slug, now);
    }

    const createdAt = existing?.created_at ?? now;
    const publishedAt =
      record.status === "published" ? (existing?.published_at ?? now) : (existing?.published_at ?? null);

    db.prepare(
      `INSERT INTO tour (${TOUR_COLUMNS})
       VALUES (:id, :slug, :title, :summary, :tourCode, :durationDays, :durationNights,
         :priceAmount, :priceCurrency, :priceNote, :departurePoints, :returnPoints, :transport,
         :highlights, :overview, :included, :excluded, :notes, :policies, :tags, :gifts, :sourceDocuments,
         :seoTitle, :seoDescription, :seoOgImage, :contentStatus, :status, :featured, :sortOrder,
         :searchText, :createdAt, :updatedAt, :publishedAt, NULL)
       ON CONFLICT(id) DO UPDATE SET
         slug = excluded.slug,
         title = excluded.title,
         summary = excluded.summary,
         tour_code = excluded.tour_code,
         duration_days = excluded.duration_days,
         duration_nights = excluded.duration_nights,
         price_amount = excluded.price_amount,
         price_currency = excluded.price_currency,
         price_note = excluded.price_note,
         departure_points = excluded.departure_points,
         return_points = excluded.return_points,
         transport = excluded.transport,
         highlights = excluded.highlights,
         overview = excluded.overview,
         included = excluded.included,
         excluded = excluded.excluded,
         notes = excluded.notes,
         policies = excluded.policies,
         tags = excluded.tags,
         gifts = excluded.gifts,
         source_documents = excluded.source_documents,
         seo_title = excluded.seo_title,
         seo_description = excluded.seo_description,
         seo_og_image = excluded.seo_og_image,
         content_status = excluded.content_status,
         status = excluded.status,
         featured = excluded.featured,
         sort_order = excluded.sort_order,
         search_text = excluded.search_text,
         updated_at = excluded.updated_at,
         published_at = excluded.published_at,
         deleted_at = NULL`,
    ).run({
      id: tour.id,
      slug: tour.slug,
      title: tour.title,
      summary: tour.summary,
      tourCode: nullable(tour.tourCode),
      durationDays: tour.duration.days,
      durationNights: tour.duration.nights,
      priceAmount: nullable(priceAmount),
      priceCurrency: "VND",
      priceNote: nullable(tour.priceNote),
      departurePoints: toJson(tour.departurePoints),
      returnPoints: toJson(tour.returnPoints),
      transport: toJson(tour.transport),
      highlights: toJson(tour.highlights),
      overview: toJson(tour.overview),
      included: toJson(tour.included),
      excluded: toJson(tour.excluded),
      notes: toJson(tour.notes),
      policies: toJson(tour.policies),
      tags: toJson(tour.tags),
      gifts: toJson(tour.gifts ?? []),
      sourceDocuments: toJson(tour.sourceDocuments ?? []),
      seoTitle: nullable(tour.seo?.title),
      seoDescription: nullable(tour.seo?.description),
      seoOgImage: nullable(tour.seo?.ogImage),
      contentStatus: tour.contentStatus,
      status: record.status,
      featured: boolToInt(record.featured),
      sortOrder: record.sortOrder,
      searchText: searchTextFor(tour),
      createdAt,
      updatedAt: tour.updatedAt,
      publishedAt: nullable(publishedAt),
    });

    db.prepare("DELETE FROM tour_image WHERE tour_id = ?").run(tour.id);
    const insertImage = db.prepare(
      `INSERT INTO tour_image (id, tour_id, position, src, alt, width, height, caption, media_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    );
    tour.images.forEach((image, index) => {
      insertImage.run(
        newId("timg"),
        tour.id,
        index,
        nullable(image.src),
        image.alt,
        nullable(image.width),
        nullable(image.height),
        nullable(image.caption),
      );
    });

    db.prepare("DELETE FROM tour_itinerary_day WHERE tour_id = ?").run(tour.id);
    const insertDay = db.prepare(
      `INSERT INTO tour_itinerary_day (id, tour_id, position, title, summary, activities, meals, places, accommodation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    tour.itinerary.forEach((day, index) => {
      insertDay.run(
        day.id,
        tour.id,
        index + 1,
        day.title,
        nullable(day.summary),
        toJson(day.activities),
        toJson(day.meals),
        toJson(day.places),
        nullable(day.accommodation),
      );
    });

    db.prepare("DELETE FROM tour_pricing_option WHERE tour_id = ?").run(tour.id);
    const insertPrice = db.prepare(
      `INSERT INTO tour_pricing_option (id, tour_id, position, label, accommodation_class, adult_price, child_price, surcharge, valid_from, valid_to, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    tour.pricingOptions.forEach((option, index) => {
      insertPrice.run(
        option.id,
        tour.id,
        index,
        option.label,
        nullable(option.accommodationClass),
        option.adultPrice,
        option.childPrice,
        nullable(option.surcharge),
        nullable(option.validFrom),
        nullable(option.validTo),
        nullable(option.note),
      );
    });

    db.prepare("DELETE FROM tour_category WHERE tour_id = ?").run(tour.id);
    const insertCategory = db.prepare(
      "INSERT OR IGNORE INTO tour_category (tour_id, category_id) VALUES (?, ?)",
    );
    for (const categoryId of tour.categoryIds) insertCategory.run(tour.id, categoryId);

    db.prepare("DELETE FROM tour_destination WHERE tour_id = ?").run(tour.id);
    const insertDestination = db.prepare(
      "INSERT OR IGNORE INTO tour_destination (tour_id, destination_id) VALUES (?, ?)",
    );
    for (const destinationId of tour.destinationIds) insertDestination.run(tour.id, destinationId);
  });

  const saved = getTourRecordById(tour.id);
  if (!saved) throw new Error(`Tour ${tour.id} vanished after save`);
  return saved;
}

export function setTourStatus(id: string, status: ContentState): void {
  const now = nowIso();
  withTransaction((db) => {
    const existing = db.prepare("SELECT published_at, status FROM tour WHERE id = ?").get(id) as
      | { published_at: string | null; status: string }
      | undefined;
    if (!existing) throw new Error("Tour không tồn tại");
    const publishedAt =
      status === "published" ? (existing.published_at ?? now) : existing.published_at;
    db.prepare("UPDATE tour SET status = ?, published_at = ?, updated_at = ? WHERE id = ?").run(
      status,
      nullable(publishedAt),
      now,
      id,
    );
  });
}

export function setTourFlags(id: string, flags: { featured?: boolean; sortOrder?: number }): void {
  const current = getTourRecordById(id);
  if (!current) throw new Error("Tour không tồn tại");
  getDb()
    .prepare("UPDATE tour SET featured = ?, sort_order = ?, updated_at = ? WHERE id = ?")
    .run(
      boolToInt(flags.featured ?? current.featured),
      flags.sortOrder ?? current.sortOrder,
      nowIso(),
      id,
    );
}

export function softDeleteTour(id: string): void {
  getDb()
    .prepare("UPDATE tour SET deleted_at = ?, updated_at = ? WHERE id = ?")
    .run(nowIso(), nowIso(), id);
}

export function restoreTour(id: string): void {
  getDb()
    .prepare("UPDATE tour SET deleted_at = NULL, updated_at = ? WHERE id = ?")
    .run(nowIso(), id);
}

export function listTrashedTours(): TourRecord[] {
  const rows = getDb()
    .prepare(`SELECT ${TOUR_COLUMNS} FROM tour WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`)
    .all() as TourRow[];
  return rows.map(tourRecordFromRow);
}

/** Cheap count for the trash badge — no children loaded. */
export function countTrashedTours(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM tour WHERE deleted_at IS NOT NULL").get() as {
    n: number;
  };
  return row.n;
}

export function nextTourSortOrder(): number {
  const row = getDb().prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tour").get() as {
    next: number;
  };
  return row.next;
}

export function newestTourUpdatedAt(): string | null {
  const row = getDb().prepare("SELECT MAX(updated_at) AS value FROM tour WHERE status = 'published'").get() as {
    value: string | null;
  };
  return row.value;
}
