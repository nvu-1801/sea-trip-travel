import { z } from "zod";
import { articleBlockSchema } from "./article";

/**
 * Admin form contracts.
 *
 * The admin UI posts a JSON payload (the editor's in-memory state) inside a
 * hidden form field. These schemas validate that payload server-side before a
 * single row is written, so the rich editor can never smuggle a malformed
 * record into the database — the same posture as the content-file importer.
 */

const trimmed = (max: number) => z.string().trim().max(max);
const optionalLine = trimmed(400).optional();
const lineList = z.array(z.string().trim().min(1).max(600)).default([]);

export const contentStateSchema = z.enum(["draft", "published", "hidden"]);
export const contentStatusSchema = z.enum(["demo", "verified"]);

/* --- Tours ---------------------------------------------------------------- */

export const adminPricingOptionSchema = z.object({
  id: trimmed(60).min(1).optional(),
  label: trimmed(160).min(1, "Gói giá cần có tên"),
  accommodationClass: optionalLine,
  adultPrice: z.coerce.number().int().positive("Giá người lớn phải lớn hơn 0"),
  childPrice: z.coerce.number().int().nonnegative().default(0),
  surcharge: optionalLine,
  validFrom: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.iso.date().optional(),
  ),
  validTo: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.iso.date().optional(),
  ),
  note: optionalLine,
});
export type AdminPricingOption = z.infer<typeof adminPricingOptionSchema>;

export const adminItineraryDaySchema = z.object({
  title: trimmed(200).min(1, "Lịch trình mỗi ngày cần tiêu đề"),
  summary: optionalLine,
  activities: lineList,
  meals: lineList,
  places: lineList,
  accommodation: optionalLine,
});
export type AdminItineraryDay = z.infer<typeof adminItineraryDaySchema>;

export const adminImageSchema = z.object({
  src: z.string().trim().startsWith("/").optional(),
  alt: trimmed(300).min(1, "Ảnh cần có mô tả (alt)"),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  caption: optionalLine,
});

export const adminTourPayloadSchema = z.object({
  id: z.string().trim().optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang"),
  title: trimmed(200).min(1, "Cần nhập tên tour"),
  summary: trimmed(220).min(1, "Cần nhập mô tả ngắn"),
  tourCode: trimmed(60).optional(),
  categoryIds: z.array(z.string().min(1)).min(1, "Chọn ít nhất một danh mục"),
  destinationIds: z.array(z.string().min(1)).default([]),
  durationDays: z.coerce.number().int().positive("Thời lượng phải lớn hơn 0 ngày"),
  durationNights: z.coerce.number().int().nonnegative().default(0),
  departurePoints: lineList,
  returnPoints: lineList,
  transport: lineList,
  priceNote: optionalLine,
  gifts: lineList,
  highlights: lineList,
  overview: z.array(z.string().trim().min(1).max(4000)).default([]),
  included: lineList,
  excluded: lineList,
  notes: lineList,
  policies: lineList,
  tags: lineList,
  images: z.array(adminImageSchema).default([]),
  itinerary: z.array(adminItineraryDaySchema).default([]),
  pricingOptions: z.array(adminPricingOptionSchema).default([]),
  seoTitle: trimmed(200).optional(),
  seoDescription: trimmed(320).optional(),
  seoOgImage: z.string().trim().startsWith("/").optional(),
  contentStatus: contentStatusSchema.default("demo"),
  status: contentStateSchema.default("draft"),
  featured: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
});
export type AdminTourPayload = z.infer<typeof adminTourPayloadSchema>;

/* --- Articles ------------------------------------------------------------- */

export const adminArticlePayloadSchema = z.object({
  id: z.string().trim().optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang"),
  title: trimmed(200).min(1, "Cần nhập tiêu đề"),
  excerpt: trimmed(240).min(1, "Cần nhập tóm tắt"),
  author: trimmed(120).default("SEA TRIP TRAVEL"),
  readingMinutes: z.coerce.number().int().positive().optional(),
  coverSrc: z.string().trim().startsWith("/").optional(),
  coverAlt: trimmed(300).optional(),
  tags: lineList,
  destinationIds: z.array(z.string().min(1)).default([]),
  relatedTourSlugs: z.array(z.string().min(1)).default([]),
  body: z.array(articleBlockSchema).default([]),
  publishedAt: z.iso.date("Ngày đăng chưa hợp lệ"),
  updatedAt: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.iso.date().optional(),
  ),
  seoTitle: trimmed(200).optional(),
  seoDescription: trimmed(320).optional(),
  seoOgImage: z.string().trim().startsWith("/").optional(),
  contentStatus: contentStatusSchema.default("demo"),
  status: contentStateSchema.default("draft"),
  featured: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
});
export type AdminArticlePayload = z.infer<typeof adminArticlePayloadSchema>;

/** A new article's cover must have alt text, mirroring the public schema. */
export function articleCoverFrom(payload: AdminArticlePayload) {
  if (!payload.coverSrc) return undefined;
  return { src: payload.coverSrc, alt: payload.coverAlt ?? payload.title };
}

/* --- Auth ----------------------------------------------------------------- */

export const loginFormSchema = z.object({
  username: z.string().trim().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const changePasswordFormSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  nextPassword: z.string().min(1, "Vui lòng nhập mật khẩu mới"),
  confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu mới"),
});

/* --- Leads ---------------------------------------------------------------- */

export const leadStatusSchema = z.enum(["new", "processing", "done"]);
