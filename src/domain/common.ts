import { z } from "zod";

/**
 * Shared value objects used across the content models.
 * Zod is the single source of truth — TypeScript types are inferred so the
 * runtime validation and the static types can never drift apart.
 */

/** `demo` = unreviewed placeholder copy; `verified` = approved by the owner. */
export const contentStatusSchema = z.enum(["demo", "verified"]);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

/**
 * Content locales. `vi` is the source/default language; `en` is a translation.
 * The domain owns this union so Zod schemas and the i18n layer cannot drift.
 */
export const CONTENT_LOCALES = ["vi", "en"] as const;
export const contentLocaleSchema = z.enum(CONTENT_LOCALES);
export type ContentLocale = z.infer<typeof contentLocaleSchema>;

/**
 * How complete a translation is.
 * - `missing`  — no translation at all; the page must fall back to `vi`.
 * - `draft`    — machine/agent-written; readable in dev/preview, never indexed.
 * - `reviewed` — approved by the site owner; the only status safe to index.
 *
 * This is deliberately separate from `contentStatus` (demo/verified): a page can
 * have verified Vietnamese source and a draft English translation.
 */
export const translationStatusSchema = z.enum(["missing", "draft", "reviewed"]);
export type TranslationStatus = z.infer<typeof translationStatusSchema>;

/**
 * An image, or an explicit absence of one.
 * When `src` is omitted the UI renders the branded placeholder instead of
 * inventing a photo. Filling in `src` later is the only change required.
 */
export const imageAssetSchema = z.object({
  src: z.string().startsWith("/").optional(),
  alt: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  caption: z.string().optional(),
});
export type ImageAsset = z.infer<typeof imageAssetSchema>;

/** All prices are integers in VND — never floats, never formatted strings. */
export const moneySchema = z.object({
  amount: z.number().int().nonnegative(),
  currency: z.literal("VND"),
});
export type Money = z.infer<typeof moneySchema>;

/**
 * `null` means "price not published yet" and must render as
 * "Liên hệ tư vấn" — never as 0 ₫.
 */
export type PriceFrom = Money | null;

export const durationSchema = z.object({
  days: z.number().int().positive(),
  nights: z.number().int().nonnegative(),
});
export type Duration = z.infer<typeof durationSchema>;

export const seoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  ogImage: z.string().startsWith("/").optional(),
});
export type SeoMeta = z.infer<typeof seoSchema>;

/** Region buckets used by the "Tour Trong Nước" section. */
export const regionSchema = z.enum([
  "quy-nhon-phu-yen",
  "mien-bac",
  "mien-trung",
  "mien-nam",
  "tay-nguyen",
]);
export type Region = z.infer<typeof regionSchema>;

export const REGION_LABELS: Record<Region, string> = {
  "quy-nhon-phu-yen": "Quy Nhơn – Phú Yên",
  "mien-bac": "Miền Bắc",
  "mien-trung": "Miền Trung",
  "mien-nam": "Miền Nam",
  "tay-nguyen": "Tây Nguyên",
};

/** ISO-8601 calendar date, e.g. `2026-03-14`. */
export const isoDateSchema = z.iso.date();
export type IsoDate = z.infer<typeof isoDateSchema>;
