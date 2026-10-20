import { z } from "zod";
import {
  contentStatusSchema,
  durationSchema,
  imageAssetSchema,
  moneySchema,
  seoSchema,
} from "./common";

/**
 * One day (or half-day stop) of a tour programme.
 * Rendered as the "Lịch trình" timeline on the tour detail page.
 */
export const itineraryDaySchema = z.object({
  id: z.string().min(1),
  /** 1-based position; drives "Ngày 1", "Ngày 2"… */
  index: z.number().int().positive(),
  title: z.string().min(1),
  /** Short line summarising the day. */
  summary: z.string().min(1).optional(),
  /** Ordered activities. Plain sentences — no HTML. */
  activities: z.array(z.string().min(1)).default([]),
  /** Meal markers, e.g. ["Sáng", "Trưa", "Tối"]. */
  meals: z.array(z.string().min(1)).default([]),
  /** Overnight note, e.g. "Nghỉ đêm tại Quy Nhơn". Omit for day tours. */
  accommodation: z.string().min(1).optional(),
  /** Optional stop labels for the timeline chips. */
  places: z.array(z.string().min(1)).default([]),
});

export type ItineraryDay = z.infer<typeof itineraryDaySchema>;

/**
 * A tour. Reference data only — everything the marketing pages render lives
 * here, and nothing in here depends on how (or where) the data is stored.
 */
export const tourSchema = z.object({
  id: z.string().regex(/^tour_[a-z0-9_]+$/),
  /** Stable slug used by `/tour/[slug]`. Changing it breaks links + SEO. */
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  /** One-sentence promise shown on tour cards. */
  summary: z.string().min(1).max(220),
  /** Category membership (ids from `tourCategorySchema`). At least one. */
  categoryIds: z.array(z.string().min(1)).min(1),
  /** Destination ids from `destinationSchema`. */
  destinationIds: z.array(z.string().min(1)).default([]),
  duration: durationSchema,
  /** Where the tour starts. Omit when it is not confirmed. */
  departurePoints: z.array(z.string().min(1)).default([]),
  returnPoints: z.array(z.string().min(1)).default([]),
  transport: z.array(z.string().min(1)).default([]),
  tourCode: z.string().min(1).optional(),
  /** Editorial provenance; never render source filenames in the customer flow. */
  sourceDocuments: z.array(z.string().min(1)).default([]),
  pricingOptions: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    adultPrice: z.number().int().positive(),
    childPrice: z.number().int().nonnegative(),
  })).default([]),
  gifts: z.array(z.string().min(1)).default([]),
  /** `null` ⇒ "Liên hệ tư vấn". Never render 0 ₫. */
  priceFrom: moneySchema.nullable().default(null),
  /** Explains what the price does (or does not) include. */
  priceNote: z.string().min(1).optional(),
  /** Bullet list of selling points, 3–6 items is the sweet spot. */
  highlights: z.array(z.string().min(1)).default([]),
  /** Gallery. The first entry doubles as the card cover. */
  images: z.array(imageAssetSchema).default([]),
  /** Overview paragraphs, rendered in order. */
  overview: z.array(z.string().min(1)).default([]),
  itinerary: z.array(itineraryDaySchema).default([]),
  included: z.array(z.string().min(1)).default([]),
  excluded: z.array(z.string().min(1)).default([]),
  /** Practical notes / "Lưu ý". */
  notes: z.array(z.string().min(1)).default([]),
  /**
   * Cancellation + payment terms. Only render when the owner has supplied
   * verified wording — an empty array hides the whole block.
   */
  policies: z.array(z.string().min(1)).default([]),
  /** Free-form labels used for client-side filtering, e.g. ["1 ngày"]. */
  tags: z.array(z.string().min(1)).default([]),
  /**
   * Editorial pick label shown as a pill on the tour card, e.g. "Đề xuất".
   * Empty (default) hides the pill. The owner sets real bestsellers here —
   * never derive marketing claims from data.
   */
  badge: z.string().max(40).default(""),
  seo: seoSchema.optional(),
  contentStatus: contentStatusSchema.default("demo"),
  /** ISO timestamp of the last editorial change. Accepts a UTC or offset form. */
  updatedAt: z.iso.datetime({ offset: true }),
});

export type Tour = z.infer<typeof tourSchema>;
/**
 * Input shape for content files: fields with a Zod `.default()` are optional,
 * so a tour record need not restate `policies: []`, `contentStatus`, etc.
 */
export type TourInput = z.input<typeof tourSchema>;
