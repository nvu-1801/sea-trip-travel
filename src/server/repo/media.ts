import { getDb } from "@/server/db/connection";
import { newId, nullable, nowIso, parseJson, toJson } from "@/server/db/json";
import type { MediaRecord } from "./types";

/**
 * Media library.
 *
 * Two storage kinds share one table:
 *   - `static`  — the 28 approved photographs already shipped under
 *                 `public/images/tours/*`. They are registered here so the
 *                 admin can pick them, but their URL is never rewritten.
 *   - `upload`  — files written to `UPLOAD_DIR` by the admin, served through
 *                 the `/media/[id]/[variant]` route handler.
 *
 * Binary data never enters SQLite.
 */

type MediaRow = {
  id: string;
  storage: string;
  url: string;
  filename: string | null;
  original_name: string | null;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  sha256: string | null;
  variants: string;
  alt_default: string | null;
  created_at: string;
  deleted_at: string | null;
};

function toMedia(row: MediaRow): MediaRecord {
  return {
    id: row.id,
    storage: row.storage === "static" ? "static" : "upload",
    url: row.url,
    filename: row.filename,
    originalName: row.original_name,
    mime: row.mime,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    sha256: row.sha256,
    variants: parseJson(row.variants, []),
    altDefault: row.alt_default,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

export type NewMedia = Omit<MediaRecord, "id" | "createdAt" | "deletedAt"> & { id?: string };

export function insertMedia(media: NewMedia): MediaRecord {
  const id = media.id ?? newId("med");
  getDb()
    .prepare(
      `INSERT INTO media (id, storage, url, filename, original_name, mime, bytes, width, height,
         sha256, variants, alt_default, created_at, deleted_at)
       VALUES (:id, :storage, :url, :filename, :originalName, :mime, :bytes, :width, :height,
         :sha256, :variants, :altDefault, :createdAt, NULL)`,
    )
    .run({
      id,
      storage: media.storage,
      url: media.url,
      filename: nullable(media.filename),
      originalName: nullable(media.originalName),
      mime: media.mime,
      bytes: media.bytes,
      width: nullable(media.width),
      height: nullable(media.height),
      sha256: nullable(media.sha256),
      variants: toJson(media.variants),
      altDefault: nullable(media.altDefault),
      createdAt: nowIso(),
    });
  const created = getMedia(id);
  if (!created) throw new Error("Không lưu được ảnh");
  return created;
}

export function getMedia(id: string): MediaRecord | undefined {
  const row = getDb().prepare("SELECT * FROM media WHERE id = ?").get(id) as MediaRow | undefined;
  return row ? toMedia(row) : undefined;
}

export function findMediaByUrl(url: string): MediaRecord | undefined {
  const row = getDb().prepare("SELECT * FROM media WHERE url = ?").get(url) as MediaRow | undefined;
  return row ? toMedia(row) : undefined;
}

export function findMediaBySha(sha256: string): MediaRecord | undefined {
  const row = getDb().prepare("SELECT * FROM media WHERE sha256 = ?").get(sha256) as
    | MediaRow
    | undefined;
  return row ? toMedia(row) : undefined;
}

export type MediaListOptions = {
  query?: string;
  storage?: "static" | "upload" | "all";
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
};

export function listMedia(options: MediaListOptions = {}): MediaRecord[] {
  const clauses: string[] = [];
  const params: Record<string, string | number> = {};
  if (!options.includeDeleted) clauses.push("deleted_at IS NULL");
  if (options.storage && options.storage !== "all") {
    clauses.push("storage = :storage");
    params.storage = options.storage;
  }
  if (options.query && options.query.trim()) {
    clauses.push("(url LIKE :q OR original_name LIKE :q OR alt_default LIKE :q)");
    params.q = `%${options.query.trim()}%`;
  }
  params.limit = options.limit ?? 200;
  params.offset = options.offset ?? 0;
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(`SELECT * FROM media ${where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`)
    .all(params) as MediaRow[];
  return rows.map(toMedia);
}

export function countMedia(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM media WHERE deleted_at IS NULL").get() as {
    n: number;
  };
  return row.n;
}

export function setMediaAlt(id: string, alt: string): void {
  getDb().prepare("UPDATE media SET alt_default = ? WHERE id = ?").run(alt, id);
}

export function softDeleteMedia(id: string): void {
  getDb().prepare("UPDATE media SET deleted_at = ? WHERE id = ?").run(nowIso(), id);
}

export function restoreMedia(id: string): void {
  getDb().prepare("UPDATE media SET deleted_at = NULL WHERE id = ?").run(id);
}

export function mediaUrlExists(url: string): boolean {
  const row = getDb().prepare("SELECT 1 AS x FROM media WHERE url = ?").get(url) as
    | { x: number }
    | undefined;
  return Boolean(row);
}

/**
 * Where a media URL is still referenced. Deleting an in-use image is blocked
 * (with the list of references) rather than silently breaking a live page.
 */
export function mediaReferences(url: string): string[] {
  const like = `%${url}%`;
  const refs: string[] = [];

  const tourImages = getDb()
    .prepare(
      `SELECT t.title AS title FROM tour_image ti JOIN tour t ON t.id = ti.tour_id
       WHERE ti.src = ? AND t.deleted_at IS NULL LIMIT 20`,
    )
    .all(url) as { title: string }[];
  for (const row of tourImages) refs.push(`Ảnh tour: ${row.title}`);

  const articles = getDb()
    .prepare(
      `SELECT title FROM article WHERE cover_src = ? AND deleted_at IS NULL LIMIT 20`,
    )
    .all(url) as { title: string }[];
  for (const row of articles) refs.push(`Ảnh bìa bài viết: ${row.title}`);

  const blocks = getDb()
    .prepare(
      `SELECT a.title AS title FROM article_block b JOIN article a ON a.id = b.article_id
       WHERE b.payload LIKE ? AND a.deleted_at IS NULL LIMIT 20`,
    )
    .all(like) as { title: string }[];
  for (const row of blocks) refs.push(`Nội dung bài viết: ${row.title}`);

  const settings = getDb()
    .prepare("SELECT COUNT(*) AS n FROM site_setting WHERE value LIKE ?")
    .get(like) as { n: number };
  if (settings.n > 0) refs.push(`Cấu hình trang chủ (${settings.n})`);

  return refs;
}
