import type { RoomMode } from "./hotel";
import { stayDates } from "./hotel-pricing";

/**
 * Reference room availability for one room and one stay.
 *
 * This is NOT an inventory system. The owner types a count per night after
 * checking with the partner; Sea Trip holds nothing and never decrements a
 * number when a request is submitted. Missing data is always "unknown", never
 * "sold out" and never "available".
 */

export type AvailabilityRow = {
  date: string;
  /** Rooms Sea Trip can *suggest* that night. 0 means none. */
  rooms: number;
  /** Partner stopped accepting arrivals on this date. */
  closed: boolean;
  updatedAt: string;
};

export type AvailabilityResult =
  | { kind: "on_request" }
  | {
      kind: "unknown";
      reason: "no_dates" | "invalid_dates" | "missing_nights" | "past_dates";
      missingDates: string[];
    }
  | { kind: "closed"; date: string; reason: "sold_out" | "closed"; updatedAt: string }
  | { kind: "available"; rooms: number; updatedAt: string };

/** Today in Vietnam, so a stale calendar cannot pose as current stock. */
export function vietnamToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isPastStay(checkOut: string, today: string): boolean {
  // The checkout morning is still relevant for tonight's stay, so a stay is
  // only "past" once its checkout date has already passed.
  return checkOut < today;
}

export function resolveAvailability(
  mode: RoomMode,
  rows: readonly AvailabilityRow[],
  checkIn: string | null,
  checkOut: string | null,
  today: string = vietnamToday(),
): AvailabilityResult {
  if (mode === "on_request") return { kind: "on_request" };
  if (!checkIn || !checkOut) {
    return { kind: "unknown", reason: "no_dates", missingDates: [] };
  }

  const dates = stayDates(checkIn, checkOut);
  if (!dates) {
    return { kind: "unknown", reason: "invalid_dates", missingDates: [] };
  }
  if (isPastStay(checkOut, today)) {
    return { kind: "unknown", reason: "past_dates", missingDates: [] };
  }

  const byDate = new Map(rows.map((row) => [row.date, row]));
  const missingDates: string[] = [];
  const used: AvailabilityRow[] = [];
  for (const date of dates) {
    const row = byDate.get(date);
    if (!row) {
      missingDates.push(date);
      continue;
    }
    used.push(row);
  }
  if (missingDates.length > 0) {
    return { kind: "unknown", reason: "missing_nights", missingDates };
  }

  const closed = used.find(
    (row) => row.closed || !Number.isInteger(row.rooms) || row.rooms <= 0,
  );
  if (closed) {
    return {
      kind: "closed",
      date: closed.date,
      reason: closed.closed ? "closed" : "sold_out",
      updatedAt: closed.updatedAt,
    };
  }

  // The week is only as open as its tightest night; checkout is not counted.
  const rooms = Math.min(...used.map((row) => row.rooms));
  const updatedAt = used
    .map((row) => row.updatedAt)
    .filter(Boolean)
    .sort()[0] ?? "";
  return { kind: "available", rooms, updatedAt };
}
