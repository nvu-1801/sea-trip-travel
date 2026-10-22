import { z } from "zod";
import { imageAssetSchema, regionSchema } from "./common";

/** The home "Khám phá" block is a three-card mosaic by design. */
export const MAX_HOME_DESTINATIONS = 3;

/**
 * A place customers recognise — Quy Nhơn, Phú Yên, Đà Nẵng, Hà Nội…
 * Destinations power the quick-explore grid on the home page and the
 * "điểm đến" line on a tour card.
 */
export const destinationSchema = z.object({
  /** Stable identifier. Never reused, never recycled for another place. */
  id: z.string().regex(/^dest_[a-z0-9_]+$/, "id must look like dest_ky_co"),
  /** Stable URL-safe slug. Changing it breaks links and SEO. */
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  region: regionSchema,
  /** One sentence shown on destination cards. */
  summary: z.string().min(1).max(180),
  /** Province or city, used for grouping. */
  province: z.string().min(1).optional(),
  image: imageAssetSchema.optional(),
  /** Display order inside its region. Never controls the home page. */
  order: z.number().int().nonnegative().default(0),
  /**
   * Explicit opt-in for the home page "Khám phá" block.
   *
   * Public selection depends on this flag only — never on the region, the
   * presence of a photo, or the record's position in the list. At most
   * `MAX_HOME_DESTINATIONS` records may be enabled.
   */
  showOnHome: z.boolean().default(false),
  /** Position inside the home "Khám phá" block. Lower numbers render first. */
  homeOrder: z.number().int().nonnegative().default(0),
  contentStatus: z.enum(["demo", "verified"]).default("demo"),
});

export type Destination = z.infer<typeof destinationSchema>;
/**
 * Input shape — fields carrying a Zod `.default()` are optional here, which is
 * what content files are annotated with so they don't have to repeat defaults.
 */
export type DestinationInput = z.input<typeof destinationSchema>;
