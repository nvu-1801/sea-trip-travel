import type { Tour } from "./tour";

/**
 * Reference price for a tour party.
 *
 * The website may show an estimate before sales confirms anything, but it must
 * never invent a child price or a package the owner did not publish. The
 * cheapest published package is used as the reference and named in the UI.
 */

export const MAX_ESTIMATE_PARTY = 40;
export const MAX_ESTIMATE_TOTAL = 1_000_000_000_000;

export type TourEstimateReason =
  | "no_tour"
  | "no_price"
  | "child_price_unknown"
  | "safe_range";

export type TourPartyEstimate = {
  slug: string;
  title: string;
  packageId: string | null;
  packageLabel: string | null;
  adultPrice: number | null;
  childPrice: number | null;
  adults: number;
  children: number;
  adultSubtotal: number | null;
  childSubtotal: number | null;
  total: number | null;
  status: "quoted" | "needs_quote";
  reason: TourEstimateReason | null;
};

type TourPriceSource = Pick<
  Tour,
  "slug" | "title" | "pricingOptions" | "priceFrom"
>;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function validPrice(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_ESTIMATE_TOTAL
  );
}

export function estimateTourForParty(
  tour: TourPriceSource,
  adultsInput: number,
  childrenInput: number,
): TourPartyEstimate {
  const adults = clamp(adultsInput, 1, MAX_ESTIMATE_PARTY);
  const children = clamp(childrenInput, 0, 10);

  const options = (Array.isArray(tour.pricingOptions) ? tour.pricingOptions : [])
    .filter((option) => validPrice(option.adultPrice) && option.adultPrice > 0)
    .slice()
    .sort((a, b) => a.adultPrice - b.adultPrice);
  const chosen = options[0] ?? null;

  const adultPrice = chosen
    ? chosen.adultPrice
    : validPrice(tour.priceFrom?.amount)
      ? tour.priceFrom.amount
      : null;
  const childPrice = chosen ? chosen.childPrice : null;

  const base = {
    slug: tour.slug,
    title: tour.title,
    packageId: chosen?.id ?? null,
    packageLabel: chosen?.label ?? null,
    adultPrice,
    childPrice,
    adults,
    children,
  };

  if (adultPrice === null) {
    return {
      ...base,
      adultSubtotal: null,
      childSubtotal: null,
      total: null,
      status: "needs_quote",
      reason: "no_price",
    };
  }

  const adultSubtotal = adultPrice * adults;
  const childPriceKnown = childPrice !== null && validPrice(childPrice);
  const childSubtotal =
    children === 0 ? 0 : childPriceKnown ? (childPrice as number) * children : null;
  const total =
    adultSubtotal !== null && childSubtotal !== null
      ? adultSubtotal + childSubtotal
      : null;

  const inRange =
    total !== null && Number.isSafeInteger(total) && total <= MAX_ESTIMATE_TOTAL;

  if (total === null || !inRange) {
    return {
      ...base,
      adultSubtotal,
      childSubtotal,
      total: null,
      status: "needs_quote",
      reason:
        total === null && children > 0 && !childPriceKnown
          ? "child_price_unknown"
          : "safe_range",
    };
  }

  return {
    ...base,
    adultSubtotal,
    childSubtotal,
    total,
    status: "quoted",
    reason: null,
  };
}
