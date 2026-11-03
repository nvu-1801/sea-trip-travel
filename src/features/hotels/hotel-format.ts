import { intlTag, type Locale } from "@/i18n/config";

/** `1200000` → `"1.200.000 ₫"`. Integer VND only; never converts currency. */
export function formatVnd(amount: number, locale: Locale): string {
  return `${new Intl.NumberFormat(intlTag(locale)).format(amount)} ₫`;
}
