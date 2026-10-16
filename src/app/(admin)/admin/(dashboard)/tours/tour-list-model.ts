import type { Tour } from "@/domain/tour";

/**
 * A tour "has a price" only when `priceFrom` is a published amount.
 * `null` means "Liên hệ tư vấn" and must never render as 0 ₫.
 */
export function tourHasPrice(tour: Tour): boolean {
  return tour.priceFrom !== null && tour.priceFrom.amount > 0;
}

export function priceLabel(tour: Tour): string {
  if (!tourHasPrice(tour)) return "Liên hệ tư vấn";
  return `Từ ${tour.priceFrom!.amount.toLocaleString("vi-VN")} ₫`;
}
