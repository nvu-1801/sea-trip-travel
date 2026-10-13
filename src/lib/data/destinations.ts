import { destinations } from "@/content";
import type { Destination } from "@/domain/destination";
import type { Region } from "@/domain/common";

export function getDestinations(): readonly Destination[] {
  return [...destinations].sort((a, b) => a.order - b.order);
}

export function getDestinationsByRegion(region: Region): readonly Destination[] {
  return getDestinations().filter((destination) => destination.region === region);
}

export function getDestinationById(id: string): Destination | undefined {
  return destinations.find((destination) => destination.id === id);
}

export function getDestinationBySlug(slug: string): Destination | undefined {
  return destinations.find((destination) => destination.slug === slug);
}

export function getDestinationsByIds(ids: readonly string[]): readonly Destination[] {
  const wanted = new Set(ids);
  return getDestinations().filter((destination) => wanted.has(destination.id));
}

/** Comma-separated destination names, e.g. "Quy Nhơn, Phú Yên". */
export function formatDestinationNames(ids: readonly string[]): string {
  return getDestinationsByIds(ids)
    .map((destination) => destination.name)
    .join(", ");
}
