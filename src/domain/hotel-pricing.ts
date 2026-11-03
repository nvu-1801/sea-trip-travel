import { z } from "zod";
import { isoDateSchema } from "./common";
import { parseIsoDate, shiftDays, toIsoDate, weekdayIndexMonday } from "@/lib/date";

/**
 * Pricing rules for a room.
 *
 * Money is always an integer VND amount per room per night. `null` is never
 * used here: a rule either states a positive amount or it does not exist.
 * Priority is fixed by kind, so two rules can never silently compete:
 *
 *   date_range  (3)  >  weekday (2)  >  base (1)
 *
 * Rules of the same kind for one room must not overlap. The writer rejects
 * them and the resolver still reports an overlap instead of picking the newest
 * row.
 */

export const MAX_NIGHTLY_AMOUNT = 1_000_000_000;
export const MAX_NIGHTS_PER_STAY = 60;
export const MAX_ROOM_QUANTITY = 5;
export const MAX_TOTAL_AMOUNT = 1_000_000_000_000;

export const RATE_KINDS = ["base", "weekday", "date_range"] as const;
export const rateKindSchema = z.enum(RATE_KINDS);
export type RateKind = z.infer<typeof rateKindSchema>;

const amountSchema = z
  .number()
  .int("Giá phải là số nguyên VND")
  .positive("Giá phải lớn hơn 0")
  .max(MAX_NIGHTLY_AMOUNT, "Giá vượt mức cho phép");

export const rateRuleSchema = z
  .object({
    id: z.string().min(1).max(60),
    hotelId: z.string().regex(/^hotel_[a-z0-9_]+$/),
    roomId: z.string().regex(/^room_[a-z0-9_]+$/),
    kind: rateKindSchema,
    /** Monday-first indexes (0 = Monday). Only for `weekday` rules. */
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    /** Inclusive first night. Only for `date_range` rules. */
    startDate: isoDateSchema.optional(),
    /** Inclusive last night. Only for `date_range` rules. */
    endDate: isoDateSchema.optional(),
    amount: amountSchema,
    includesBreakfast: z.boolean().default(false),
    includesTax: z.boolean().default(false),
    /** Free text when a surcharge exists but its amount is not confirmed. */
    feesNote: z.string().max(300).optional(),
    label: z.string().max(80).optional(),
  })
  .superRefine((rule, ctx) => {
    const uniqueWeekdays = new Set(rule.weekdays);
    if (uniqueWeekdays.size !== rule.weekdays.length)
      ctx.addIssue({
        code: "custom",
        path: ["weekdays"],
        message: "Thứ bị lặp trong cùng một quy tắc giá",
      });

    if (rule.kind === "base") {
      if (rule.weekdays.length || rule.startDate || rule.endDate)
        ctx.addIssue({
          code: "custom",
          path: ["kind"],
          message: "Giá cơ bản không nhận thứ hoặc khoảng ngày",
        });
      return;
    }
    if (rule.kind === "weekday") {
      if (rule.weekdays.length === 0)
        ctx.addIssue({
          code: "custom",
          path: ["weekdays"],
          message: "Chọn ít nhất một thứ trong tuần",
        });
      if (rule.startDate || rule.endDate)
        ctx.addIssue({
          code: "custom",
          path: ["kind"],
          message: "Giá theo thứ không nhận khoảng ngày",
        });
      return;
    }
    if (!rule.startDate || !rule.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "Giá theo khoảng ngày cần ngày bắt đầu và kết thúc",
      });
      return;
    }
    if (rule.startDate > rule.endDate)
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
      });
    if (rule.weekdays.length)
      ctx.addIssue({
        code: "custom",
        path: ["weekdays"],
        message: "Giá theo khoảng ngày không nhận thứ trong tuần",
      });
  });

export type RateRule = z.infer<typeof rateRuleSchema>;

/** Rules that reach the resolver: dates are plain `YYYY-MM-DD` or null. */
export type StoredRateRule = {
  id: string;
  kind: RateKind;
  weekdays: number[];
  startDate: string | null;
  endDate: string | null;
  amount: number;
  includesBreakfast: boolean;
  includesTax: boolean;
  feesNote: string;
  label: string;
};

export type NightPrice = {
  date: string;
  amount: number;
  ruleId: string;
  includesBreakfast: boolean;
  includesTax: boolean;
  feesNote: string;
  label: string;
};

export type StayPricingIssue =
  | "invalid_dates"
  | "missing_rate"
  | "ambiguous_rule"
  | "amount_out_of_range";

export type StayPricing =
  | { ok: true; nights: NightPrice[]; total: number }
  | {
      ok: false;
      issue: StayPricingIssue;
      missingDates: string[];
      ambiguousDates: string[];
    };

export const TOUR_RELATIONS = ["included", "upgrade", "additional"] as const;
export const tourRelationSchema = z.enum(TOUR_RELATIONS);
export type TourRelation = z.infer<typeof tourRelationSchema>;

const KIND_PRIORITY: Record<RateKind, number> = {
  date_range: 3,
  weekday: 2,
  base: 1,
};

/** `[checkIn, checkOut)` as ISO dates, or `null` when the range is unusable. */
export function stayDates(
  checkIn: string,
  checkOut: string,
  maxNights: number = MAX_NIGHTS_PER_STAY,
): string[] | null {
  const start = parseIsoDate(checkIn);
  const end = parseIsoDate(checkOut);
  if (!start || !end) return null;
  if (checkIn >= checkOut) return null;
  const dates: string[] = [];
  let cursor = start;
  let guard = 0;
  while (toIsoDate(cursor) < checkOut) {
    dates.push(toIsoDate(cursor));
    cursor = shiftDays(cursor, 1);
    guard += 1;
    if (guard > maxNights) return null;
  }
  return dates.length > 0 ? dates : null;
}

export function nightCount(checkIn: string, checkOut: string): number {
  return stayDates(checkIn, checkOut, 1000)?.length ?? 0;
}

function ruleMatches(rule: StoredRateRule, date: string): boolean {
  if (rule.kind === "base") return true;
  if (rule.kind === "weekday") {
    const parts = parseIsoDate(date);
    return Boolean(parts) && rule.weekdays.includes(weekdayIndexMonday(parts!));
  }
  return Boolean(
    rule.startDate && rule.endDate && date >= rule.startDate && date <= rule.endDate,
  );
}

function safeAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_NIGHTLY_AMOUNT;
}

/**
 * Price one room for one stay. Never substitutes 0 for a missing night and
 * never guesses between two equally specific rules.
 */
export function priceStay(
  rules: readonly StoredRateRule[],
  checkIn: string,
  checkOut: string,
): StayPricing {
  const dates = stayDates(checkIn, checkOut);
  if (!dates) {
    return {
      ok: false,
      issue: "invalid_dates",
      missingDates: [],
      ambiguousDates: [],
    };
  }

  const nights: NightPrice[] = [];
  const missingDates: string[] = [];
  const ambiguousDates: string[] = [];

  for (const date of dates) {
    const matched = rules.filter((rule) => ruleMatches(rule, date));
    if (matched.length === 0) {
      missingDates.push(date);
      continue;
    }
    const top = Math.max(...matched.map((rule) => KIND_PRIORITY[rule.kind]));
    const winners = matched.filter(
      (rule) => KIND_PRIORITY[rule.kind] === top,
    );
    if (winners.length > 1) {
      ambiguousDates.push(date);
      continue;
    }
    const rule = winners[0];
    if (!safeAmount(rule.amount)) {
      return {
        ok: false,
        issue: "amount_out_of_range",
        missingDates,
        ambiguousDates,
      };
    }
    nights.push({
      date,
      amount: rule.amount,
      ruleId: rule.id,
      includesBreakfast: rule.includesBreakfast,
      includesTax: rule.includesTax,
      feesNote: rule.feesNote,
      label: rule.label,
    });
  }

  if (ambiguousDates.length > 0) {
    return {
      ok: false,
      issue: "ambiguous_rule",
      missingDates,
      ambiguousDates,
    };
  }
  if (missingDates.length > 0) {
    return { ok: false, issue: "missing_rate", missingDates, ambiguousDates };
  }

  const total = nights.reduce((sum, night) => sum + night.amount, 0);
  if (!Number.isSafeInteger(total) || total > MAX_TOTAL_AMOUNT) {
    return {
      ok: false,
      issue: "amount_out_of_range",
      missingDates,
      ambiguousDates,
    };
  }
  return { ok: true, nights, total };
}

/**
 * Two rules of the same kind overlap when they can both claim one night.
 * Used before writing, so the resolver never has to choose.
 */
export function rulesOverlap(
  a: Pick<StoredRateRule, "kind" | "weekdays" | "startDate" | "endDate">,
  b: Pick<StoredRateRule, "kind" | "weekdays" | "startDate" | "endDate">,
): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "base") return true;
  if (a.kind === "weekday")
    return a.weekdays.some((day) => b.weekdays.includes(day));
  const aStart = a.startDate ?? "";
  const aEnd = a.endDate ?? "";
  const bStart = b.startDate ?? "";
  const bEnd = b.endDate ?? "";
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart <= bEnd && bStart <= aEnd;
}

export type RoomQuoteLine = {
  roomId: string;
  quantity: number;
  /** Nightly reference total for ONE room before quantity. */
  perRoomTotal: number | null;
  /** perRoomTotal × quantity, or null when a night has no price. */
  total: number | null;
  nights: NightPrice[];
  missingDates: string[];
  ambiguousDates: string[];
  hasUnknownFees: boolean;
  issue: StayPricingIssue | null;
};

export type QuoteReason =
  | "invalid_dates"
  | "missing_rate"
  | "ambiguous_rule"
  | "amount_out_of_range"
  | "unknown_fees"
  | "included_by_tour"
  | "upgrade_needs_quote";

export type StayQuote = {
  status: "quoted" | "needs_quote";
  reasons: QuoteReason[];
  nights: number;
  rooms: RoomQuoteLine[];
  /** Sum of priced lines. `null` when any line is incomplete. */
  lodgingTotal: number | null;
  /** True when the linked tour already pays for the room. */
  includedByTour: boolean;
  tourRelation: TourRelation | null;
  checkIn: string | null;
  checkOut: string | null;
};

export type RoomQuoteInput = {
  roomId: string;
  quantity: number;
  rules: readonly StoredRateRule[];
  /** Optional room-level tour relation; falls back to the hotel-level one. */
  tourRelation?: TourRelation | null;
};

/**
 * Reference total for the whole request, the way the website is allowed to
 * show it. `status: "needs_quote"` means the number may be shown as a partial
 * reference but never as a confirmed price.
 *
 * `included` never charges the room again. `upgrade` never derives a delta from
 * two prices that were quoted under different conditions.
 */
export function quoteStay(
  rooms: readonly RoomQuoteInput[],
  checkIn: string,
  checkOut: string,
  hotelTourRelation: TourRelation | null,
): StayQuote {
  const dates = stayDates(checkIn, checkOut);
  const reasons = new Set<QuoteReason>();
  if (!dates) reasons.add("invalid_dates");

  const relation = hotelTourRelation;
  if (relation === "included") reasons.add("included_by_tour");
  if (relation === "upgrade") reasons.add("upgrade_needs_quote");

  const lines: RoomQuoteLine[] = [];
  for (const room of rooms) {
    if (!dates) {
      lines.push({
        roomId: room.roomId,
        quantity: room.quantity,
        perRoomTotal: null,
        total: null,
        nights: [],
        missingDates: [],
        ambiguousDates: [],
        hasUnknownFees: false,
        issue: "invalid_dates",
      });
      continue;
    }

    const priced = priceStay(room.rules, checkIn, checkOut);
    if (!priced.ok) {
      reasons.add(priced.issue);
      lines.push({
        roomId: room.roomId,
        quantity: room.quantity,
        perRoomTotal: null,
        total: null,
        nights: [],
        missingDates: priced.missingDates,
        ambiguousDates: priced.ambiguousDates,
        hasUnknownFees: false,
        issue: priced.issue,
      });
      continue;
    }

    const hasUnknownFees = priced.nights.some((night) =>
      Boolean(night.feesNote.trim()),
    );
    if (hasUnknownFees) reasons.add("unknown_fees");
    const total = priced.total * room.quantity;
    const safeTotal =
      Number.isSafeInteger(total) && total <= MAX_TOTAL_AMOUNT ? total : null;
    if (safeTotal === null) reasons.add("amount_out_of_range");
    lines.push({
      roomId: room.roomId,
      quantity: room.quantity,
      perRoomTotal: priced.total,
      total: safeTotal,
      nights: priced.nights,
      missingDates: [],
      ambiguousDates: [],
      hasUnknownFees,
      issue: null,
    });
  }

  const allPriced =
    lines.length > 0 && lines.every((line) => line.total !== null);
  const subtotal = allPriced
    ? lines.reduce((sum, line) => sum + (line.total ?? 0), 0)
    : null;

  // No dates or no priced night ⇒ no reference number at all (never 0).
  const lodgingTotal =
    relation === "included" ? (dates ? 0 : null) : subtotal;

  const needsQuote =
    !dates ||
    !allPriced ||
    reasons.has("unknown_fees") ||
    relation === "upgrade";

  return {
    status: needsQuote ? "needs_quote" : "quoted",
    reasons: [...reasons],
    nights: dates?.length ?? 0,
    rooms: lines,
    lodgingTotal,
    includedByTour: relation === "included",
    tourRelation: relation,
    checkIn: dates ? checkIn : null,
    checkOut: dates ? checkOut : null,
  };
}
