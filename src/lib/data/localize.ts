import {
  articleTranslations,
  categoryTranslations,
  destinationTranslations,
  tourTranslations,
} from "@/content/locales/en";
import type { TravelArticle, ArticleBlock } from "@/domain/article";
import type { TranslationStatus } from "@/domain/common";
import type { Destination } from "@/domain/destination";
import type { Tour } from "@/domain/tour";
import type { TourCategory } from "@/domain/category";
import type { Locale } from "@/i18n/config";
import { tours } from "@/content/tours";

/**
 * Resolve a source record for one locale.
 *
 * Vietnamese is returned untouched. English overlays the translation on top of
 * the source, filling any field the translation does not carry with the
 * Vietnamese value — the page-level banner tells the visitor that some content
 * may still be in Vietnamese, so a partial overlay is honest rather than silent.
 *
 * Shared facts (slug, ids, price, duration, image `src`) are never touched: they
 * exist in exactly one place.
 */

const REVIEWED: TranslationStatus = "reviewed";

/* --- Translation status --------------------------------------------------- */

export function tourTranslationStatus(id: string, locale: Locale): TranslationStatus {
  if (locale === "vi") return REVIEWED;
  const source = tours.find((tour) => tour.id === id);
  if (source && source.sourceDocuments.length > 0 && tourTranslations[id]?.sourceUpdatedAt !== source.updatedAt) return "missing";
  return tourTranslations[id]?.translationStatus ?? "missing";
}

export function categoryTranslationStatus(id: string, locale: Locale): TranslationStatus {
  if (locale === "vi") return REVIEWED;
  return categoryTranslations[id]?.translationStatus ?? "missing";
}

export function destinationTranslationStatus(id: string, locale: Locale): TranslationStatus {
  if (locale === "vi") return REVIEWED;
  return destinationTranslations[id]?.translationStatus ?? "missing";
}

export function articleTranslationStatus(id: string, locale: Locale): TranslationStatus {
  if (locale === "vi") return REVIEWED;
  return articleTranslations[id]?.translationStatus ?? "missing";
}

/** True once a record has an English translation that is safe to index. */
export function isTourIndexable(id: string, locale: Locale): boolean {
  return locale === "vi" || tourTranslationStatus(id, locale) === REVIEWED;
}

/* --- Record resolution ---------------------------------------------------- */

export function resolveTour(tour: Tour, locale: Locale): Tour {
  if (locale === "vi") return tour;
  const tr = tourTranslations[tour.id];
  if (!tr) return tour;
  // Old itinerary overlays can silently replace transport, insurance and meals.
  if (tour.sourceDocuments.length > 0 && tr.sourceUpdatedAt !== tour.updatedAt) return tour;

  const itinerary = tr.itinerary
    ? tour.itinerary.map((day, index) => {
        const d = tr.itinerary?.[index];
        if (!d) return day;
        return {
          ...day,
          title: d.title ?? day.title,
          summary: d.summary ?? day.summary,
          activities: d.activities ?? day.activities,
          meals: d.meals ?? day.meals,
          accommodation: d.accommodation ?? day.accommodation,
          places: d.places ?? day.places,
        };
      })
    : tour.itinerary;

  return {
    ...tour,
    title: tr.title ?? tour.title,
    summary: tr.summary ?? tour.summary,
    highlights: tr.highlights ?? tour.highlights,
    overview: tr.overview ?? tour.overview,
    itinerary,
    included: tr.included ?? tour.included,
    excluded: tr.excluded ?? tour.excluded,
    notes: tr.notes ?? tour.notes,
    policies: tr.policies ?? tour.policies,
    tags: tr.tags ?? tour.tags,
    departurePoints: tr.departurePoints ?? tour.departurePoints,
    priceNote: tr.priceNote ?? tour.priceNote,
    images: tr.imageAlts
      ? tour.images.map((image, index) => ({ ...image, alt: tr.imageAlts?.[index] ?? image.alt }))
      : tour.images,
    seo: tr.seo ? { ...tour.seo, ...tr.seo } : tour.seo,
  };
}

export function resolveCategory(category: TourCategory, locale: Locale): TourCategory {
  if (locale === "vi") return category;
  const tr = categoryTranslations[category.id];
  if (!tr) return category;
  return {
    ...category,
    name: tr.name ?? category.name,
    tagline: tr.tagline ?? category.tagline,
    description: tr.description ?? category.description,
    seo: tr.seo ? { ...category.seo, ...tr.seo } : category.seo,
  };
}

export function resolveDestination(destination: Destination, locale: Locale): Destination {
  if (locale === "vi") return destination;
  const tr = destinationTranslations[destination.id];
  if (!tr) return destination;
  return {
    ...destination,
    name: tr.name ?? destination.name,
    province: tr.province ?? destination.province,
    summary: tr.summary ?? destination.summary,
    image: tr.imageAlt ? { ...destination.image, alt: tr.imageAlt } : destination.image,
  };
}

function mergeArticleBlock(block: ArticleBlock, tr: ArticleBlockTranslationLike): ArticleBlock {
  switch (block.type) {
    case "paragraph":
      return { ...block, text: tr.text ?? block.text };
    case "heading":
      return { ...block, text: tr.text ?? block.text };
    case "list":
      return { ...block, items: tr.items ? [...tr.items] : block.items };
    case "quote":
      return { ...block, text: tr.text ?? block.text, cite: tr.cite ?? block.cite };
    case "callout":
      return { ...block, title: tr.title ?? block.title, text: tr.text ?? block.text };
    case "image":
      return { ...block, alt: tr.alt ?? block.alt, caption: tr.caption ?? block.caption };
    default:
      return block;
  }
}

type ArticleBlockTranslationLike = {
  text?: string;
  title?: string;
  items?: readonly string[];
  cite?: string;
  alt?: string;
  caption?: string;
};

export function resolveArticle(article: TravelArticle, locale: Locale): TravelArticle {
  if (locale === "vi") return article;
  const tr = articleTranslations[article.id];
  if (!tr) return article;

  const body = tr.body
    ? article.body.map((block, index) => {
        const t = tr.body?.[index];
        return t ? mergeArticleBlock(block, t as ArticleBlockTranslationLike) : block;
      })
    : article.body;

  return {
    ...article,
    title: tr.title ?? article.title,
    excerpt: tr.excerpt ?? article.excerpt,
    tags: tr.tags ?? article.tags,
    body,
    cover: tr.coverAlt ? { ...article.cover, alt: tr.coverAlt } : article.cover,
    seo: tr.seo ? { ...article.seo, ...tr.seo } : article.seo,
  };
}
