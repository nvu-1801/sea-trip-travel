import type { TravelArticle, ArticleBlock } from "@/domain/article";
import type { TranslationStatus } from "@/domain/common";
import type { Destination } from "@/domain/destination";
import type { Tour } from "@/domain/tour";
import type { TourCategory } from "@/domain/category";
import type { Locale } from "@/i18n/config";
import type {
  ArticleTranslation,
  CategoryTranslation,
  DestinationTranslation,
  TourTranslation,
} from "@/domain/localization";
import { loadPublishedSnapshot, translationsFor } from "./snapshot";
import type { Translations } from "@/server/repo/translations";

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
 *
 * The resolvers are pure functions of `(record, locale, translations)`. The
 * `*Status` helpers are async because they need the cached content snapshot.
 */

const REVIEWED: TranslationStatus = "reviewed";

/* --- Translation status --------------------------------------------------- */

export function tourStatusOf(tour: Tour, translations: Translations): TranslationStatus {
  const overlay: TourTranslation | undefined = translations.tour[tour.id];
  if (tour.sourceDocuments.length > 0 && overlay?.sourceUpdatedAt !== tour.updatedAt) {
    return "missing";
  }
  return overlay?.translationStatus ?? "missing";
}

export function categoryStatusOf(id: string, translations: Translations): TranslationStatus {
  return translations.category[id]?.translationStatus ?? "missing";
}

export function articleStatusOf(id: string, translations: Translations): TranslationStatus {
  return translations.article[id]?.translationStatus ?? "missing";
}

export async function tourTranslationStatus(
  id: string,
  locale: Locale,
  source?: import("@/server/repo/types").ContentSnapshot,
): Promise<TranslationStatus> {
  if (locale === "vi") return REVIEWED;
  const snapshot = source ?? (await loadPublishedSnapshot());
  const tour = snapshot.tours.find((candidate) => candidate.id === id);
  if (!tour) return "missing";
  return tourStatusOf(tour, translationsFor(snapshot, "en"));
}

export async function categoryTranslationStatus(
  id: string,
  locale: Locale,
  source?: import("@/server/repo/types").ContentSnapshot,
): Promise<TranslationStatus> {
  if (locale === "vi") return REVIEWED;
  const snapshot = source ?? (await loadPublishedSnapshot());
  return translationsFor(snapshot, "en").category[id]?.translationStatus ?? "missing";
}

export async function destinationTranslationStatus(
  id: string,
  locale: Locale,
  source?: import("@/server/repo/types").ContentSnapshot,
): Promise<TranslationStatus> {
  if (locale === "vi") return REVIEWED;
  const snapshot = source ?? (await loadPublishedSnapshot());
  return translationsFor(snapshot, "en").destination[id]?.translationStatus ?? "missing";
}

export async function articleTranslationStatus(
  id: string,
  locale: Locale,
  source?: import("@/server/repo/types").ContentSnapshot,
): Promise<TranslationStatus> {
  if (locale === "vi") return REVIEWED;
  const snapshot = source ?? (await loadPublishedSnapshot());
  return translationsFor(snapshot, "en").article[id]?.translationStatus ?? "missing";
}

/* --- Record resolution ---------------------------------------------------- */

export function resolveTour(tour: Tour, locale: Locale, translations: Translations): Tour {
  if (locale === "vi") return tour;
  const tr = translations.tour[tour.id];
  if (!tr) return tour;
  if (tour.sourceDocuments.length > 0 && tr.sourceUpdatedAt !== tour.updatedAt) return tour;

  const itinerary = tr.itinerary
    ? tour.itinerary.map((day, index) => {
        const overlay = tr.itinerary?.[index];
        if (!overlay) return day;
        return {
          ...day,
          title: overlay.title ?? day.title,
          summary: overlay.summary ?? day.summary,
          activities: overlay.activities ?? day.activities,
          meals: overlay.meals ?? day.meals,
          accommodation: overlay.accommodation ?? day.accommodation,
          places: overlay.places ?? day.places,
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

export function resolveCategory(
  category: TourCategory,
  locale: Locale,
  translations: Translations,
): TourCategory {
  if (locale === "vi") return category;
  const tr: CategoryTranslation | undefined = translations.category[category.id];
  if (!tr) return category;
  return {
    ...category,
    name: tr.name ?? category.name,
    tagline: tr.tagline ?? category.tagline,
    description: tr.description ?? category.description,
    seo: tr.seo ? { ...category.seo, ...tr.seo } : category.seo,
  };
}

export function resolveDestination(
  destination: Destination,
  locale: Locale,
  translations: Translations,
): Destination {
  if (locale === "vi") return destination;
  const tr: DestinationTranslation | undefined = translations.destination[destination.id];
  if (!tr) return destination;
  return {
    ...destination,
    name: tr.name ?? destination.name,
    province: tr.province ?? destination.province,
    summary: tr.summary ?? destination.summary,
    image: tr.imageAlt && destination.image ? { ...destination.image, alt: tr.imageAlt } : destination.image,
  };
}

type ArticleBlockTranslationLike = {
  text?: string;
  title?: string;
  items?: readonly string[];
  cite?: string;
  alt?: string;
  caption?: string;
};

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

export function resolveArticle(
  article: TravelArticle,
  locale: Locale,
  translations: Translations,
): TravelArticle {
  if (locale === "vi") return article;
  const tr: ArticleTranslation | undefined = translations.article[article.id];
  if (!tr) return article;

  const body = tr.body
    ? article.body.map((block, index) => {
        const overlay = tr.body?.[index];
        return overlay ? mergeArticleBlock(block, overlay as ArticleBlockTranslationLike) : block;
      })
    : article.body;

  return {
    ...article,
    title: tr.title ?? article.title,
    excerpt: tr.excerpt ?? article.excerpt,
    tags: tr.tags ?? article.tags,
    body,
    cover:
      tr.coverAlt && article.cover ? { ...article.cover, alt: tr.coverAlt } : article.cover,
    seo: tr.seo ? { ...article.seo, ...tr.seo } : article.seo,
  };
}
