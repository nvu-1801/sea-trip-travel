import { z } from "zod";
import { contentStatusSchema, imageAssetSchema } from "./common";

/**
 * One bookable room type inside a hotel.
 *
 * Separate record from the hotel so a room can be drafted, published, priced
 * and archived independently. Capacity here is descriptive; Sea Trip never
 * sells a guaranteed allotment, so nothing in this schema is an inventory
 * counter.
 */

export const MAX_ROOM_IMAGES = 12;

const translatedRoom = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  bed: z.string().min(1).max(120).optional(),
  view: z.string().min(1).max(120).optional(),
  childPolicy: z.string().min(1).max(600).optional(),
  extraBedPolicy: z.string().min(1).max(600).optional(),
  amenities: z.array(z.string().min(1).max(80)).max(40).optional(),
});

export const hotelRoomSchema = z
  .object({
    id: z.string().regex(/^room_[a-z0-9_]+$/, "id phải có dạng room_abc"),
    hotelId: z.string().regex(/^hotel_[a-z0-9_]+$/),
    name: z.string().min(1).max(120),
    description: z.string().min(1).max(2000).optional(),
    /** Floor area in m². `null` = not confirmed, not zero. */
    sizeSqm: z.number().int().min(1).max(2000).nullable().default(null),
    bed: z.string().min(1).max(120).optional(),
    view: z.string().min(1).max(120).optional(),
    capacityAdults: z.number().int().min(1).max(20),
    capacityChildren: z.number().int().min(0).max(10).default(0),
    /** Hard ceiling for one room; sales still confirms every party. */
    maxOccupancy: z.number().int().min(1).max(30),
    childPolicy: z.string().min(1).max(600).optional(),
    extraBedPolicy: z.string().min(1).max(600).optional(),
    amenities: z.array(z.string().min(1).max(80)).max(40).default([]),
    images: z.array(imageAssetSchema).max(MAX_ROOM_IMAGES).default([]),
    order: z.number().int().nonnegative().default(0),
    contentStatus: contentStatusSchema.default("demo"),
    updatedAt: z.iso.datetime({ offset: true }),
    _en: translatedRoom.optional(),
    _enReviewed: z.boolean().optional(),
  })
  .superRefine((room, ctx) => {
    if (room.maxOccupancy < room.capacityAdults) {
      ctx.addIssue({
        code: "custom",
        path: ["maxOccupancy"],
        message: "Sức chứa tối đa không được nhỏ hơn số người tiêu chuẩn",
      });
    }
  });

export type HotelRoom = z.infer<typeof hotelRoomSchema>;
export type HotelRoomInput = z.input<typeof hotelRoomSchema>;
