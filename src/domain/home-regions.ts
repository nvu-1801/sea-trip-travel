import { z } from "zod";
import { landingSchema } from "./landing";
import { tourCategorySchema } from "./category";

export const homeRegionsInputSchema = z.object({
  revision: z.number().int().nonnegative(),
  regions: landingSchema.shape.regions,
  action: z.enum(["save", "publish"]),
  cards: z
    .array(
      z.object({
        id: tourCategorySchema.shape.id,
        revision: z.number().int().nonnegative(),
        name: tourCategorySchema.shape.name.max(160),
        tagline: z.string().max(600),
        image: tourCategorySchema.shape.image,
      }),
    )
    .max(12),
});
export type HomeRegionsInput = z.infer<typeof homeRegionsInputSchema>;
