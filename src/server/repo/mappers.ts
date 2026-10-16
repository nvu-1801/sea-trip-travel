import {
  tourSchema,
  type Tour,
} from "@/domain/tour";
import { tourCategorySchema, type TourCategory } from "@/domain/category";
import { destinationSchema, type Destination } from "@/domain/destination";
import { travelArticleSchema, type ArticleBlock, type TravelArticle } from "@/domain/article";
import { intToBool, parseJson, parseJsonArray } from "@/server/db/json";
import type { Money, Region } from "@/domain/common";

/**
 * Row → domain mappers.
 *
 * Every mapper ends in a Zod `parse`, so a hand-edited row or a half-applied
 * migration fails loudly here instead of leaking malformed data into a page.
 */

export type Row = Record<string, unknown>;

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const optStr = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;
const num = (value: unknown): number => (typeof value === "number" ? value : Number(value));
const optNum = (value: unknown): number | undefined =>
  value === null || value === undefined ? undefined : num(value);

export function categoryFromRow(row: Row): TourCategory {
  return tourCategorySchema.parse({
    id: str(row.id),
    slug: str(row.slug),
    path: str(row.path),
    name: str(row.name),
    parentId: row.parent_id === null || row.parent_id === undefined ? null : str(row.parent_id),
    region: str(row.region) as Region,
    description: str(row.description),
    tagline: optStr(row.tagline),
    image:
      row.image_alt === null || row.image_alt === undefined
        ? undefined
        : { src: optStr(row.image_src), alt: str(row.image_alt) },
    order: num(row.sort_order),
    seo: seoFromRow(row, "seo_"),
    contentStatus: str(row.content_status) === "verified" ? "verified" : "demo",
  });
}

function seoFromRow(row: Row, prefix: string) {
  const title = optStr(row[`${prefix}title`]);
  const description = optStr(row[`${prefix}description`]);
  const ogImage = optStr(row[`${prefix}og_image`]);
  if (!title && !description && !ogImage) return undefined;
  return { title, description, ogImage };
}

export function destinationFromRow(row: Row): Destination {
  const imageAlt = optStr(row.image_alt);
  return destinationSchema.parse({
    id: str(row.id),
    slug: str(row.slug),
    name: str(row.name),
    region: str(row.region) as Region,
    summary: str(row.summary),
    province: optStr(row.province),
    image:
      imageAlt === undefined
        ? undefined
        : {
            src: optStr(row.image_src),
            alt: imageAlt,
            width: optNum(row.image_width),
            height: optNum(row.image_height),
            caption: optStr(row.image_caption),
          },
    order: num(row.sort_order),
    contentStatus: str(row.content_status) === "verified" ? "verified" : "demo",
  });
}

export type TourParts = {
  images: Row[];
  itinerary: Row[];
  pricing: Row[];
  categoryIds: string[];
  destinationIds: string[];
};

export function tourFromParts(row: Row, parts: TourParts): Tour {
  const priceAmount = optNum(row.price_amount);
  const priceFrom: Money | null =
    priceAmount === undefined || priceAmount === null
      ? null
      : { amount: priceAmount, currency: "VND" };

  return tourSchema.parse({
    id: str(row.id),
    slug: str(row.slug),
    title: str(row.title),
    summary: str(row.summary),
    categoryIds: parts.categoryIds,
    destinationIds: parts.destinationIds,
    duration: { days: num(row.duration_days), nights: num(row.duration_nights) },
    departurePoints: parseJsonArray(row.departure_points as string),
    returnPoints: parseJsonArray(row.return_points as string),
    transport: parseJsonArray(row.transport as string),
    tourCode: optStr(row.tour_code),
    sourceDocuments: parseJsonArray(row.source_documents as string),
    pricingOptions: parts.pricing.map((option) => ({
      id: str(option.id),
      label: str(option.label),
      accommodationClass: optStr(option.accommodation_class),
      adultPrice: num(option.adult_price),
      childPrice: num(option.child_price),
      surcharge: optStr(option.surcharge),
      validFrom: optStr(option.valid_from),
      validTo: optStr(option.valid_to),
      note: optStr(option.note),
    })),
    gifts: parseJsonArray(row.gifts as string),
    priceFrom,
    priceNote: optStr(row.price_note),
    highlights: parseJsonArray(row.highlights as string),
    images: parts.images.map((image) => ({
      src: optStr(image.src),
      alt: str(image.alt),
      width: optNum(image.width),
      height: optNum(image.height),
      caption: optStr(image.caption),
    })),
    overview: parseJsonArray(row.overview as string),
    itinerary: parts.itinerary.map((day) => ({
      id: str(day.id),
      index: num(day.position),
      title: str(day.title),
      summary: optStr(day.summary),
      activities: parseJsonArray(day.activities as string),
      meals: parseJsonArray(day.meals as string),
      places: parseJsonArray(day.places as string),
      accommodation: optStr(day.accommodation),
    })),
    included: parseJsonArray(row.included as string),
    excluded: parseJsonArray(row.excluded as string),
    notes: parseJsonArray(row.notes as string),
    policies: parseJsonArray(row.policies as string),
    tags: parseJsonArray(row.tags as string),
    seo: seoFromRow(row, "seo_"),
    contentStatus: str(row.content_status) === "verified" ? "verified" : "demo",
    updatedAt: str(row.updated_at),
  });
}

export function articleFromParts(
  row: Row,
  parts: { blocks: Row[]; destinationIds: string[]; tourSlugs: string[] },
): TravelArticle {
  const coverAlt = optStr(row.cover_alt);
  return travelArticleSchema.parse({
    id: str(row.id),
    slug: str(row.slug),
    title: str(row.title),
    excerpt: str(row.excerpt),
    destinationIds: parts.destinationIds,
    relatedTourSlugs: parts.tourSlugs,
    tags: parseJsonArray(row.tags as string),
    readingMinutes: optNum(row.reading_minutes),
    cover:
      coverAlt === undefined
        ? undefined
        : {
            src: optStr(row.cover_src),
            alt: coverAlt,
            width: optNum(row.cover_width),
            height: optNum(row.cover_height),
            caption: optStr(row.cover_caption),
          },
    body: parts.blocks.map((block) => blockFromRow(block)),
    author: str(row.author),
    publishedAt: str(row.published_at),
    updatedAt: optStr(row.updated_at),
    featured: intToBool(row.featured as number),
    seo: seoFromRow(row, "seo_"),
    contentStatus: str(row.content_status) === "verified" ? "verified" : "demo",
  });
}

function blockFromRow(row: Row): ArticleBlock {
  const payload = parseJson<Record<string, unknown>>(row.payload as string, {});
  return { type: str(row.type), ...payload } as ArticleBlock;
}
