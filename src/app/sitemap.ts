export const dynamic = "force-dynamic";
import { published } from "@/server/cms/store";
import { articles as seed_articles, tours as seed_tours } from "@/content";
const current_tours = () => published("tours", seed_tours);
const current_articles = () => published("articles", seed_articles);
import type { MetadataRoute } from "next";
import { getCategories } from "@/lib/data/categories";
import { ROUTES } from "@/config/navigation";
import { absoluteUrl } from "@/lib/seo";
import { localizePath } from "@/i18n/routing";
import { isIndexable } from "@/domain/localization";
import {
  articleTranslationStatus,
  categoryTranslationStatus,
  tourTranslationStatus,
} from "@/lib/data/localize";

/**
 * sitemap.xml
 *
 * `lastModified` is derived from the content records rather than `new Date()`,
 * so the value is deterministic (safe under Cache Components) and actually
 * meaningful to crawlers.
 *
 * Publishing rule: an English URL is listed only when its translation is
 * `reviewed`. Draft or missing translations never appear, and `x-default` always
 * points at the Vietnamese page. Alternates are emitted two-way for any page
 * that has an eligible pair.
 */
function newestDate(...dates: string[]): Date {
  const valid = dates
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (valid.length === 0) return new Date("2026-01-01T00:00:00Z");
  return new Date(Math.max(...valid.map((date) => date.getTime())));
}

type Entry = MetadataRoute.Sitemap[number];

function entry(
  path: string,
  lastModified: Date,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  englishIndexable: boolean,
): Entry[] {
  const alternates = englishIndexable
    ? {
        languages: {
          vi: absoluteUrl(localizePath("vi", path)),
          en: absoluteUrl(localizePath("en", path)),
          "x-default": absoluteUrl(localizePath("vi", path)),
        },
      }
    : undefined;

  const vi: Entry = {
    url: absoluteUrl(localizePath("vi", path)),
    changeFrequency,
    priority,
    lastModified,
    ...(alternates ? { alternates } : {}),
  };

  if (!englishIndexable) return [vi];

  const en: Entry = {
    url: absoluteUrl(localizePath("en", path)),
    changeFrequency,
    priority,
    lastModified,
    ...(alternates ? { alternates } : {}),
  };

  return [vi, en];
}

export default function sitemap(): MetadataRoute.Sitemap {
  const contentDate = newestDate(
    ...current_tours().map((tour) => tour.updatedAt),
    ...current_articles().map(
      (article) => article.updatedAt ?? article.publishedAt,
    ),
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    // The English home aggregates draft tour cards, so it is not listed yet.
    ...entry("/", contentDate, 1, "weekly", false),
    ...entry(ROUTES.guides, contentDate, 0.7, "weekly", false),
    // UI-only page: safe to publish in English.
    ...entry(ROUTES.contact, contentDate, 0.8, "monthly", true),
    ...entry(ROUTES.privacy, contentDate, 0.2, "yearly", false),
  ];

  const categoryRoutes: MetadataRoute.Sitemap = getCategories("vi").flatMap(
    (category) =>
      entry(
        category.path,
        contentDate,
        category.parentId === null ? 0.9 : 0.8,
        "monthly",
        isIndexable(categoryTranslationStatus(category.id, "en"), "en"),
      ),
  );

  const tourRoutes: MetadataRoute.Sitemap = current_tours().flatMap((tour) =>
    entry(
      `/tour/${tour.slug}`,
      new Date(tour.updatedAt),
      0.85,
      "monthly",
      isIndexable(tourTranslationStatus(tour.id, "en"), "en"),
    ),
  );

  const articleRoutes: MetadataRoute.Sitemap = current_articles().flatMap(
    (article) =>
      entry(
        `/cam-nang-du-lich/${article.slug}`,
        new Date(article.updatedAt ?? article.publishedAt),
        0.6,
        "monthly",
        isIndexable(articleTranslationStatus(article.id, "en"), "en"),
      ),
  );

  return [...staticRoutes, ...categoryRoutes, ...tourRoutes, ...articleRoutes];
}
