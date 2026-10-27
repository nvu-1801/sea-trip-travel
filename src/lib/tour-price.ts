import type { Tour } from "@/domain/tour";

/**
 * Derived discount information. Nothing here is stored on the tour: the
 * percentage always comes from the current/original pair, so an editor can
 * never make the card advertise a discount that differs from the detail page.
 */
export type PriceDiscount = {
  /** The sale price shown on the card ("Từ …"). */
  current: number;
  /** Original/list price. Null when there is no valid discount. */
  original: number | null;
  /** Whole percentage, 1–99+. Null when the discount is not displayable. */
  percent: number | null;
  /** Package that supplied the "from" price, when the tour has packages. */
  packageId: string | null;
};

function positiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/**
 * `Math.round` percentage; a difference below 1% is treated as no discount so
 * a card never shows a meaningless "-0%" badge.
 */
export function discountPercent(
  original: unknown,
  current: unknown,
): number | null {
  if (!positiveInt(original) || !positiveInt(current)) return null;
  if (original <= current) return null;
  const percent = Math.round(((original - current) / original) * 100);
  return percent >= 1 ? Math.min(99, percent) : null;
}

/** Discount for one package row (adult or child), used by admin/detail. */
export function pricePairDiscount(
  current: unknown,
  original: unknown,
): { current: number; original: number | null; percent: number | null } {
  const percent = discountPercent(original, current);
  return {
    current: typeof current === "number" && current > 0 ? current : 0,
    original: percent ? (original as number) : null,
    percent,
  };
}

type PriceSource = Pick<
  Tour,
  "priceFrom" | "pricingOptions" | "originalPriceFrom"
>;

/**
 * Pick the discount that belongs to the same package as the displayed
 * "from" price. `priceFrom` is validated to equal the lowest adult price, so
 * using it directly also covers legacy records whose package list changed
 * without republishing.
 *
 * Tie-break (two packages at the same lowest price): prefer the larger valid
 * discount, then the package order in the CMS.
 */
export function tourPrice(tour: PriceSource): PriceDiscount | null {
  const current = tour.priceFrom?.amount;
  if (!positiveInt(current)) return null;

  const options = Array.isArray(tour.pricingOptions)
    ? tour.pricingOptions
    : [];
  if (options.length > 0) {
    const candidates = options.filter(
      (option) => option.adultPrice === current,
    );
    if (candidates.length === 0) {
      return {
        current,
        original: null,
        percent: null,
        packageId: null,
      };
    }
    const scored = candidates.map((option) => ({
      option,
      percent: discountPercent(option.originalAdultPrice, option.adultPrice),
    }));
    scored.sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));
    const winner = scored[0];
    return {
      current,
      original: winner.percent ? Number(winner.option.originalAdultPrice) : null,
      percent: winner.percent,
      packageId: winner.option.id,
    };
  }

  const original = tour.originalPriceFrom?.amount;
  const percent = discountPercent(original, current);
  return {
    current,
    original: percent ? Number(original) : null,
    percent,
    packageId: null,
  };
}
