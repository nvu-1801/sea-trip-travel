import "server-only";
import { z } from "zod";
import { audit, db, transaction, type AuditContext } from "@/server/cms/db";
import { encrypt, decrypt } from "@/server/cms/leads";
import { list, published } from "@/server/cms/store";
import { hotelSchema, type Hotel } from "@/domain/hotel";
import { hotelRoomSchema, type HotelRoom } from "@/domain/hotel-room";
import {
  MAX_ROOM_QUANTITY,
  rateRuleSchema,
  rulesOverlap,
  type RateRule,
  type StoredRateRule,
  type TourRelation,
  tourRelationSchema,
} from "@/domain/hotel-pricing";
import { parseIsoDate } from "@/lib/date";

/**
 * Storage for the hotel module's operational data.
 *
 * Editorial content (hotel, room) goes through the CMS `records` table so it
 * inherits draft/publish/revision/trash. Prices, nightly room counts and tour
 * relations are live operational rows: they are written separately from the
 * editorial draft and invalidate public caches through DB triggers.
 */

const MAX_RATE_RULES_PER_ROOM = 200;
const MAX_AVAILABILITY_DATES = 400;
const MAX_AVAILABILITY_ENTRIES = 4000;
const MAX_LINKS_PER_HOTEL = 40;
const MAX_QUOTE_AMOUNT = 1_000_000_000_000;

export type TourLink = {
  hotelId: string;
  roomId: string;
  tourSlug: string;
  relation: TourRelation;
  condition: string;
};

export type HotelLeadPlan = {
  leadId: string;
  quoteAmount: number | null;
  quoteNote: string;
  confirmedOption: string;
  bookingId: string | null;
  updatedAt: string;
};

/* -------------------------------------------------------------------------- */
/* Published editorial reads                                                   */
/* -------------------------------------------------------------------------- */

export function publishedHotels(): Hotel[] {
  return published<Hotel>("hotels", []).map((row) => hotelSchema.parse(row));
}

export function publishedRooms(): HotelRoom[] {
  return published<HotelRoom>("hotelRooms", []).map((row) =>
    hotelRoomSchema.parse(row),
  );
}

export function publishedHotelBySlug(
  slug: string,
  hotels: readonly Hotel[] = publishedHotels(),
): Hotel | undefined {
  return hotels.find((hotel) => hotel.slug === slug);
}

/** Published rooms of a hotel, in the owner's order. */
export function publishedRoomsOf(
  hotelId: string,
  rooms: readonly HotelRoom[] = publishedRooms(),
): HotelRoom[] {
  return rooms
    .filter((room) => room.hotelId === hotelId)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "vi"));
}

/** Draft or published — used by the Studio, never by the public projection. */
export function adminRoomsOf(hotelId: string): HotelRoom[] {
  return list("hotelRooms")
    .filter((row) => row.state !== "deleted" && row.data.hotelId === hotelId)
    .map((row) => hotelRoomSchema.parse(row.data))
    .sort((a, b) => a.order - b.order);
}

/* -------------------------------------------------------------------------- */
/* Rate rules                                                                  */
/* -------------------------------------------------------------------------- */

type RateRow = {
  id: string;
  hotel_id: string;
  room_id: string;
  kind: string;
  weekdays: string;
  start_date: string | null;
  end_date: string | null;
  amount: number;
  includes_breakfast: number;
  includes_tax: number;
  fees_note: string;
  label: string;
  created_at: string;
  updated_at: string;
};

function toStoredRate(row: RateRow): StoredRateRule {
  return {
    id: row.id,
    kind: row.kind as StoredRateRule["kind"],
    weekdays: row.weekdays
      ? row.weekdays
          .split(",")
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
      : [],
    startDate: row.start_date,
    endDate: row.end_date,
    amount: row.amount,
    includesBreakfast: row.includes_breakfast === 1,
    includesTax: row.includes_tax === 1,
    feesNote: row.fees_note,
    label: row.label,
  };
}

export function listRateRules(hotelId: string): StoredRateRule[] {
  return (
    db()
      .prepare(
        "SELECT * FROM hotel_rate_rules WHERE hotel_id=? ORDER BY room_id, kind, start_date",
      )
      .all(hotelId) as RateRow[]
  ).map(toStoredRate);
}

/** Rules grouped by room for the Studio calendar. */
export function listRateRulesByRoom(
  hotelId: string,
): Record<string, StoredRateRule[]> {
  const grouped: Record<string, StoredRateRule[]> = {};
  const rows = db()
    .prepare(
      "SELECT * FROM hotel_rate_rules WHERE hotel_id=? ORDER BY room_id, kind, start_date",
    )
    .all(hotelId) as RateRow[];
  for (const row of rows) {
    const bucket = grouped[row.room_id] ?? [];
    bucket.push(toStoredRate(row));
    grouped[row.room_id] = bucket;
  }
  return grouped;
}

/** All rate rules grouped by room, for a list of rooms. */
export function rateRulesByRoom(
  roomIds: readonly string[],
): Map<string, StoredRateRule[]> {
  const grouped = new Map<string, StoredRateRule[]>();
  if (roomIds.length === 0) return grouped;
  const placeholders = roomIds.map(() => "?").join(",");
  const rows = db()
    .prepare(
      `SELECT * FROM hotel_rate_rules WHERE room_id IN (${placeholders}) ORDER BY room_id, kind`,
    )
    .all(...roomIds) as RateRow[];
  for (const row of rows) {
    const bucket = grouped.get(row.room_id) ?? [];
    bucket.push(toStoredRate(row));
    grouped.set(row.room_id, bucket);
  }
  return grouped;
}

/** Latest write for a room's rate rules, used for optimistic conflict checks. */
export function rateRulesUpdatedAt(roomId: string): string | null {
  const row = db()
    .prepare("SELECT MAX(updated_at) AS at FROM hotel_rate_rules WHERE room_id=?")
    .get(roomId) as { at: string | null } | undefined;
  return row?.at ?? null;
}

export type SaveRatesInput = {
  hotelId: string;
  rooms: {
    roomId: string;
    rules: z.input<typeof rateRuleSchema>[];
    /** `null` = this room had no rules when the editor loaded. */
    expectedUpdatedAt: string | null;
  }[];
};

function assertRoomOfHotel(roomId: string, hotelId: string) {
  const row = db()
    .prepare(
      "SELECT data FROM records WHERE collection='hotelRooms' AND id=? AND state!='deleted'",
    )
    .get(roomId) as { data: string } | undefined;
  if (!row) throw new Error("Hạng phòng không tồn tại");
  const room = hotelRoomSchema.parse(JSON.parse(row.data));
  if (room.hotelId !== hotelId)
    throw new Error("Hạng phòng không thuộc khách sạn này");
}

/**
 * Replaces the whole rule set of each room in one transaction. Overlaps are
 * rejected before anything is written, so a partial save is impossible.
 */
export function saveRateRules(
  input: SaveRatesInput,
  context: AuditContext = {},
) {
  if (input.rooms.length === 0) throw new Error("Chưa chọn hạng phòng");
  if (input.rooms.length > 20) throw new Error("Quá nhiều hạng phòng trong một lần lưu");

  const prepared = new Map<string, { rules: RateRule[] }>();
  for (const [roomIndex, room] of input.rooms.entries()) {
    assertRoomOfHotel(room.roomId, input.hotelId);
    if (room.rules.length > MAX_RATE_RULES_PER_ROOM)
      throw new Error("Quá nhiều quy tắc giá cho một hạng phòng");
    const parsed = room.rules.map((rule, index) => {
      const parsedRule = rateRuleSchema.safeParse({
        ...rule,
        id: rule.id || `${room.roomId}-${index}`,
        hotelId: input.hotelId,
        roomId: room.roomId,
      });
      if (!parsedRule.success)
        throw new z.ZodError(parsedRule.error.issues.map((issue) => ({
          ...issue, path: ["rooms", roomIndex, "rules", index, ...issue.path],
        })));
      return parsedRule.data;
    });
    if (parsed.filter((rule) => rule.kind === "base").length > 1)
      throw new Error("Mỗi hạng phòng chỉ có một giá cơ bản");
    for (let i = 0; i < parsed.length; i += 1) {
      for (let j = i + 1; j < parsed.length; j += 1) {
        if (
          rulesOverlap(
            {
              kind: parsed[i].kind,
              weekdays: parsed[i].weekdays,
              startDate: parsed[i].startDate ?? null,
              endDate: parsed[i].endDate ?? null,
            },
            {
              kind: parsed[j].kind,
              weekdays: parsed[j].weekdays,
              startDate: parsed[j].startDate ?? null,
              endDate: parsed[j].endDate ?? null,
            },
          )
        )
          throw new Error(
            "Hai quy tắc giá cùng mức ưu tiên đang chồng lấn. Sửa lại khoảng ngày hoặc thứ.",
          );
      }
    }
    prepared.set(room.roomId, { rules: parsed });
  }

  return transaction(() => {
    for (const room of input.rooms) {
      const current = rateRulesUpdatedAt(room.roomId);
      if ((current ?? null) !== (room.expectedUpdatedAt ?? null))
        throw new Error(
          "Giá đã được cập nhật ở nơi khác. Tải lại trước khi lưu.",
        );
    }
    const now = new Date().toISOString();
    const insert = db().prepare(
      "INSERT INTO hotel_rate_rules(id,hotel_id,room_id,kind,weekdays,start_date,end_date,amount,includes_breakfast,includes_tax,fees_note,label,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    );
    for (const room of input.rooms) {
      db().prepare("DELETE FROM hotel_rate_rules WHERE room_id=?").run(room.roomId);
      const rules = prepared.get(room.roomId)?.rules ?? [];
      for (const [index, rule] of rules.entries()) {
        insert.run(
          `${room.roomId}-${now}-${index}`,
          input.hotelId,
          room.roomId,
          rule.kind,
          rule.kind === "weekday" ? rule.weekdays.join(",") : "",
          rule.kind === "date_range" ? (rule.startDate ?? null) : null,
          rule.kind === "date_range" ? (rule.endDate ?? null) : null,
          rule.amount,
          rule.includesBreakfast ? 1 : 0,
          rule.includesTax ? 1 : 0,
          rule.feesNote ?? "",
          rule.label ?? "",
          now,
          now,
        );
      }
    }
    audit("hotel-rates-save", `hotels/${input.hotelId}`, {
      ...context,
      details: {
        hotelId: input.hotelId,
        rooms: input.rooms.map((room) => ({
          roomId: room.roomId,
          rules: prepared.get(room.roomId)?.rules.length ?? 0,
        })),
      },
    });
    return {
      updatedAt: now,
      rooms: input.rooms.map((room) => ({
        roomId: room.roomId,
        updatedAt: now,
      })),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Availability                                                                */
/* -------------------------------------------------------------------------- */

type AvailabilityDbRow = {
  room_id: string;
  date: string;
  rooms: number;
  closed: number;
  note: string;
  updated_at: string;
};

export function availabilityByRoom(
  roomIds: readonly string[],
  from: string | null,
  to: string | null,
): Map<string, { date: string; rooms: number; closed: boolean; updatedAt: string; note: string }[]> {
  const grouped = new Map<string, { date: string; rooms: number; closed: boolean; updatedAt: string; note: string }[]>();
  if (roomIds.length === 0) return grouped;
  const placeholders = roomIds.map(() => "?").join(",");
  const rows = db()
    .prepare(
      `SELECT * FROM hotel_availability WHERE room_id IN (${placeholders})
        AND (? IS NULL OR date>=?) AND (? IS NULL OR date<=?)
        ORDER BY date`,
    )
    .all(...roomIds, from, from, to, to) as AvailabilityDbRow[];
  for (const row of rows) {
    const list = grouped.get(row.room_id) ?? [];
    list.push({
      date: row.date,
      rooms: row.rooms,
      closed: row.closed === 1,
      updatedAt: row.updated_at,
      note: row.note,
    });
    grouped.set(row.room_id, list);
  }
  return grouped;
}

export type AvailabilityInput = {
  hotelId: string;
  /** `null` = clear the typed count for that date. */
  entries: {
    roomId: string;
    date: string;
    rooms: number | null;
    /** Partner paused arrivals; distinct from "0 rooms". */
    closed?: boolean;
  }[];
};

export function saveAvailability(
  input: AvailabilityInput,
  context: AuditContext = {},
) {
  if (input.entries.length === 0) throw new Error("Chưa chọn ngày nào");
  if (input.entries.length > MAX_AVAILABILITY_ENTRIES)
    throw new Error("Quá nhiều ô trong một lần lưu");

  const byRoom = new Map<
    string,
    { date: string; rooms: number | null; closed: boolean }[]
  >();
  for (const entry of input.entries) {
    if (!parseIsoDate(entry.date)) throw new Error("Ngày không hợp lệ");
    if (entry.rooms !== null) {
      if (!Number.isInteger(entry.rooms) || entry.rooms < 0 || entry.rooms > 999)
        throw new Error("Số phòng phải là số nguyên từ 0 đến 999");
    }
    if (entry.rooms === null && entry.closed)
      throw new Error("Ngày trống không thể đánh dấu ngừng nhận");
    const dates = byRoom.get(entry.roomId) ?? [];
    dates.push({
      date: entry.date,
      rooms: entry.rooms,
      closed: Boolean(entry.closed),
    });
    byRoom.set(entry.roomId, dates);
  }
  for (const [roomId, dates] of byRoom) {
    assertRoomOfHotel(roomId, input.hotelId);
    if (new Set(dates.map((item) => item.date)).size !== dates.length)
      throw new Error("Một ngày bị nhập hai lần");
    if (dates.length > MAX_AVAILABILITY_DATES)
      throw new Error("Mỗi hạng phòng chỉ cập nhật tối đa 400 ngày mỗi lần");
  }

  return transaction(() => {
    const now = new Date().toISOString();
    const upsert = db().prepare(
      "INSERT INTO hotel_availability(room_id,date,rooms,closed,note,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(room_id,date) DO UPDATE SET rooms=excluded.rooms,closed=excluded.closed,updated_at=excluded.updated_at",
    );
    const remove = db().prepare(
      "DELETE FROM hotel_availability WHERE room_id=? AND date=?",
    );
    for (const [roomId, dates] of byRoom) {
      for (const entry of dates) {
        if (entry.rooms === null) remove.run(roomId, entry.date);
        // `0` (sold out) and "closed" (partner paused arrivals) are different
        // facts. Both block a selection and both are stored explicitly.
        else upsert.run(roomId, entry.date, entry.rooms, entry.closed ? 1 : 0, "", now);
      }
    }
    audit("hotel-availability-save", `hotels/${input.hotelId}`, {
      ...context,
      details: {
        hotelId: input.hotelId,
        entries: input.entries.length,
      },
    });
    return { updatedAt: now, entries: input.entries.length };
  });
}

/* -------------------------------------------------------------------------- */
/* Tour links                                                                  */
/* -------------------------------------------------------------------------- */

type LinkRow = {
  hotel_id: string;
  room_id: string;
  tour_slug: string;
  relation: string;
  condition: string;
};

function toLink(row: LinkRow): TourLink {
  return {
    hotelId: row.hotel_id,
    roomId: row.room_id,
    tourSlug: row.tour_slug,
    relation: row.relation as TourRelation,
    condition: row.condition,
  };
}

export function listTourLinks(hotelId: string): TourLink[] {
  return (
    db()
      .prepare("SELECT * FROM hotel_tour_links WHERE hotel_id=? ORDER BY tour_slug")
      .all(hotelId) as LinkRow[]
  ).map(toLink);
}

export function saveTourLinks(
  hotelId: string,
  links: TourLink[],
  context: AuditContext = {},
) {
  if (links.length > MAX_LINKS_PER_HOTEL)
    throw new Error("Quá nhiều tour liên kết cho một khách sạn");
  const rooms = adminRoomsOf(hotelId).map((room) => room.id);
  const tourSlugs = new Set(
    list("tours")
      .filter((row) => row.state !== "deleted")
      .map((row) => String(row.data.slug ?? "")),
  );
  const seen = new Set<string>();
  for (const link of links) {
    tourRelationSchema.parse(link.relation);
    if (!tourSlugs.has(link.tourSlug))
      throw new Error("Tour liên kết không tồn tại");
    if (link.roomId && !rooms.includes(link.roomId))
      throw new Error("Hạng phòng không thuộc khách sạn này");
    const key = `${link.roomId}|${link.tourSlug}`;
    if (seen.has(key)) throw new Error("Một tour bị gắn hai lần");
    seen.add(key);
  }

  return transaction(() => {
    db().prepare("DELETE FROM hotel_tour_links WHERE hotel_id=?").run(hotelId);
    const insert = db().prepare(
      "INSERT INTO hotel_tour_links(hotel_id,room_id,tour_slug,relation,condition,created_at) VALUES(?,?,?,?,?,?)",
    );
    const now = new Date().toISOString();
    for (const link of links)
      insert.run(
        hotelId,
        link.roomId || "",
        link.tourSlug,
        link.relation,
        (link.condition ?? "").slice(0, 300),
        now,
      );
    audit("hotel-tour-links-save", `hotels/${hotelId}`, {
      ...context,
      details: { hotelId, links: links.length },
    });
    return { links: links.length };
  });
}

/* -------------------------------------------------------------------------- */
/* Lead plan (sales side)                                                      */
/* -------------------------------------------------------------------------- */

type PlanRow = {
  lead_id: string;
  quote_amount: number | null;
  quote_note: string;
  confirmed_option: string;
  booking_id: string | null;
  updated_at: string;
};

export function getHotelLeadPlan(leadId: string): HotelLeadPlan | null {
  const row = db()
    .prepare("SELECT * FROM hotel_lead_plans WHERE lead_id=?")
    .get(leadId) as PlanRow | undefined;
  if (!row) return null;
  return {
    leadId: row.lead_id,
    quoteAmount: row.quote_amount,
    quoteNote: row.quote_note ? String(decrypt(row.quote_note)) : "",
    confirmedOption: row.confirmed_option
      ? String(decrypt(row.confirmed_option))
      : "",
    bookingId: row.booking_id,
    updatedAt: row.updated_at,
  };
}

export type SaveHotelLeadPlanInput = {
  leadId: string;
  quoteAmount: number | null;
  quoteNote: string;
  confirmedOption: string;
  bookingId: string | null;
};

export function saveHotelLeadPlan(
  input: SaveHotelLeadPlanInput,
  context: AuditContext = {},
) {
  if (input.quoteAmount !== null) {
    if (
      !Number.isSafeInteger(input.quoteAmount) ||
      input.quoteAmount <= 0 ||
      input.quoteAmount > MAX_QUOTE_AMOUNT
    )
      throw new Error("Giá báo không hợp lệ");
  }
  if (input.quoteNote.length > 2000 || input.confirmedOption.length > 2000)
    throw new Error("Ghi chú quá dài");
  if (input.bookingId) {
    const booking = db()
      .prepare("SELECT id FROM tour_bookings WHERE id=?")
      .get(input.bookingId);
    if (!booking) throw new Error("Booking tour không tồn tại");
  }
  return transaction(() => {
    const now = new Date().toISOString();
    db()
      .prepare(
        "INSERT INTO hotel_lead_plans(lead_id,quote_amount,quote_note,confirmed_option,booking_id,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(lead_id) DO UPDATE SET quote_amount=excluded.quote_amount,quote_note=excluded.quote_note,confirmed_option=excluded.confirmed_option,booking_id=excluded.booking_id,updated_at=excluded.updated_at",
      )
      .run(
        input.leadId,
        input.quoteAmount,
        input.quoteNote ? encrypt(input.quoteNote) : "",
        input.confirmedOption ? encrypt(input.confirmedOption) : "",
        input.bookingId,
        now,
      );
    audit("hotel-lead-plan", input.leadId, {
      ...context,
      details: {
        leadId: input.leadId,
        hasQuote: input.quoteAmount !== null,
        hasBooking: Boolean(input.bookingId),
      },
    });
    return { updatedAt: now };
  });
}

/** Room ids for a hotel that are published, used by request validation. */
export function publishedRoomIdsOf(hotelId: string): Set<string> {
  return new Set(publishedRoomsOf(hotelId).map((room) => room.id));
}

export function assertRoomQuantity(quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ROOM_QUANTITY)
    throw new Error(`Số phòng mỗi hạng phải từ 1 đến ${MAX_ROOM_QUANTITY}`);
  return quantity;
}
