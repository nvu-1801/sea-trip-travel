import { destinations } from "@/content";
import type { Destination } from "@/domain/destination";
import type { Region } from "@/domain/common";
import type { Locale } from "@/i18n/config";
import { resolveDestination } from "./localize";

export function getDestinations(locale: Locale): readonly Destination[] {
  return [...destinations]
    .sort((a, b) => a.order - b.order)
    .map((destination) => resolveDestination(destination, locale));
}

export function getDestinationsByRegion(region: Region, locale: Locale): readonly Destination[] {
  return getDestinations(locale).filter((destination) => destination.region === region);
}

export function getDestinationsByIds(ids: readonly string[], locale: Locale): readonly Destination[] {
  const wanted = new Set(ids);
  return getDestinations(locale).filter((destination) => wanted.has(destination.id));
}

/** Comma-separated destination names, e.g. "Quy Nhơn, Phú Yên". */
export function formatDestinationNames(ids: readonly string[], locale: Locale): string {
  return getDestinationsByIds(ids, locale)
    .map((destination) => destination.name)
    .join(", ");
}
