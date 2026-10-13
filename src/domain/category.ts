import { z } from "zod";
import { seoSchema } from "./common";
import { regionSchema } from "./common";

/**
 * A tour category — either a top-level landing page ("Tour Quy Nhơn - Phú Yên",
 * "Tour Trong Nước") or a child ("Tour Miền Bắc"). The `path` is the canonical,
 * human-readable Vietnamese URL without diacritics and is treated as immutable.
 */
export const tourCategorySchema = z.object({
  id: z.string().regex(/^cat_[a-z0-9_]+$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  /** Full public path, e.g. `/tour-trong-nuoc/tour-mien-bac`. */
  path: z.string().startsWith("/"),
  /** Menu label — must match the required menu wording exactly. */
  name: z.string().min(1),
  /** `null` for a top-level category. */
  parentId: z.string().nullable(),
  region: regionSchema,
  /** Intro paragraph rendered under the H1. */
  description: z.string().min(1),
  /** Optional supporting line for cards and the desktop mega-panel. */
  tagline: z.string().min(1).optional(),
  image: z
    .object({
      src: z.string().startsWith("/").optional(),
      alt: z.string().min(1),
    })
    .optional(),
  order: z.number().int().nonnegative().default(0),
  seo: seoSchema.optional(),
  contentStatus: z.enum(["demo", "verified"]).default("demo"),
});

export type TourCategory = z.infer<typeof tourCategorySchema>;
export type TourCategoryInput = z.input<typeof tourCategorySchema>;
