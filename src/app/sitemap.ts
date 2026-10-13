import type { MetadataRoute } from "next";
import { articles, tours } from "@/content";
import { getCategories } from "@/lib/data/categories";
import { ROUTES } from "@/config/navigation";
import { absoluteUrl } from "@/lib/seo";

/**
 * sitemap.xml
 *
 * `lastModified` is derived from the content records rather than `new Date()`,
 * so the value is deterministic (safe under Cache Components) and actually
 * meaningful to crawlers.
 */
function newestDate(...dates: string[]): Date {
  const valid = dates
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (valid.length === 0) return new Date("2026-01-01T00:00:00Z");
  return new Date(Math.max(...valid.map((date) => date.getTime())));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const contentDate = newestDate(
    ...tours.map((tour) => tour.updatedAt),
    ...articles.map((article) => article.updatedAt ?? article.publishedAt),
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1, lastModified: contentDate },
    {
      url: absoluteUrl(ROUTES.guides),
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: contentDate,
    },
    {
      url: absoluteUrl(ROUTES.contact),
      changeFrequency: "monthly",
      priority: 0.8,
      lastModified: contentDate,
    },
    {
      url: absoluteUrl(ROUTES.privacy),
      changeFrequency: "yearly",
      priority: 0.2,
      lastModified: contentDate,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = getCategories().map((category) => ({
    url: absoluteUrl(category.path),
    changeFrequency: "monthly",
    // Parent categories are the stronger landing pages.
    priority: category.parentId === null ? 0.9 : 0.8,
    lastModified: contentDate,
  }));

  const tourRoutes: MetadataRoute.Sitemap = tours.map((tour) => ({
    url: absoluteUrl(`/tour/${tour.slug}`),
    changeFrequency: "monthly",
    priority: 0.85,
    lastModified: new Date(tour.updatedAt),
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: absoluteUrl(`/cam-nang-du-lich/${article.slug}`),
    changeFrequency: "monthly",
    priority: 0.6,
    lastModified: new Date(article.updatedAt ?? article.publishedAt),
  }));

  return [...staticRoutes, ...categoryRoutes, ...tourRoutes, ...articleRoutes];
}
