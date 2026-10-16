import type { TravelArticle } from "@/domain/article";
import type { Locale } from "@/i18n/config";
import type { ContentSnapshot } from "@/server/repo/types";
import { loadPublishedSnapshot, translationsFor } from "./snapshot";
import { resolveArticle } from "./localize";
import { getSiteSettings } from "./settings";

/** All published articles, newest first, resolved for the requested locale. */

async function snap(source?: ContentSnapshot): Promise<ContentSnapshot> {
  return source ?? loadPublishedSnapshot();
}

export async function getArticles(
  locale: Locale,
  source?: ContentSnapshot,
): Promise<TravelArticle[]> {
  const snapshot = await snap(source);
  const translations = translationsFor(snapshot, locale);
  return [...snapshot.articles]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .map((article) => resolveArticle(article, locale, translations));
}

export async function getArticleBySlug(
  slug: string,
  locale: Locale,
  source?: ContentSnapshot,
): Promise<TravelArticle | undefined> {
  const snapshot = await snap(source);
  const article = snapshot.articles.find((candidate) => candidate.slug === slug);
  if (!article) return undefined;
  return resolveArticle(article, locale, translationsFor(snapshot, locale));
}

export async function getArticleSlugs(source?: ContentSnapshot): Promise<string[]> {
  const snapshot = await snap(source);
  return snapshot.articles.map((article) => article.slug);
}

export async function getFeaturedArticle(
  locale: Locale,
  source?: ContentSnapshot,
): Promise<TravelArticle | undefined> {
  const snapshot = await snap(source);
  const settings = await getSiteSettings(locale, snapshot);
  const pinnedSlug = settings.home?.featuredArticleSlug;
  const all = await getArticles(locale, snapshot);
  if (pinnedSlug) {
    const pinned = all.find((article) => article.slug === pinnedSlug);
    if (pinned) return pinned;
  }
  return all.find((article) => article.featured) ?? all[0];
}

export async function getNonFeaturedArticles(
  locale: Locale,
  source?: ContentSnapshot,
): Promise<TravelArticle[]> {
  const featured = await getFeaturedArticle(locale, source);
  return (await getArticles(locale, source)).filter((article) => article.slug !== featured?.slug);
}

/** Related reading: shared destination first, then shared tour, then recent. */
export async function getRelatedArticles(
  slug: string,
  limit = 3,
  locale: Locale,
  source?: ContentSnapshot,
): Promise<TravelArticle[]> {
  const snapshot = await snap(source);
  const article = snapshot.articles.find((candidate) => candidate.slug === slug);
  if (!article) return [];

  const destinationIds = new Set(article.destinationIds);
  const tourSlugs = new Set(article.relatedTourSlugs);

  const scored = (await getArticles(locale, snapshot))
    .filter((candidate) => candidate.slug !== article.slug)
    .map((candidate) => {
      let score = 0;
      for (const id of candidate.destinationIds) if (destinationIds.has(id)) score += 3;
      for (const s of candidate.relatedTourSlugs) if (tourSlugs.has(s)) score += 2;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const chosen = scored.map((entry) => entry.candidate);
  if (chosen.length >= limit) return chosen.slice(0, limit);

  const seen = new Set(chosen.map((c) => c.slug));
  const fallback = (await getArticles(locale, snapshot)).filter(
    (candidate) => candidate.slug !== article.slug && !seen.has(candidate.slug),
  );
  return [...chosen, ...fallback].slice(0, limit);
}
