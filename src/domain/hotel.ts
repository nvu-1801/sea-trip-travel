import { z } from "zod";
import {
  contentStatusSchema,
  imageAssetSchema,
  seoSchema,
} from "./common";

/**
 * A place to stay: resort, hotel, homestay…
 *
 * Editorial content only. Prices and nightly room counts live in their own
 * tables (`hotel_rate_rules`, `hotel_availability`) because they are dated,
 * versioned operational data — not a marketing snapshot. Rooms are separate
 * records so one room can be drafted, published or archived on its own.
 */

export const LODGING_TYPES = [
  "resort",
  "hotel",
  "homestay",
  "villa",
  "apartment",
] as const;
export const lodgingTypeSchema = z.enum(LODGING_TYPES);
export type LodgingType = z.infer<typeof lodgingTypeSchema>;

/**
 * How Sea Trip presents room counts for this property.
 * - `on_request`  — never claim a number; ask sales to check.
 * - `manual_daily` — the owner types a reference count per night after calling
 *   the partner. It is still not a real-time inventory or a hold.
 */
export const roomModeSchema = z.enum(["on_request", "manual_daily"]);
export type RoomMode = z.infer<typeof roomModeSchema>;

export const MAX_HOTEL_IMAGES = 20;
export const MAX_HOTEL_FEATURED = 6;

const clockSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ phải có dạng HH:MM");

const translatedHotel = z.object({
  name: z.string().min(1).max(160).optional(),
  summary: z.string().min(1).max(400).optional(),
  description: z.array(z.string().min(1).max(4000)).max(20).optional(),
  address: z.string().min(1).max(240).optional(),
  amenities: z.array(z.string().min(1).max(80)).max(60).optional(),
  policies: z.array(z.string().min(1).max(400)).max(30).optional(),
  seo: seoSchema.optional(),
});

export const hotelDraftSchema = z
  .object({
    /** Stable identifier. Never reused, never recycled for another property. */
    id: z.string().regex(/^hotel_[a-z0-9_]+$/, "id phải có dạng hotel_abc"),
    /** URL-safe segment of the hotel’s public path. */
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1).max(160),
    /** Optional link to a `destinations` record, used for the location filter. */
    destinationId: z.string().min(1).optional(),
    /** Province/city shown on the card. Free text so a new place needs no seed. */
    province: z.string().trim().max(80),
    address: z.string().trim().max(240),
    /** Only an https map link; never rendered as an iframe. */
    mapUrl: z
      .url()
      .startsWith("https://", "Chỉ nhận liên kết bản đồ https")
      .max(500)
      .optional(),
    lodgingType: lodgingTypeSchema,
    /** `null` = the owner has not verified a star rating. Never invent one. */
    starRating: z
      .number()
      .int()
      .min(1, "Hạng sao từ 1 đến 5")
      .max(5, "Hạng sao từ 1 đến 5")
      .nullable()
      .default(null),
    /** Where the star rating comes from, e.g. "theo công bố của khách sạn". */
    starBasis: z.string().min(1).max(160).optional(),
    summary: z.string().trim().max(400),
    description: z.array(z.string().min(1).max(4000)).max(20).default([]),
    highlights: z.array(z.string().min(1).max(200)).max(10).default([]),
    amenities: z.array(z.string().min(1).max(80)).max(60).default([]),
    images: z.array(imageAssetSchema).max(MAX_HOTEL_IMAGES).default([]),
    checkInTime: clockSchema.optional(),
    checkOutTime: clockSchema.optional(),
    policies: z.array(z.string().min(1).max(400)).max(30).default([]),
    roomMode: roomModeSchema.default("on_request"),
    /** Editorial order in the catalogue ("Sea Trip đề xuất"). Lower first. */
    order: z.number().int().nonnegative().default(0),
    seo: seoSchema.optional(),
    contentStatus: contentStatusSchema.default("demo"),
    /** ISO timestamp of the last editorial change. */
    updatedAt: z.iso.datetime({ offset: true }),
    /** Reviewed English translation; absent keys fall back to Vietnamese. */
    _en: translatedHotel.optional(),
    _enReviewed: z.boolean().optional(),
  })
  .superRefine((hotel, ctx) => {
    // A star badge without a stated basis is a marketing claim we cannot back.
    if (hotel.starRating !== null && !hotel.starBasis) {
      ctx.addIssue({
        code: "custom",
        path: ["starBasis"],
        message: "Ghi rõ căn cứ hạng sao trước khi hiển thị sao",
      });
    }
  });

export const hotelSchema = hotelDraftSchema.safeExtend({
  province: hotelDraftSchema.shape.province.min(1, "Nhập tỉnh/thành phố"),
  address: hotelDraftSchema.shape.address.min(1, "Nhập địa chỉ"),
  summary: hotelDraftSchema.shape.summary.min(1, "Nhập mô tả ngắn"),
});

export type Hotel = z.infer<typeof hotelSchema>;
export type HotelInput = z.input<typeof hotelSchema>;

/** Human label for a lodging type. Vietnamese source of truth. */
export const LODGING_LABELS: Record<LodgingType, string> = {
  resort: "Khu nghỉ dưỡng",
  hotel: "Khách sạn",
  homestay: "Homestay",
  villa: "Biệt thự",
  apartment: "Căn hộ",
};

export const LODGING_LABELS_EN: Record<LodgingType, string> = {
  resort: "Resort",
  hotel: "Hotel",
  homestay: "Homestay",
  villa: "Villa",
  apartment: "Apartment",
};
