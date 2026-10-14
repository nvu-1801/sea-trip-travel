import { z } from "zod";
import { seoSchema, translationStatusSchema, type TranslationStatus } from "./common";

/**
 * Translation overlays.
 *
 * The source records (`Tour`, `TourCategory`, `Destination`, `TravelArticle`)
 * stay in the default language. A translation is a *sibling* record keyed by the
 * source `id` that carries only the human-language fields — never the shared
 * facts (slug, ids, price, duration, image `src`).
 *
 * That split is the whole point: `slug`, relations and money live in exactly one
 * place, so translating a tour can never fork its identity or its price.
 */

const translatedText = z.string().min(1);

/** One day of the itinerary. Days are matched to the source by `1-based index`. */
export const itineraryDayTranslationSchema = z.object({
  title: translatedText.optional(),
  summary: translatedText.optional(),
  activities: z.array(translatedText).optional(),
  meals: z.array(translatedText).optional(),
  accommodation: translatedText.optional(),
  places: z.array(translatedText).optional(),
});
export type ItineraryDayTranslation = z.infer<typeof itineraryDayTranslationSchema>;

export const tourTranslationSchema = z.object({
  translationStatus: translationStatusSchema.default("draft"),
  title: translatedText.optional(),
  summary: translatedText.optional(),
  highlights: z.array(translatedText).optional(),
  overview: z.array(translatedText).optional(),
  itinerary: z.array(itineraryDayTranslationSchema).optional(),
  included: z.array(translatedText).optional(),
  excluded: z.array(translatedText).optional(),
  notes: z.array(translatedText).optional(),
  policies: z.array(translatedText).optional(),
  tags: z.array(translatedText).optional(),
  departurePoints: z.array(translatedText).optional(),
  priceNote: translatedText.optional(),
  /** Alt text for `images`, matched by position. */
  imageAlts: z.array(translatedText).optional(),
  seo: seoSchema.optional(),
});
export type TourTranslation = z.infer<typeof tourTranslationSchema>;
export type TourTranslationInput = z.input<typeof tourTranslationSchema>;

export const categoryTranslationSchema = z.object({
  translationStatus: translationStatusSchema.default("draft"),
  name: translatedText.optional(),
  tagline: translatedText.optional(),
  description: translatedText.optional(),
  seo: seoSchema.optional(),
});
export type CategoryTranslation = z.infer<typeof categoryTranslationSchema>;
export type CategoryTranslationInput = z.input<typeof categoryTranslationSchema>;

export const destinationTranslationSchema = z.object({
  translationStatus: translationStatusSchema.default("draft"),
  name: translatedText.optional(),
  province: translatedText.optional(),
  summary: translatedText.optional(),
  imageAlt: translatedText.optional(),
});
export type DestinationTranslation = z.infer<typeof destinationTranslationSchema>;
export type DestinationTranslationInput = z.input<typeof destinationTranslationSchema>;

/** A block body translated by position; only text-bearing fields carry over. */
export const articleBlockTranslationSchema = z.object({
  text: translatedText.optional(),
  title: translatedText.optional(),
  items: z.array(translatedText).optional(),
  cite: translatedText.optional(),
  alt: translatedText.optional(),
  caption: translatedText.optional(),
});
export type ArticleBlockTranslation = z.infer<typeof articleBlockTranslationSchema>;

export const articleTranslationSchema = z.object({
  translationStatus: translationStatusSchema.default("draft"),
  title: translatedText.optional(),
  excerpt: translatedText.optional(),
  tags: z.array(translatedText).optional(),
  /** Matched to `body` blocks by position. */
  body: z.array(articleBlockTranslationSchema).optional(),
  coverAlt: translatedText.optional(),
  seo: seoSchema.optional(),
});
export type ArticleTranslation = z.infer<typeof articleTranslationSchema>;
export type ArticleTranslationInput = z.input<typeof articleTranslationSchema>;

/** The shape a translation file exports: a map of source record id → overlay. */
export type TranslationMap<T> = Readonly<Record<string, T>>;

/**
 * A record resolved for one locale, carrying the provenance the pages need to
 * decide "show a draft banner?" and "is it safe to index?".
 */
export type Resolved<T> = {
  data: T;
  /** Locale actually rendered. */
  locale: "vi" | "en";
  /** Translation status of the requested locale. `vi` is always `reviewed`. */
  status: TranslationStatus;
  /** True when any part of the rendered content came from the Vietnamese source. */
  fallback: boolean;
};

/** English is only safe to publish/index once a human has reviewed it. */
export function isIndexable(status: TranslationStatus, locale: "vi" | "en"): boolean {
  if (locale === "vi") return true;
  return status === "reviewed";
}
