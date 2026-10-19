import type { Tour } from "@/domain/tour";
import { formatDestinationNames } from "@/lib/data/destinations";
import {
  formatDuration,
  formatPriceFrom,
  hasPublishedPrice,
} from "@/lib/format";
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
  /** "Từ 1.200.000 ₫" / "From 1,200,000 ₫" / "Liên hệ tư vấn" / "Contact us for pricing". */
  priceLabel: string;
  priceIsContact: boolean;
  destinationsLabel: string;
  departureText: string | null;
  highlights: readonly string[];
  tags: readonly string[];
  image?: AssetImageInput;
  /** Small captions, resolved for the locale. */
  referencePriceText: string;
  viewDetailsText: string;
};

export function toTourCard(tour: Tour, locale: Locale): TourCardModel {
  const m = getMessages(locale);
  const departure = tour.departurePoints[0];

  return {
    slug: tour.slug,
    href: localizePath(locale, `/tour/${tour.slug}`),
    title: tour.title,
    summary: tour.summary,
    durationLabel: formatDuration(tour.duration, locale),
    durationDays: tour.duration.days,
    priceLabel: formatPriceFrom(tour.priceFrom, locale),
    priceIsContact: !hasPublishedPrice(tour.priceFrom),
    destinationsLabel: formatDestinationNames(tour.destinationIds, locale),
    departureText: departure
      ? format(m.common.departurePrefix, { place: departure })
      : null,
    highlights: tour.highlights.slice(0, 3),
    tags: tour.tags,
    image: tour.images[0],
    referencePriceText: m.common.priceReference,
    viewDetailsText: m.common.viewDetails,
  };
}
