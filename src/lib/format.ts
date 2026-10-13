import type { Duration, Money, PriceFrom } from "@/domain/common";

/** `1200000` → `"1.200.000 ₫"`. Integer VND only. */
export function formatMoney(money: Money): string {
  return `${new Intl.NumberFormat("vi-VN").format(money.amount)} ₫`;
}

/**
 * The only sanctioned way to render a price.
 * `null` never becomes `0 ₫` — it becomes an explicit invitation to talk.
 */
export function formatPriceFrom(priceFrom: PriceFrom): string {
  return priceFrom ? `Từ ${formatMoney(priceFrom)}` : "Liên hệ tư vấn";
}

export function hasPublishedPrice(priceFrom: PriceFrom): boolean {
  return priceFrom !== null;
}

/** `{days:3,nights:2}` → `"3 ngày 2 đêm"`, `{days:1,nights:0}` → `"1 ngày"`. */
export function formatDuration(duration: Duration): string {
  const days = `${duration.days} ngày`;
  return duration.nights > 0 ? `${days} ${duration.nights} đêm` : days;
}

/** `"2026-01-10"` → `"10/01/2026"`. */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** `"2026-01-10"` → `"10 tháng 1, 2026"`. */
export function formatDateLong(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${Number(d)} tháng ${Number(m)}, ${y}`;
}

const VN_TZ = "Asia/Ho_Chi_Minh";

/**
 * Format an ISO instant in Vietnam time, e.g.
 * `"15/01/2026 lúc 09:00 (GMT+7)"`. Used by the sales email.
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

/** Rough reading time from a plain-text character count, in whole minutes. */
export function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
