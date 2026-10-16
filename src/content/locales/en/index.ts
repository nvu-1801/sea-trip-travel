import { z } from "zod";
import {
  articleTranslationSchema,
  categoryTranslationSchema,
  destinationTranslationSchema,
  tourTranslationSchema,
} from "@/domain/localization";
import { articleTranslations as rawArticles } from "./articles";
import { categoryTranslations as rawCategories } from "./categories";
import { destinationTranslations as rawDestinations } from "./destinations";
import { tourTranslations as rawTours } from "./tours";
import { customerTourTranslations } from "./customer-tours";

/**
 * English content overlays, validated at build time.
 *
 * A malformed translation (an unknown field, an empty string) breaks the build
 * exactly like malformed Vietnamese source does — translations are content, and
 * content is checked.
 */

export const tourTranslations = z.record(z.string(), tourTranslationSchema).parse({
  ...rawTours,
  ...customerTourTranslations,
});
export const categoryTranslations = z.record(z.string(), categoryTranslationSchema).parse(
  rawCategories,
);
export const destinationTranslations = z.record(z.string(), destinationTranslationSchema).parse(
  rawDestinations,
);
export const articleTranslations = z.record(z.string(), articleTranslationSchema).parse(rawArticles);
