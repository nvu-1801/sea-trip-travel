import { z } from "zod";
import { tourSchema } from "./tour";

/**
 * CMS record shape for a tour.
 *
 * The public domain schema (`tourSchema`) describes what the website renders.
 * The CMS adds two editorial fields on top:
 *
 * - `_en` — an overlay translated in the Studio. It only carries human-language
 *   fields; identity, money, duration and image `src` stay in the source record
 *   so a translation can never fork them.
 * - `_enReviewed` — the owner has checked the translation, so it may be indexed.
 *
 * This module lives in `domain/` (not in the server store) because the Studio
 * form validates the draft client-side with the exact same rules the API uses.
 * Keep it browser-safe: no server-only imports.
 */

const translatedText = z.string().min(1);

export const translatedTourSchema = z.object({
  title: tourSchema.shape.title.optional(),
  summary: tourSchema.shape.summary.optional(),
  overview: tourSchema.shape.overview.removeDefault().optional(),
  // Kept as full itinerary days for backwards compatibility with existing CMS
  // records. The editor mirrors the source days so `id`/`index` can never drift.
  itinerary: tourSchema.shape.itinerary.removeDefault().optional(),
  highlights: tourSchema.shape.highlights.removeDefault().optional(),
  included: tourSchema.shape.included.removeDefault().optional(),
  excluded: tourSchema.shape.excluded.removeDefault().optional(),
  notes: tourSchema.shape.notes.removeDefault().optional(),
  policies: tourSchema.shape.policies.removeDefault().optional(),
  tags: tourSchema.shape.tags.removeDefault().optional(),
  seo: tourSchema.shape.seo,
  priceNote: tourSchema.shape.priceNote,
  badge: z.string().max(40).optional(),
  departurePoints: tourSchema.shape.departurePoints.removeDefault().optional(),
  /** Alt text for `images`, matched by position. */
  imageAlts: z.array(translatedText).optional(),
});

export type TranslatedTour = z.infer<typeof translatedTourSchema>;

export const tourRecordSchema = tourSchema.extend({
  _en: translatedTourSchema.optional(),
  _enReviewed: z.boolean().optional(),
});

export type TourRecord = z.infer<typeof tourRecordSchema>;
