import { z } from "zod";
import { imageAssetSchema, seoSchema } from "./common";

/**
 * Article bodies are structured blocks rather than raw HTML or MDX.
 *
 * Why: content stays out of JSX, it is trivially serialisable (so a future
 * CMS/API can serve it over the wire unchanged), and rendering is a plain
 * discriminated-union switch with no `dangerouslySetInnerHTML` anywhere.
 */
export const articleBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string().min(1) }),
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal("list"),
    ordered: z.boolean().default(false),
    items: z.array(z.string().min(1)).min(1),
  }),
  z.object({ type: z.literal("quote"), text: z.string().min(1), cite: z.string().min(1).optional() }),
  z.object({
    type: z.literal("callout"),
    tone: z.enum(["info", "tip", "warning"]).default("info"),
    title: z.string().min(1).optional(),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal("image"),
    alt: z.string().min(1),
    src: z.string().startsWith("/").optional(),
    caption: z.string().min(1).optional(),
  }),
]);

export type ArticleBlock = z.infer<typeof articleBlockSchema>;

/** A travel-guide article under `/cam-nang-du-lich/[slug]`. */
export const travelArticleSchema = z.object({
  id: z.string().regex(/^art_[a-z0-9_]+$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  excerpt: z.string().min(1).max(240),
  /** Related destination ids, used for "bài viết liên quan". */
  destinationIds: z.array(z.string().min(1)).default([]),
  /** Related tour slugs, used for cross-linking back into the funnel. */
  relatedTourSlugs: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  readingMinutes: z.number().int().positive().optional(),
  cover: imageAssetSchema.optional(),
  body: z.array(articleBlockSchema).default([]),
  author: z.string().min(1).default("SEA TRIP TRAVEL"),
  publishedAt: z.iso.date(),
  updatedAt: z.iso.date().optional(),
  featured: z.boolean().default(false),
  seo: seoSchema.optional(),
  contentStatus: z.enum(["demo", "verified"]).default("demo"),
});

export type TravelArticle = z.infer<typeof travelArticleSchema>;
export type TravelArticleInput = z.input<typeof travelArticleSchema>;
