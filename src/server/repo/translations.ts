import { getDb } from "@/server/db/connection";
import { nowIso, nullable, parseJson, toJson } from "@/server/db/json";
import type {
  ArticleTranslation,
  CategoryTranslation,
  DestinationTranslation,
  TourTranslation,
} from "@/domain/localization";

/**
 * English (and future-locale) overlays, keyed by source record id.
 *
 * The `status` column carries `translationStatus`; the payload carries every
 * other field. `source_updated_at` is the guard that stops a stale overlay from
 * overwriting a newly imported source record (see `resolveTour`).
 */

export type TranslationEntity = "tour" | "category" | "destination" | "article";

export type Translations = {
  tour: Record<string, TourTranslation>;
  category: Record<string, CategoryTranslation>;
  destination: Record<string, DestinationTranslation>;
  article: Record<string, ArticleTranslation>;
};

type TranslationRow = {
  entity_type: string;
  entity_id: string;
  locale: string;
  source_updated_at: string | null;
  status: string;
  payload: string;
};

export function emptyTranslations(): Translations {
  return { tour: {}, category: {}, destination: {}, article: {} };
}

/** Every overlay for a locale, assembled back into the domain shapes. */
export function loadTranslations(locale: string): Translations {
  const rows = getDb()
    .prepare("SELECT * FROM content_translation WHERE locale = ?")
    .all(locale) as TranslationRow[];

  const result = emptyTranslations();

  for (const row of rows) {
    const payload = parseJson<Record<string, unknown>>(row.payload, {});
    const merged = {
      translationStatus: row.status,
      ...(row.source_updated_at ? { sourceUpdatedAt: row.source_updated_at } : {}),
      ...payload,
    };
    switch (row.entity_type) {
      case "tour":
        result.tour[row.entity_id] = merged as unknown as TourTranslation;
        break;
      case "category":
        result.category[row.entity_id] = merged as unknown as CategoryTranslation;
        break;
      case "destination":
        result.destination[row.entity_id] = merged as unknown as DestinationTranslation;
        break;
      case "article":
        result.article[row.entity_id] = merged as unknown as ArticleTranslation;
        break;
    }
  }

  return result;
}

export function getTranslation(
  entityType: TranslationEntity,
  entityId: string,
  locale: string,
): Record<string, unknown> | undefined {
  const row = getDb()
    .prepare(
      "SELECT status, source_updated_at, payload FROM content_translation WHERE entity_type = ? AND entity_id = ? AND locale = ?",
    )
    .get(entityType, entityId, locale) as TranslationRow | undefined;
  if (!row) return undefined;
  return {
    translationStatus: row.status,
    ...(row.source_updated_at ? { sourceUpdatedAt: row.source_updated_at } : {}),
    ...parseJson<Record<string, unknown>>(row.payload, {}),
  };
}

export function saveTranslation(record: {
  entityType: TranslationEntity;
  entityId: string;
  locale: string;
  status: string;
  sourceUpdatedAt?: string | null;
  payload: Record<string, unknown>;
}): void {
  getDb()
    .prepare(
      `INSERT INTO content_translation (entity_type, entity_id, locale, source_updated_at, status, payload, updated_at)
       VALUES (:entityType, :entityId, :locale, :sourceUpdatedAt, :status, :payload, :updatedAt)
       ON CONFLICT(entity_type, entity_id, locale) DO UPDATE SET
         source_updated_at = excluded.source_updated_at,
         status = excluded.status,
         payload = excluded.payload,
         updated_at = excluded.updated_at`,
    )
    .run({
      entityType: record.entityType,
      entityId: record.entityId,
      locale: record.locale,
      sourceUpdatedAt: nullable(record.sourceUpdatedAt),
      status: record.status,
      payload: toJson(record.payload),
      updatedAt: nowIso(),
    });
}

/** Drop a locale overlay entirely (used when the source record is re-imported). */
export function deleteTranslation(entityType: TranslationEntity, entityId: string, locale: string): void {
  getDb()
    .prepare("DELETE FROM content_translation WHERE entity_type = ? AND entity_id = ? AND locale = ?")
    .run(entityType, entityId, locale);
}

export function countTranslations(locale: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM content_translation WHERE locale = ?")
    .get(locale) as { n: number };
  return row.n;
}
