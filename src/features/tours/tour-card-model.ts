import type { Tour } from "@/domain/tour";
import { formatDestinationNames } from "@/lib/data/destinations";
import {
  formatDuration,
  formatMoney,
  hasPublishedPrice,
} from "@/lib/format";
import { tourPrice } from "@/lib/tour-price";
import type { Locale } from "@/i18n/config";
import { format, getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import type { AssetImageInput } from "@/components/ui/asset-image";

/**
 * Card view-model.
 *
 * The UI never sees a raw `Tour`. It sees a small, serialisable projection, which
 * is what lets the listing page hand data to a Client Component for filtering
 * without shipping the whole content graph (or the message catalogs) to the
 * browser. Every display string is resolved here, on the server.
 */
export type TourCardModel = {
  slug: string;
  /** Localized URL for this locale, e.g. `/en/tour/...`. */
  href: string;
  title: string;
  summary: string;
  durationLabel: string;
  /** Used by the listing sort control. */
  durationDays: number;
  /** "1.200.000 ₫" / "Liên hệ tư vấn" / "Contact us for pricing". */
  priceLabel: string;
  priceIsContact: boolean;
  /** Small kicker above a published price. */
  priceFromText: string;
  /** Action that opens the tour detail consultation form with the tour prefilled. */
  consultHref: string;
  consultText: string;
  /** Original/list price, crossed out. Null when there is no valid discount. */
  priceOriginalLabel: string | null;
  priceOriginalAria: string | null;
  discountPercent: number | null;
  discountLabel: string | null;
  discountAria: string | null;
  destinationsLabel: string;
  departureText: string | null;
  highlights: readonly string[];
  tags: readonly string[];
  /** Editorial pick pill; null hides it. */
  badge: string | null;
  /** Default badge for the horizontal spotlight card. */
  featuredLabel: string;
  image?: AssetImageInput;
  /** Small captions, resolved for the locale. */
  referencePriceText: string;
  viewDetailsText: string;
};

export function toTourCard(tour: Tour, locale: Locale): TourCardModel {
  const m = getMessages(locale);
  const departure = tour.departurePoints[0];
  const price = tourPrice(tour);
  const discountPercent = price?.percent ?? null;
  const originalLabel =
    price && price.original !== null && discountPercent
      ? formatMoney({ amount: price.original, currency: "VND" }, locale)
      : null;

  return {
    slug: tour.slug,
    href: localizePath(locale, `/tour/${tour.slug}`),
    title: tour.title,
    summary: tour.summary,
    durationLabel: formatDuration(tour.duration, locale),
    durationDays: tour.duration.days,
    priceLabel: tour.priceFrom
      ? formatMoney(tour.priceFrom, locale)
      : m.common.contactForPricing,
    priceIsContact: !hasPublishedPrice(tour.priceFrom),
    priceFromText: m.common.priceLabelFrom,
    consultHref: `${localizePath(locale, `/tour/${tour.slug}`)}#tu-van`,
    consultText: m.consult.eyebrow,
    priceOriginalLabel: originalLabel,
    priceOriginalAria: originalLabel
      ? `${m.common.originalPrice}: ${originalLabel}`
      : null,
    discountPercent,
    discountLabel:
      discountPercent !== null
        ? format(m.common.discountBadge, { percent: discountPercent })
        : null,
    discountAria:
      discountPercent !== null
        ? format(m.common.discountAria, { percent: discountPercent })
        : null,
    destinationsLabel: formatDestinationNames(tour.destinationIds, locale),
    departureText: departure
      ? format(m.common.departurePrefix, { place: departure })
      : null,
    highlights: tour.highlights.slice(0, 3),
    tags: tour.tags,
    badge: tour.badge || null,
    featuredLabel: m.common.featuredTour,
    image: tour.images[0],
    referencePriceText: m.common.priceLabelContact,
    viewDetailsText: m.common.viewDetails,
  };
}
