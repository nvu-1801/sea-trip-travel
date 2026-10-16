import { getDb } from "@/server/db/connection";
import { nowIso, parseJson, toJson } from "@/server/db/json";
import type { SiteSettings, SiteSettingKey } from "@/domain/settings";

/** Site settings: per-section, per-locale JSON, overlaid on the built-in defaults. */

export function loadSettingsByLocale(): Record<string, SiteSettings> {
  const rows = getDb().prepare("SELECT key, locale, value FROM site_setting").all() as {
    key: string;
    locale: string;
    value: string;
  }[];

  const result: Record<string, SiteSettings> = {};
  for (const row of rows) {
    const bucket = result[row.locale] ?? {};
    const section = parseJson<Record<string, unknown>>(row.value, {});
    (bucket as Record<string, unknown>)[row.key] = section;
    result[row.locale] = bucket;
  }
  return result;
}

export function getSettingSection(locale: string, key: SiteSettingKey): Record<string, unknown> {
  const row = getDb()
    .prepare("SELECT value FROM site_setting WHERE key = ? AND locale = ?")
    .get(key, locale) as { value: string } | undefined;
  return row ? parseJson<Record<string, unknown>>(row.value, {}) : {};
}

export function saveSettingSection(
  locale: string,
  key: SiteSettingKey,
  value: Record<string, unknown>,
): void {
  getDb()
    .prepare(
      `INSERT INTO site_setting (key, locale, value, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(key, locale) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, locale, toJson(value), nowIso());
}

/** Newest settings change — feeds the sitemap/`updatedAt` on the snapshot. */
export function settingsUpdatedAt(): string | null {
  const row = getDb().prepare("SELECT MAX(updated_at) AS value FROM site_setting").get() as {
    value: string | null;
  };
  return row.value;
}
