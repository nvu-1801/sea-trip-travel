import type { Destination } from "@/domain/destination";
import type { Region } from "@/domain/common";
import type { Locale } from "@/i18n/config";
import type { ContentSnapshot } from "@/server/repo/types";
import { loadPublishedSnapshot, translationsFor } from "./snapshot";
import { resolveDestination } from "./localize";

/**
 * Destination reads.
 *
 * Every function takes an optional `snapshot` so unit tests can supply a
 * locally-read snapshot instead of going through the Next cache wrapper.
 */

async function snap(source?: ContentSnapshot): Promise<ContentSnapshot> {
  return source ?? loadPublishedSnapshot();
}

export async function getDestinations(
  locale: Locale,
  source?: ContentSnapshot,
): Promise<Destination[]> {
  const snapshot = await snap(source);
  const translations = translationsFor(snapshot, locale);
  return [...snapshot.destinations]
    .sort((a, b) => a.order - b.order)
    .map((destination) => resolveDestination(destination, locale, translations));
}

export async function getDestinationsByRegion(
  region: Region,
  locale: Locale,
  source?: ContentSnapshot,
): Promise<Destination[]> {
  return (await getDestinations(locale, source)).filter(
    (destination) => destination.region === region,
  );
}

export async function getDestinationsByIds(
  ids: readonly string[],
  locale: Locale,
  source?: ContentSnapshot,
): Promise<Destination[]> {
  const wanted = new Set(ids);
  return (await getDestinations(locale, source)).filter((destination) => wanted.has(destination.id));
}

/** Comma-separated destination names, e.g. "Quy Nhơn, Phú Yên". */
export async function formatDestinationNames(
  ids: readonly string[],
  locale: Locale,
  source?: ContentSnapshot,
): Promise<string> {
  return (await getDestinationsByIds(ids, locale, source))
    .map((destination) => destination.name)
    .join(", ");
}
