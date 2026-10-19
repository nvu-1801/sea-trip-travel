import { published } from "@/server/cms/store";
import { articles as seed_articles } from "@/content";
const current_articles = () => published("articles", seed_articles);
import type { TravelArticle } from "@/domain/article";
import type { Locale } from "@/i18n/config";
import { resolveArticle } from "./localize";

/** All current_articles(), newest first, resolved for the requested locale. */
export function getArticles(locale: Locale): readonly TravelArticle[] {
  return [...current_articles()]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .map((article) => resolveArticle(article, locale));
}

export function getArticleBySlug(
  slug: string,
  locale: Locale,
): TravelArticle | undefined {
  const article = current_articles().find(
    (candidate) => candidate.slug === slug,
  );
  return article ? resolveArticle(article, locale) : undefined;
}

export function getArticleSlugs(): readonly string[] {
  return current_articles().map((article) => article.slug);
}

export function getFeaturedArticle(locale: Locale): TravelArticle | undefined {
  const all = getArticles(locale);
  return all.find((article) => article.featured) ?? all[0];
}

export function getNonFeaturedArticles(
  locale: Locale,
): readonly TravelArticle[] {
  const featured = getFeaturedArticle(locale);
  return getArticles(locale).filter(
    (article) => article.slug !== featured?.slug,
  );
}

/** Related reading: shared destination first, then shared tour, then recent. */
export function getRelatedArticles(
  slug: string,
  limit = 3,
  locale: Locale,
): readonly TravelArticle[] {
  const article = current_articles().find(
    (candidate) => candidate.slug === slug,
  );
  if (!article) return [];

  const destinationIds = new Set(article.destinationIds);
  const tourSlugs = new Set(article.relatedTourSlugs);

  const scored = getArticles(locale)
    .filter((candidate) => candidate.slug !== article.slug)
    .map((candidate) => {
      let score = 0;
      for (const id of candidate.destinationIds)
        if (destinationIds.has(id)) score += 3;
      for (const s of candidate.relatedTourSlugs)
        if (tourSlugs.has(s)) score += 2;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const chosen = scored.map((entry) => entry.candidate);
  if (chosen.length >= limit) return chosen.slice(0, limit);

  const seen = new Set(chosen.map((c) => c.slug));
  const fallback = getArticles(locale).filter(
    (candidate) => candidate.slug !== article.slug && !seen.has(candidate.slug),
  );
  return [...chosen, ...fallback].slice(0, limit);
}
