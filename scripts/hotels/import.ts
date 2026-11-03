/**
 * Import hotel data the owner has the right to use (their own listing, an
 * export from the partner, or a licensed feed).
 *
 * It always writes DRAFTS with `contentStatus: "demo"`; there is deliberately
 * no publish flag. Third-party photos/prices/descriptions must not be copied
 * from another website into Sea Trip content — see docs/hotels/IMPORT.md.
 *
 *   HOTELS_IMPORT_OK=1 npm run hotels:import -- scripts/hotels/quynhon-demo.json
 *   HOTELS_IMPORT_OK=1 npm run hotels:import -- data/hotels.json --db data/local-hotels.sqlite
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { list, save } from "@/server/cms/store";
import { hotelSchema } from "@/domain/hotel";
import { hotelRoomSchema } from "@/domain/hotel-room";
import {
  rateRuleSchema,
  type RateRule,
} from "@/domain/hotel-pricing";
import {
  rateRulesUpdatedAt,
  saveAvailability,
  saveRateRules,
  saveTourLinks,
} from "@/server/hotels/store";

type ImageInput = { src: string; alt: string };
type RateInput = Omit<RateRule, "hotelId" | "roomId"> & { id?: string };
type RoomInput = {
  id?: string;
  name: string;
  description?: string;
  sizeSqm?: number | null;
  bed?: string;
  view?: string;
  capacityAdults: number;
  capacityChildren?: number;
  maxOccupancy: number;
  childPolicy?: string;
  extraBedPolicy?: string;
  amenities?: string[];
  images?: ImageInput[];
  order?: number;
  rates?: RateInput[];
};
type HotelInput = {
  id?: string;
  slug: string;
  name: string;
  province: string;
  address: string;
  destinationId?: string;
  mapUrl?: string;
  lodgingType: string;
  starRating?: number | null;
  starBasis?: string;
  summary: string;
  description?: string[];
  highlights?: string[];
  amenities?: string[];
  images?: ImageInput[];
  checkInTime?: string;
  checkOutTime?: string;
  policies?: string[];
  roomMode?: "on_request" | "manual_daily";
  order?: number;
  rooms?: RoomInput[];
  availabilityOffsets?: { days: number; rooms: number; closed?: boolean }[];
  tourLinks?: {
    tourSlug: string;
    relation: "included" | "upgrade" | "additional";
    condition?: string;
  }[];
};
type ImportFile = { hotels: HotelInput[] };

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
const dbFlag = args.indexOf("--db");
const dbPath = dbFlag >= 0 ? args[dbFlag + 1] : undefined;

if (process.env.HOTELS_IMPORT_OK !== "1") {
  console.error("Refusing to import: set HOTELS_IMPORT_OK=1 for a local import.");
  process.exit(2);
}
if (!file) {
  console.error("Usage: hotels:import <file.json> [--db data/local.sqlite]");
  process.exit(2);
}
if (args.includes("--publish")) {
  console.error(
    "Import never publishes. Review the drafts in the Studio and publish there.",
  );
  process.exit(2);
}
if (dbPath) process.env.CMS_DB_PATH = path.resolve(dbPath);
process.env.CMS_ENABLED = "1";

const source = JSON.parse(
  readFileSync(path.resolve(file), "utf8"),
) as ImportFile;

if (!Array.isArray(source.hotels) || source.hotels.length === 0) {
  console.error("File must contain { hotels: [...] }.");
  process.exit(2);
}

const publicDir = path.resolve("public");
const allowedImage = /^\/(?:images|api\/media)\//;

function imageOf(image: ImageInput): ImageInput {
  if (!allowedImage.test(image.src)) {
    throw new Error(
      `Ảnh phải là file nội bộ (/images/...) hoặc media đã tải (/api/media/...): ${image.src}. Không dùng ảnh tải trực tiếp từ website khác.`,
    );
  }
  if (image.src.startsWith("/images/")) {
    const onDisk = path.join(publicDir, image.src.replace(/^\//, ""));
    if (!existsSync(onDisk))
      throw new Error(`Không thấy file ảnh: public${image.src}`);
  }
  return { src: image.src, alt: image.alt };
}

function idFromSlug(slug: string) {
  return `hotel_${slug.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 50)}`;
}

function roomId(slug: string, name: string, index: number) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);
  return `room_${slug.replace(/-/g, "_").slice(0, 20)}_${base || "phong"}_${index + 1}`;
}

function dayOffset(days: number) {
  const today = new Date();
  const date = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + days,
  );
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function existingRevision(collection: "hotels" | "hotelRooms", id: string) {
  const row = list(collection).find((item) => item.id === id);
  return row?.revision ?? 0;
}

let hotelsImported = 0;
let roomsImported = 0;
let ratesImported = 0;

for (const entry of source.hotels) {
  const id = entry.id ?? idFromSlug(entry.slug);
  const now = new Date().toISOString();
  const data = hotelSchema.parse({
    ...entry,
    id,
    contentStatus: "demo",
    updatedAt: now,
    images: (entry.images ?? []).map(imageOf),
    rooms: undefined,
    availabilityOffsets: undefined,
    tourLinks: undefined,
  });
  save("hotels", data, existingRevision("hotels", id), "save");
  hotelsImported += 1;

  const roomRefs: string[] = [];
  (entry.rooms ?? []).forEach((roomInput, index) => {
    const rid = roomInput.id ?? roomId(entry.slug, roomInput.name, index);
    const room = hotelRoomSchema.parse({
      ...roomInput,
      id: rid,
      hotelId: id,
      contentStatus: "demo",
      updatedAt: now,
      images: (roomInput.images ?? []).map(imageOf),
      rates: undefined,
    });
    save(
      "hotelRooms",
      room,
      existingRevision("hotelRooms", rid),
      "save",
    );
    roomsImported += 1;
    roomRefs.push(rid);

    if (roomInput.rates && roomInput.rates.length > 0) {
      const rules = roomInput.rates.map((rate, rateIndex) =>
        rateRuleSchema.parse({
          ...rate,
          id: rate.id ?? `${rid}-${rateIndex}`,
          hotelId: id,
          roomId: rid,
        }),
      );
      saveRateRules({
        hotelId: id,
        rooms: [
          {
            roomId: rid,
            expectedUpdatedAt: rateRulesUpdatedAt(rid),
            rules,
          },
        ],
      });
      ratesImported += rules.length;
    }
  });

  if (entry.availabilityOffsets?.length && roomRefs.length > 0) {
    saveAvailability({
      hotelId: id,
      entries: entry.availabilityOffsets.flatMap((slot) =>
        roomRefs.map((rid) => ({
          roomId: rid,
          date: dayOffset(slot.days),
          rooms: slot.rooms,
          closed: slot.closed,
        })),
      ),
    });
  }

  if (entry.tourLinks?.length) {
    const known = new Set(
      list("tours").map((row) => String(row.data.slug ?? "")),
    );
    const links = entry.tourLinks.filter((link) => known.has(link.tourSlug));
    if (links.length > 0)
      saveTourLinks(
        id,
        links.map((link) => ({
          hotelId: id,
          roomId: "",
          tourSlug: link.tourSlug,
          relation: link.relation,
          condition: link.condition ?? "",
        })),
      );
  }

  console.log(
    `draft: ${String(data.name)} (${data.slug}) · ${roomRefs.length} room(s)`,
  );
}

console.log(
  `\nImported as drafts: ${hotelsImported} hotel(s), ${roomsImported} room(s), ${ratesImported} rate rule(s).`,
);
console.log(
  "Nothing was published. Open Studio → Khách sạn to review, add real photos/prices you have rights to, then publish.",
);
