import { getDb } from "@/server/db/connection";
import { boolToInt, newId, nullable, nowIso, toJson } from "@/server/db/json";
import { withTransaction } from "@/server/db/tx";
import { articleFromParts, type Row } from "./mappers";
import type { ArticleRecord, ContentState } from "./types";
import type { ArticleBlock, TravelArticle } from "@/domain/article";

/**
 * Articles repository.
 *
 * `body` is stored as ordered `article_block` rows. The block `type` lives in a
 * column and the remaining fields in a JSON payload, so the discriminated union
 * can be reconstructed and re-validated by Zod on read.
 */

const ARTICLE_COLUMNS = `id, slug, title, excerpt, author, reading_minutes,
  cover_src, cover_alt, cover_width, cover_height, cover_caption, tags,
  published_at, updated_at, seo_title, seo_description, seo_og_image, content_status,
  status, featured, sort_order, created_at, record_updated_at, published_ts, deleted_at`;

type ArticleRow = Row & { status: string; featured: number; sort_order: number };

function blockToPayload(block: ArticleBlock): { type: string; payload: Record<string, unknown> } {
  const { type, ...rest } = block as ArticleBlock & Record<string, unknown>;
  return { type: String(type), payload: rest };
}

export function articleRecordFromRow(row: ArticleRow): ArticleRecord {
  const id = String(row.id);
  const blocks = getDb()
    .prepare("SELECT * FROM article_block WHERE article_id = ? ORDER BY position ASC")
    .all(id) as Row[];
  const destinationIds = (
    getDb()
      .prepare("SELECT destination_id AS value FROM article_destination WHERE article_id = ? ORDER BY rowid ASC")
      .all(id) as { value: string }[]
  ).map((entry) => entry.value);
  const tourSlugs = (
    getDb()
      .prepare("SELECT tour_slug AS value FROM article_tour WHERE article_id = ? ORDER BY rowid ASC")
      .all(id) as { value: string }[]
  ).map((entry) => entry.value);

  return {
    article: articleFromParts(row, {
      blocks,
      destinationIds,
      tourSlugs,
    }),
    status: String(row.status) as ContentState,
    featured: row.featured === 1,
    sortOrder: row.sort_order,
    createdAt: String(row.created_at),
    recordUpdatedAt: String(row.record_updated_at),
    publishedTs: row.published_ts === null ? null : String(row.published_ts),
    deletedAt: row.deleted_at === null ? null : String(row.deleted_at),
  };
}

export function getArticleRecordBySlug(slug: string): ArticleRecord | undefined {
  const row = getDb()
    .prepare(`SELECT ${ARTICLE_COLUMNS} FROM article WHERE slug = ?`)
    .get(slug) as ArticleRow | undefined;
  return row ? articleRecordFromRow(row) : undefined;
}

export function getArticleRecordById(id: string): ArticleRecord | undefined {
  const row = getDb().prepare(`SELECT ${ARTICLE_COLUMNS} FROM article WHERE id = ?`).get(id) as
    | ArticleRow
    | undefined;
  return row ? articleRecordFromRow(row) : undefined;
}

export type ArticleListOptions = {
  status?: ContentState | "all";
  includeDeleted?: boolean;
  query?: string;
};

export function listArticleRecords(options: ArticleListOptions = {}): ArticleRecord[] {
  const clauses: string[] = [];
  const params: Record<string, string> = {};
  if (!options.includeDeleted) clauses.push("deleted_at IS NULL");
  if (options.status && options.status !== "all") {
    clauses.push("status = :status");
    params.status = options.status;
  }
  if (options.query && options.query.trim()) {
    clauses.push("(title LIKE :q OR slug LIKE :q)");
    params.q = `%${options.query.trim()}%`;
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(`SELECT ${ARTICLE_COLUMNS} FROM article ${where} ORDER BY featured DESC, sort_order ASC, published_at DESC`)
    .all(params) as ArticleRow[];
  return rows.map(articleRecordFromRow);
}

export function listPublishedArticles(): TravelArticle[] {
  const rows = getDb()
    .prepare(
      `SELECT ${ARTICLE_COLUMNS} FROM article WHERE status = 'published' AND deleted_at IS NULL
       ORDER BY sort_order ASC, published_at DESC`,
    )
    .all() as ArticleRow[];
  return rows.map((row) => articleRecordFromRow(row).article);
}

export function articleSlugExists(slug: string, excludeId?: string): boolean {
  const row = getDb()
    .prepare("SELECT id FROM article WHERE slug = ? AND (? IS NULL OR id <> ?)")
    .get(slug, nullable(excludeId), nullable(excludeId)) as { id: string } | undefined;
  return Boolean(row);
}

export function countArticlesByState(): Record<ContentState | "trash" | "total", number> {
  const rows = getDb().prepare("SELECT status, deleted_at FROM article").all() as {
    status: string;
    deleted_at: string | null;
  }[];
  const counts = { draft: 0, published: 0, hidden: 0, trash: 0, total: rows.length };
  for (const row of rows) {
    if (row.deleted_at) counts.trash += 1;
    else if (row.status === "published") counts.published += 1;
    else if (row.status === "hidden") counts.hidden += 1;
    else counts.draft += 1;
  }
  return counts;
}

export function saveArticle(record: {
  article: TravelArticle;
  status: ContentState;
  featured: boolean;
  sortOrder: number;
}): ArticleRecord {
  const article = record.article;
  const now = nowIso();

  withTransaction((db) => {
    const existing = db
      .prepare("SELECT id, slug, created_at, published_ts FROM article WHERE id = ?")
      .get(article.id) as
      | { id: string; slug: string; created_at: string; published_ts: string | null }
      | undefined;

    if (existing && existing.slug !== article.slug) {
      db.prepare(
        `INSERT INTO slug_redirect (entity_type, from_slug, to_slug, created_at)
         VALUES ('article', ?, ?, ?)
         ON CONFLICT(entity_type, from_slug) DO UPDATE SET to_slug = excluded.to_slug`,
      ).run(existing.slug, article.slug, now);
    }

    const createdAt = existing?.created_at ?? now;
    const publishedTs =
      record.status === "published" ? (existing?.published_ts ?? now) : (existing?.published_ts ?? null);

    db.prepare(
      `INSERT INTO article (${ARTICLE_COLUMNS})
       VALUES (:id, :slug, :title, :excerpt, :author, :readingMinutes,
         :coverSrc, :coverAlt, :coverWidth, :coverHeight, :coverCaption, :tags,
         :publishedAt, :updatedAt, :seoTitle, :seoDescription, :seoOgImage, :contentStatus,
         :status, :featured, :sortOrder, :createdAt, :recordUpdatedAt, :publishedTs, NULL)
       ON CONFLICT(id) DO UPDATE SET
         slug = excluded.slug, title = excluded.title, excerpt = excluded.excerpt,
         author = excluded.author, reading_minutes = excluded.reading_minutes,
         cover_src = excluded.cover_src, cover_alt = excluded.cover_alt,
         cover_width = excluded.cover_width, cover_height = excluded.cover_height,
         cover_caption = excluded.cover_caption, tags = excluded.tags,
         published_at = excluded.published_at, updated_at = excluded.updated_at,
         seo_title = excluded.seo_title, seo_description = excluded.seo_description,
         seo_og_image = excluded.seo_og_image, content_status = excluded.content_status,
         status = excluded.status, featured = excluded.featured, sort_order = excluded.sort_order,
         record_updated_at = excluded.record_updated_at, published_ts = excluded.published_ts,
         deleted_at = NULL`,
    ).run({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      author: article.author,
      readingMinutes: nullable(article.readingMinutes),
      coverSrc: nullable(article.cover?.src),
      coverAlt: nullable(article.cover?.alt),
      coverWidth: nullable(article.cover?.width),
      coverHeight: nullable(article.cover?.height),
      coverCaption: nullable(article.cover?.caption),
      tags: toJson(article.tags),
      publishedAt: article.publishedAt,
      updatedAt: nullable(article.updatedAt),
      seoTitle: nullable(article.seo?.title),
      seoDescription: nullable(article.seo?.description),
      seoOgImage: nullable(article.seo?.ogImage),
      contentStatus: article.contentStatus,
      status: record.status,
      featured: boolToInt(record.featured),
      sortOrder: record.sortOrder,
      createdAt,
      recordUpdatedAt: now,
      publishedTs: nullable(publishedTs),
    });

    db.prepare("DELETE FROM article_block WHERE article_id = ?").run(article.id);
    const insertBlock = db.prepare(
      "INSERT INTO article_block (id, article_id, position, type, payload) VALUES (?, ?, ?, ?, ?)",
    );
    article.body.forEach((block, index) => {
      const { type, payload } = blockToPayload(block);
      insertBlock.run(newId("blk"), article.id, index, type, toJson(payload));
    });

    db.prepare("DELETE FROM article_destination WHERE article_id = ?").run(article.id);
    const insertDestination = db.prepare(
      "INSERT OR IGNORE INTO article_destination (article_id, destination_id) VALUES (?, ?)",
    );
    for (const destinationId of article.destinationIds) insertDestination.run(article.id, destinationId);

    db.prepare("DELETE FROM article_tour WHERE article_id = ?").run(article.id);
    const insertTour = db.prepare("INSERT OR IGNORE INTO article_tour (article_id, tour_slug) VALUES (?, ?)");
    for (const tourSlug of article.relatedTourSlugs) insertTour.run(article.id, tourSlug);
  });

  const saved = getArticleRecordById(article.id);
  if (!saved) throw new Error(`Article ${article.id} vanished after save`);
  return saved;
}

export function setArticleStatus(id: string, status: ContentState): void {
  const now = nowIso();
  withTransaction((db) => {
    const existing = db.prepare("SELECT published_ts FROM article WHERE id = ?").get(id) as
      | { published_ts: string | null }
      | undefined;
    if (!existing) throw new Error("Bài viết không tồn tại");
    const publishedTs =
      status === "published" ? (existing.published_ts ?? now) : existing.published_ts;
    db.prepare(
      "UPDATE article SET status = ?, published_ts = ?, record_updated_at = ? WHERE id = ?",
    ).run(status, nullable(publishedTs), now, id);
  });
}

export function setArticleFlags(id: string, flags: { featured?: boolean; sortOrder?: number }): void {
  const current = getArticleRecordById(id);
  if (!current) throw new Error("Bài viết không tồn tại");
  getDb()
    .prepare("UPDATE article SET featured = ?, sort_order = ?, record_updated_at = ? WHERE id = ?")
    .run(boolToInt(flags.featured ?? current.featured), flags.sortOrder ?? current.sortOrder, nowIso(), id);
}

export function softDeleteArticle(id: string): void {
  getDb()
    .prepare("UPDATE article SET deleted_at = ?, record_updated_at = ? WHERE id = ?")
    .run(nowIso(), nowIso(), id);
}

export function restoreArticle(id: string): void {
  getDb()
    .prepare("UPDATE article SET deleted_at = NULL, record_updated_at = ? WHERE id = ?")
    .run(nowIso(), id);
}

export function listTrashedArticles(): ArticleRecord[] {
  const rows = getDb()
    .prepare(`SELECT ${ARTICLE_COLUMNS} FROM article WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`)
    .all() as ArticleRow[];
  return rows.map(articleRecordFromRow);
}

/** Cheap count for the trash badge — no blocks loaded. */
export function countTrashedArticles(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM article WHERE deleted_at IS NOT NULL").get() as {
    n: number;
  };
  return row.n;
}

export function nextArticleSortOrder(): number {
  const row = getDb().prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM article").get() as {
    next: number;
  };
  return row.next;
}

export function newestArticleUpdatedAt(): string | null {
  const row = getDb()
    .prepare("SELECT MAX(COALESCE(updated_at, published_at)) AS value FROM article WHERE status = 'published'")
    .get() as { value: string | null };
  return row.value;
}
