import type { TourRecord } from "@/server/repo/types";

/**
 * Tour editor view-model.
 *
 * Kept in a plain module (no `"use client"`) so a Server Component can build the
 * initial state and the client editor can consume the same type — importing a
 * plain function from a `"use client"` module into a server component is not
 * allowed, which is exactly the trap this avoids.
 */

export type TourFormImage = {
  src: string;
  alt: string;
  width: string;
  height: string;
  caption: string;
};

export type TourFormDay = {
  title: string;
  summary: string;
  activities: string;
  meals: string;
  places: string;
  accommodation: string;
};

export type TourFormPackage = {
  id: string;
  label: string;
  accommodationClass: string;
  adultPrice: string;
  childPrice: string;
  surcharge: string;
  validFrom: string;
  validTo: string;
  note: string;
};

export type TourFormState = {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  tourCode: string;
  categoryIds: string[];
  destinationIds: string[];
  durationDays: string;
  durationNights: string;
  departurePoints: string;
  returnPoints: string;
  transport: string;
  priceNote: string;
  gifts: string;
  highlights: string;
  overview: string;
  included: string;
  excluded: string;
  notes: string;
  policies: string;
  tags: string;
  images: TourFormImage[];
  itinerary: TourFormDay[];
  pricingOptions: TourFormPackage[];
  seoTitle: string;
  seoDescription: string;
  seoOgImage: string;
  contentStatus: "demo" | "verified";
  status: "draft" | "published" | "hidden";
  featured: boolean;
  sortOrder: string;
};

export function emptyTourForm(): TourFormState {
  return {
    slug: "",
    title: "",
    summary: "",
    tourCode: "",
    categoryIds: [],
    destinationIds: [],
    durationDays: "1",
    durationNights: "0",
    departurePoints: "",
    returnPoints: "",
    transport: "",
    priceNote: "",
    gifts: "",
    highlights: "",
    overview: "",
    included: "",
    excluded: "",
    notes: "",
    policies: "",
    tags: "",
    images: [],
    itinerary: [],
    pricingOptions: [],
    seoTitle: "",
    seoDescription: "",
    seoOgImage: "",
    contentStatus: "demo",
    status: "draft",
    featured: false,
    sortOrder: "0",
  };
}

const join = (values: readonly string[]): string => values.join("\n");

/** Turn a stored tour into the editor's string-based state. */
export function tourToFormState(record: TourRecord): TourFormState {
  const tour = record.tour;
  return {
    id: tour.id,
    slug: tour.slug,
    title: tour.title,
    summary: tour.summary,
    tourCode: tour.tourCode ?? "",
    categoryIds: [...tour.categoryIds],
    destinationIds: [...tour.destinationIds],
    durationDays: String(tour.duration.days),
    durationNights: String(tour.duration.nights),
    departurePoints: join(tour.departurePoints),
    returnPoints: join(tour.returnPoints),
    transport: join(tour.transport),
    priceNote: tour.priceNote ?? "",
    gifts: join(tour.gifts ?? []),
    highlights: join(tour.highlights),
    overview: join(tour.overview),
    included: join(tour.included),
    excluded: join(tour.excluded),
    notes: join(tour.notes),
    policies: join(tour.policies),
    tags: join(tour.tags),
    images: tour.images.map((image) => ({
      src: image.src ?? "",
      alt: image.alt,
      width: image.width ? String(image.width) : "",
      height: image.height ? String(image.height) : "",
      caption: image.caption ?? "",
    })),
    itinerary: tour.itinerary.map((day) => ({
      title: day.title,
      summary: day.summary ?? "",
      activities: join(day.activities),
      meals: join(day.meals),
      places: join(day.places),
      accommodation: day.accommodation ?? "",
    })),
    pricingOptions: tour.pricingOptions.map((option) => ({
      id: option.id,
      label: option.label,
      accommodationClass: option.accommodationClass ?? "",
      adultPrice: String(option.adultPrice),
      childPrice: String(option.childPrice),
      surcharge: option.surcharge ?? "",
      validFrom: option.validFrom ?? "",
      validTo: option.validTo ?? "",
      note: option.note ?? "",
    })),
    seoTitle: tour.seo?.title ?? "",
    seoDescription: tour.seo?.description ?? "",
    seoOgImage: tour.seo?.ogImage ?? "",
    contentStatus: tour.contentStatus,
    status: record.status,
    featured: record.featured,
    sortOrder: String(record.sortOrder),
  };
}
