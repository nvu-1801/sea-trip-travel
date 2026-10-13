/**
 * Calendar arithmetic for the date picker.
 *
 * Every function works on LOCAL date parts via `new Date(y, m, d)`. Nothing here
 * touches `toISOString()` / `Date.UTC()`: a UTC round-trip shifts the day by one
 * either side of midnight, which is the classic "the date is off by one" bug.
 *
 * Kept pure and free of React so it can be unit tested directly — see
 * `tests/date.test.ts`.
 */

export type DateParts = { y: number; m: number; d: number };
/** The month currently displayed — no day component. */
export type MonthView = { y: number; m: number };

export const MONTH_LABELS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
] as const;

/** Vietnamese weeks start on Monday. */
export const WEEKDAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
export const WEEKDAY_FULL = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ Nhật",
] as const;

const pad = (value: number) => String(value).padStart(2, "0");

const toDate = (parts: DateParts) => new Date(parts.y, parts.m, parts.d);

const fromDate = (date: Date): DateParts => ({
  y: date.getFullYear(),
  m: date.getMonth(),
  d: date.getDate(),
});

/** `YYYY-MM-DD` → parts. Returns null for empty or malformed input. */
export function parseIsoDate(value: string | undefined | null): DateParts | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);

  if (m < 0 || m > 11) return null;
  if (d < 1 || d > daysInMonth(y, m)) return null;

  return { y, m, d };
}

export function toIsoDate(parts: DateParts): string {
  return `${parts.y}-${pad(parts.m + 1)}-${pad(parts.d)}`;
}

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(year, month + 1, 0).getDate();
}

export function todayParts(now: Date = new Date()): DateParts {
  return fromDate(now);
}

export function monthViewOf(parts: DateParts): MonthView {
  return { y: parts.y, m: parts.m };
}

export function shiftDays(parts: DateParts, delta: number): DateParts {
  return fromDate(new Date(parts.y, parts.m, parts.d + delta));
}

/** Month shift with day clamping (31 Jan + 1 month → 28/29 Feb). */
export function shiftMonths(parts: DateParts, delta: number): DateParts {
  const clampedDay = Math.min(parts.d, daysInMonth(parts.y, parts.m + delta));
  return fromDate(new Date(parts.y, parts.m + delta, clampedDay));
}

/** Month-only shift for the header chevrons — nothing to clamp. */
export function shiftMonthView(view: MonthView, delta: number): MonthView {
  const date = new Date(view.y, view.m + delta, 1);
  return { y: date.getFullYear(), m: date.getMonth() };
}

/** Monday-first index: 0 = Thứ Hai … 6 = Chủ Nhật. */
export function weekdayIndexMonday(parts: DateParts): number {
  return (toDate(parts).getDay() + 6) % 7;
}

export function sameDay(a: DateParts | null, b: DateParts | null): boolean {
  return Boolean(a && b && a.y === b.y && a.m === b.m && a.d === b.d);
}

export function isWeekend(parts: DateParts): boolean {
  return toDate(parts).getDay() === 0 || toDate(parts).getDay() === 6;
}

export type MonthCell = {
  iso: string;
  parts: DateParts;
  /** False for the leading/trailing days borrowed from the adjacent months. */
  inMonth: boolean;
};

/**
 * Six rows of seven (42 cells) so the popover never changes height as the
 * visitor moves between months that need 5 rows and months that need 6.
 */
export function buildMonthGrid(year: number, month: number): MonthCell[] {
  const offset = weekdayIndexMonday({ y: year, m: month, d: 1 });

  return Array.from({ length: 42 }, (_, index) => {
    const parts = fromDate(new Date(year, month, 1 - offset + index));
    return { iso: toIsoDate(parts), parts, inMonth: parts.m === month };
  });
}

/** "13/10/2026 · Thứ Ba" — used on the picker trigger. */
export function formatDateWithWeekday(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return "";
  return `${pad(parts.d)}/${pad(parts.m + 1)}/${parts.y} · ${WEEKDAY_FULL[weekdayIndexMonday(parts)]}`;
}
