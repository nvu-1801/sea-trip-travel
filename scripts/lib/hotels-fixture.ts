/**
 * Local-only demo fixture for the hotel module.
 *
 * Used by `scripts/verify-hotels.mjs` and for manual UI review. It refuses to
 * run unless `HOTELS_FIXTURE_OK=1` and the database path is inside the current
 * worktree, so it can never touch a production volume by accident.
 *
 *   HOTELS_FIXTURE_OK=1 node --import tsx scripts/lib/hotels-fixture.ts <db> on|off
 */
import path from "node:path";
import os from "node:os";
import { list, save } from "@/server/cms/store";
import { saveAvailability, saveRateRules, saveTourLinks } from "@/server/hotels/store";

const [dbPath, mode = "on"] = process.argv.slice(2);

if (process.env.HOTELS_FIXTURE_OK !== "1") {
  console.error("Refusing to seed: set HOTELS_FIXTURE_OK=1 for local demo data.");
  process.exit(2);
}
if (!dbPath) {
  console.error("Usage: hotels-fixture.ts <db-path> [on|off]");
  process.exit(2);
}
const resolved = path.resolve(dbPath);
const inWorktree = resolved.startsWith(path.resolve(".") + path.sep);
const inTemp = resolved.startsWith(path.resolve(os.tmpdir()) + path.sep);
if (!inWorktree && !inTemp) {
  console.error("Refusing to seed outside the worktree or the temp directory.");
  process.exit(2);
}
process.env.CMS_DB_PATH = resolved;
process.env.CMS_ENABLED = "1";

const NOW = "2026-10-01T00:00:00.000Z";
const image = { src: "/images/hero/blue-bay.webp", alt: "Ảnh demo bãi biển" };

function hotelRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "hotel_demo_quynhon",
    slug: "demo-quy-nhon-resort",
    name: "Demo Quy Nhơn Resort",
    province: "Bình Định",
    address: "1 Trần Hưng Đạo, Quy Nhơn (dữ liệu demo)",
    lodgingType: "resort",
    starRating: 4,
    starBasis: "Theo công bố của khách sạn (dữ liệu demo)",
    summary: "Khách sạn demo dùng cho kiểm thử local, không xuất bản production.",
    description: ["Dữ liệu demo cho kiểm thử module khách sạn."],
    highlights: ["Sát biển", "Hồ bơi vô cực"],
    amenities: ["Hồ bơi", "Bãi biển", "Ăn sáng"],
    images: [image],
    checkInTime: "14:00",
    checkOutTime: "12:00",
    policies: ["Nhận phòng từ 14:00"],
    roomMode: "manual_daily",
    order: 0,
    contentStatus: "demo",
    updatedAt: NOW,
    ...overrides,
  };
}

function roomRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "room_demo_deluxe",
    hotelId: "hotel_demo_quynhon",
    name: "Deluxe hướng biển",
    description: "Phòng demo.",
    sizeSqm: 32,
    bed: "1 giường đôi",
    view: "Biển",
    capacityAdults: 2,
    capacityChildren: 1,
    maxOccupancy: 3,
    amenities: ["Ban công", "Minibar"],
    images: [],
    order: 0,
    contentStatus: "demo",
    updatedAt: NOW,
    ...overrides,
  };
}

function existing(collection: "hotels" | "hotelRooms", id: string) {
  return list(collection).find((row) => row.id === id);
}

function upsert(
  collection: "hotels" | "hotelRooms",
  data: Record<string, unknown>,
  action: "save" | "publish",
) {
  const row = existing(collection, String(data.id));
  save(collection, data, row?.revision ?? 0, action);
}

if (mode === "off" || mode === "on") {
  upsert("hotels", hotelRecord(), "publish");
  const rows = [
    roomRecord(),
    roomRecord({
      id: "room_demo_suite",
      name: "Suite gia đình",
      capacityAdults: 3,
      capacityChildren: 2,
      maxOccupancy: 5,
      order: 1,
    }),
  ];
  for (const room of rows) upsert("hotelRooms", room, "publish");

  const rates = [
    { id: "base", hotelId: "hotel_demo_quynhon", roomId: "room_demo_deluxe", kind: "base" as const, amount: 1_500_000 },
    { id: "weekend", hotelId: "hotel_demo_quynhon", roomId: "room_demo_deluxe", kind: "weekday" as const, weekdays: [5, 6], amount: 1_800_000 },
    { id: "suite", hotelId: "hotel_demo_quynhon", roomId: "room_demo_suite", kind: "base" as const, amount: 2_400_000 },
  ];
  try {
    saveRateRules({
      hotelId: "hotel_demo_quynhon",
      rooms: [
        { roomId: "room_demo_deluxe", expectedUpdatedAt: null, rules: [rates[0], rates[1]] },
        { roomId: "room_demo_suite", expectedUpdatedAt: null, rules: [rates[2]] },
      ],
    });
  } catch {
    // Already saved in an earlier run; keep it.
  }

  const today = new Date();
  const iso = (offset: number) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  saveAvailability({
    hotelId: "hotel_demo_quynhon",
    entries: [
      { roomId: "room_demo_deluxe", date: iso(30), rooms: 5 },
      { roomId: "room_demo_deluxe", date: iso(31), rooms: 2 },
      { roomId: "room_demo_suite", date: iso(30), rooms: 2 },
    ],
  });

  const preferredTour = list("tours").find(
    (row) => row.data.slug === "quy-nhon-phu-yen-3-ngay-2-dem",
  );
  const anyTour = preferredTour ?? list("tours")[0];
  if (anyTour) {
    try {
      saveTourLinks("hotel_demo_quynhon", [
        {
          hotelId: "hotel_demo_quynhon",
          roomId: "",
          tourSlug: String(anyTour.data.slug),
          relation: "additional",
          condition: "Demo: báo giá lưu trú riêng",
        },
      ]);
    } catch {
      // Link already present.
    }
  }

  const settings = list("settings")[0];
  save(
    "settings",
    {
      ...(settings.data as Record<string, unknown>),
      hotels: {
        enabled: mode === "on",
        homeVisible: mode === "on",
        featured: ["demo-quy-nhon-resort"],
      },
    },
    settings.revision,
    "publish",
  );
  console.log(`hotels fixture: ${mode}`);
}
