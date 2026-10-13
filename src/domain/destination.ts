import { z } from "zod";
import { imageAssetSchema, regionSchema } from "./common";

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
  /** Display order inside its region. */
  order: z.number().int().nonnegative().default(0),
  contentStatus: z.enum(["demo", "verified"]).default("demo"),
});

export type Destination = z.infer<typeof destinationSchema>;
/**
 * Input shape — fields carrying a Zod `.default()` are optional here, which is
 * what content files are annotated with so they don't have to repeat defaults.
 */
export type DestinationInput = z.input<typeof destinationSchema>;
