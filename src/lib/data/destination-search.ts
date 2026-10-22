import { searchKey } from "@/lib/search";
import { localizePath } from "@/i18n/routing";
import { getMessages } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import type { ImageAsset, Region } from "@/domain/common";
import { getDestinations } from "./destinations";
import { getDestinationTourCounts } from "./tours";

/**
 * One row in the header search index.
 *
 * `searchText` is pre-folded on the server (accent-insensitive, lowercase) so
 * the client can filter on every keystroke without shipping a Vietnamese
 * normalizer or doing a network round-trip.
 */
export type DestinationSearchItem = {
  id: string;
  name: string;
  province?: string;
  region: Region;
  regionLabel: string;
  tourCount: number;
  href: string;
  image?: ImageAsset;
  searchText: string;
};

/**
 * Destinations that can actually be sold right now.
 *
 * Only places referenced by at least one published tour are indexed: offering
 * a destination with no itinerary would send the guest to an empty result
 * page. Sorted by popularity, then alphabetically, so the chips surface the
 * strongest trips first.
 */
export function getDestinationSearchIndex(
  locale: Locale,
  regionLabels: Record<Region, string> = getMessages(locale).regions,
): readonly DestinationSearchItem[] {
  const counts = getDestinationTourCounts();
  return getDestinations(locale)
    .map((destination) => {
      const regionLabel = regionLabels[destination.region];
      const tourCount = counts.get(destination.id) ?? 0;
      return {
        id: destination.id,
        name: destination.name,
        province: destination.province,
        region: destination.region,
        regionLabel,
        tourCount,
        href: `${localizePath(locale, "/tim-tour")}?destination=${encodeURIComponent(destination.id)}`,
        image: destination.image,
        searchText: searchKey(
          [destination.name, destination.province ?? "", regionLabel].join(" "),
        ),
      };
    })
    .filter((item) => item.tourCount > 0)
    .sort(
      (a, b) =>
        b.tourCount - a.tourCount ||
        a.name.localeCompare(b.name, locale === "vi" ? "vi" : "en"),
    );
}
