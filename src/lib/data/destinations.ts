import { published } from "@/server/cms/store";
import { destinations as seed_destinations } from "@/content";
const current_destinations = () => published("destinations", seed_destinations);
import {
  MAX_HOME_DESTINATIONS,
  type Destination,
} from "@/domain/destination";
import type { Region } from "@/domain/common";
import type { Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import { resolveDestination } from "./localize";

export { MAX_HOME_DESTINATIONS };

export function getDestinations(locale: Locale): readonly Destination[] {
  return [...current_destinations()]
    .sort((a, b) => a.order - b.order)
    .map((destination) => resolveDestination(destination, locale));
}

/**
 * Destinations the owner explicitly enabled for the home "Khám phá" block.
 *
 * The flag is the only criterion: a destination without a photo still appears
 * (the shared `AssetImage` renders the branded placeholder), and its position
 * in the general list no longer matters. `homeOrder` controls the card order.
 */
export function getHomeExploreDestinations(
  locale: Locale,
): readonly Destination[] {
  const orderOf = (destination: Destination) =>
    destination.homeOrder > 0
      ? destination.homeOrder
      : Number.MAX_SAFE_INTEGER;
  return getDestinations(locale)
    .filter((destination) => destination.showOnHome === true)
    .sort(
      (a, b) =>
        orderOf(a) - orderOf(b) ||
        a.order - b.order ||
        a.name.localeCompare(b.name, "vi"),
    )
    .slice(0, MAX_HOME_DESTINATIONS);
}

/**
 * Where a home "Khám phá" card sends the visitor: the tour search pre-filled
 * with the destination's short name. Shared by the public card and the Studio
 * preview so both always describe the same link.
 */
export function homeDestinationHref(
  destination: Pick<Destination, "name">,
  locale: Locale,
): string {
  const query = destination.name.split(" – ")[0].split(" - ")[0];
  return `${localizePath(locale, "/tim-tour")}?q=${encodeURIComponent(query)}`;
}

export function getDestinationsByRegion(
  region: Region,
  locale: Locale,
): readonly Destination[] {
  return getDestinations(locale).filter(
    (destination) => destination.region === region,
  );
}

export function getDestinationsByIds(
  ids: readonly string[],
  locale: Locale,
): readonly Destination[] {
  const wanted = new Set(ids);
  return getDestinations(locale).filter((destination) =>
    wanted.has(destination.id),
  );
}

/** Comma-separated destination names, e.g. "Quy Nhơn, Phú Yên". */
export function formatDestinationNames(
  ids: readonly string[],
  locale: Locale,
): string {
  return getDestinationsByIds(ids, locale)
    .map((destination) => destination.name)
    .join(", ");
}
