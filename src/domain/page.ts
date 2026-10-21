import { z } from "zod";
import { articleBlockSchema } from "./article";
import { imageAssetSchema, seoSchema } from "./common";
export const contentPageSchema = z.object({
  id: z.string().regex(/^page_[a-z0-9_]+$/),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(120),
  title: z.string().trim().min(1).max(200),
  summary: z.string().max(1000).default(""),
  cover: imageAssetSchema.optional(),
  body: z.array(articleBlockSchema).max(200).default([]),
  titleEn: z.string().max(200).default(""),
  summaryEn: z.string().max(1000).default(""),
  bodyEn: z.array(articleBlockSchema).max(200).default([]),
  translationReviewed: z.boolean().default(false),
  updatedAt: z.string().default("2026-10-13"),
  seo: seoSchema.optional(),
});
export type ContentPage = z.infer<typeof contentPageSchema>;
