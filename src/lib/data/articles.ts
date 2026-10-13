import { articles } from "@/content";
import type { TravelArticle } from "@/domain/article";
import { getTourBySlug } from "./tours";

export function getArticles(): readonly TravelArticle[] {
  return [...articles].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getArticleBySlug(slug: string): TravelArticle | undefined {
  return articles.find((article) => article.slug === slug);
}

export function getArticleSlugs(): readonly string[] {
  return articles.map((article) => article.slug);
}

export function getFeaturedArticle(): TravelArticle | undefined {
  return getArticles().find((article) => article.featured) ?? getArticles()[0];
}

export function getNonFeaturedArticles(): readonly TravelArticle[] {
  const featured = getFeaturedArticle();
  return getArticles().filter((article) => article.slug !== featured?.slug);
}

/** Related reading: shared destination first, then shared tour, then recent. */
export function getRelatedArticles(slug: string, limit = 3): readonly TravelArticle[] {
  const article = getArticleBySlug(slug);
  if (!article) return [];

  const destinationIds = new Set(article.destinationIds);
  const tourSlugs = new Set(article.relatedTourSlugs);

  const scored = getArticles()
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
  const fallback = getArticles().filter(
    (candidate) => candidate.slug !== article.slug && !seen.has(candidate.slug),
  );
  return [...chosen, ...fallback].slice(0, limit);
}

/** Tours referenced by an article, resolved to real records (dead refs skipped). */
export function getArticleRelatedTours(article: TravelArticle) {
  return article.relatedTourSlugs
    .map((slug) => getTourBySlug(slug))
    .filter((tour): tour is NonNullable<typeof tour> => Boolean(tour));
}
