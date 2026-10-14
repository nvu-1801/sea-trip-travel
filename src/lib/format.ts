import type { Duration, Money, PriceFrom } from "@/domain/common";
import type { Locale } from "@/i18n/config";
import { intlTag } from "@/i18n/config";
import { format, getMessages, plural } from "@/i18n/messages";

/**
 * Locale-aware presentation of money, dates and durations.
 *
 * Prices stay in VND in every language — no currency conversion. Only the digit
 * grouping and the surrounding words change. A missing price never becomes
 * `0 ₫`: it becomes an explicit invitation to talk, in the visitor's language.
 */

/** `1200000` → `"1.200.000 ₫"` (vi) / `"1,200,000 ₫"` (en). Integer VND only. */
export function formatMoney(money: Money, locale: Locale): string {
  return `${new Intl.NumberFormat(intlTag(locale)).format(money.amount)} ₫`;
}

/**
 * The only sanctioned way to render a price.
 * `null` → "Liên hệ tư vấn" / "Contact us for pricing".
 */
export function formatPriceFrom(priceFrom: PriceFrom, locale: Locale): string {
  const m = getMessages(locale);
  if (!priceFrom) return m.common.contactForPricing;
  return format(m.common.priceFrom, { price: formatMoney(priceFrom, locale) });
}

export function hasPublishedPrice(priceFrom: PriceFrom): boolean {
  return priceFrom !== null;
}

/** `{days:3,nights:2}` → `"3 ngày 2 đêm"` / `"3 days 2 nights"`. */
export function formatDuration(duration: Duration, locale: Locale): string {
  const m = getMessages(locale);
  const days = plural(m.common.dayUnit, duration.days);
  if (duration.nights <= 0) return days;
  const nights = plural(m.common.nightUnit, duration.nights);
  return `${days} ${nights}`;
}

/**
 * ISO date-only formatting.
 *
 * The `YYYY-MM-DD` string is split into numeric parts and rebuilt as a UTC
 * `Date`, then formatted with `timeZone: "UTC"`. A local-time `new Date(iso)`
 * would shift the day either side of midnight — the classic "off by one" bug.
 */
function utcDateFromIso(isoDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `"2026-01-10"` → `"10/01/2026"` (vi) / `"01/10/2026"` (en). */
export function formatDate(isoDate: string, locale: Locale): string {
  const date = utcDateFromIso(isoDate);
  if (!date) return isoDate;
  return new Intl.DateTimeFormat(intlTag(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** `"2026-01-10"` → `"10 tháng 1, 2026"` (vi) / `"January 10, 2026"` (en). */
export function formatDateLong(isoDate: string, locale: Locale): string {
  const date = utcDateFromIso(isoDate);
  if (!date) return isoDate;
  return new Intl.DateTimeFormat(intlTag(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const VN_TZ = "Asia/Ho_Chi_Minh";

/**
 * Format an ISO instant in Vietnam time, e.g.
 * `"15/01/2026 lúc 09:00 (GMT+7)"`. Used by the (internal, Vietnamese) sales
 * email — the customer's own language does not change how we display it.
 */
export function formatDateTimeVietnam(isoInstant: string): string {
  const date = new Date(isoInstant);
  const datePart = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${datePart} lúc ${timePart} (GMT+7)`;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
