import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ROUTES } from "@/config/navigation";
import {
  getArticleBySlug,
  getArticleSlugs,
  getRelatedArticles,
} from "@/lib/data/articles";
import { getTourBySlug } from "@/lib/data/tours";
import { contentRedirect } from "@/lib/data/redirects";
import { formatDateLong } from "@/lib/format";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";
import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { AssetImage } from "@/components/ui/asset-image";
import { ClockIcon } from "@/components/ui/icons";
import { ArticleBody } from "@/features/guides/article-body";
import { ArticleCard } from "@/features/guides/article-card";
import { TourCard } from "@/features/tours/tour-card";
import { toTourCard } from "@/features/tours/tour-card-model";
import { ConsultSection } from "@/features/leads/consult-section";
import { TranslationNotice } from "@/components/layout/translation-notice";
import { articleTranslationStatus } from "@/lib/data/localize";
import { isIndexable } from "@/domain/localization";
import { getMessages, plural } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import { resolveLocaleFromParams } from "@/i18n/params";

export function generateStaticParams() {
  return getArticleSlugs().map((slug) => ({ slug }));
}

/**
 * See the note in `app/tour/[slug]/page.tsx`: every real article slug is
 * prerendered, and the page's content depends entirely on the slug, so blocking
 * is the intended behaviour rather than a Suspense skeleton.
 */

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cam-nang-du-lich/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = await resolveLocaleFromParams(params);
  const article = getArticleBySlug(slug, locale);

  // 404 during metadata resolution — before the PPR shell streams. A `notFound()`
  // reached while streaming degrades to a soft 404 (HTTP 200 + noindex).
  if (!article) {
    const target = contentRedirect(`/cam-nang-du-lich/${slug}`);
    if (target) permanentRedirect(localizePath(locale, target));
    notFound();
  }

  const indexable = isIndexable(
    articleTranslationStatus(article.id, locale),
    locale,
  );

  return buildMetadata({
    title: article.seo?.title ?? article.title,
    description: article.seo?.description ?? article.excerpt,
    path: `/cam-nang-du-lich/${article.slug}`,
    locale,
    type: "article",
    publishedTime: article.publishedAt,
    keywords: article.tags,
    image: article.seo?.ogImage ?? article.cover?.src,
    noIndex: !indexable,
    hreflang: indexable,
    enIndexable: isIndexable(
      articleTranslationStatus(article.id, "en"),
      "en",
    ),
  });
}

export default async function ArticlePage({
  params,
}: PageProps<"/[locale]/cam-nang-du-lich/[slug]">) {
  const { slug } = await params;
  const locale = await resolveLocaleFromParams(params);
  const m = getMessages(locale);
  const article = getArticleBySlug(slug, locale);
  if (!article) {
    const target = contentRedirect(`/cam-nang-du-lich/${slug}`);
    if (target) permanentRedirect(localizePath(locale, target));
    notFound();
  }

  const indexable = isIndexable(
    articleTranslationStatus(article.id, locale),
    locale,
  );

  const relatedTours = article.relatedTourSlugs
    .map((tourSlug) => getTourBySlug(tourSlug, locale))
    .filter((tour): tour is NonNullable<typeof tour> => Boolean(tour))
    .map((tour) => toTourCard(tour, locale));

  const relatedArticles = getRelatedArticles(article.slug, 3, locale);
  const articlePath = `/cam-nang-du-lich/${article.slug}`;
  const crumbs: Crumb[] = [
    { label: m.common.home, href: localizePath(locale, ROUTES.home) },
    { label: m.nav.guides, href: localizePath(locale, ROUTES.guides) },
    { label: article.title },
  ];

  return (
    <>
      <JsonLd
        id="ld-article"
        data={articleJsonLd({
          title: article.title,
          excerpt: article.excerpt,
          url: absoluteUrl(localizePath(locale, articlePath)),
          publishedAt: article.publishedAt,
          updatedAt: article.updatedAt,
          image: article.cover?.src ?? "/opengraph-image.png",
          author: article.author,
          locale,
        })}
      />
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: m.common.home, path: localizePath(locale, "/") },
          { label: m.nav.guides, path: localizePath(locale, ROUTES.guides) },
          { label: article.title, path: localizePath(locale, articlePath) },
        ])}
      />

      {indexable ? null : <TranslationNotice locale={locale} />}

      <Breadcrumbs items={crumbs} ariaLabel={m.common.breadcrumbAria} />

      <Container>
        <article className="mx-auto max-w-3xl pt-4">
          <header className="flex flex-col gap-4">
            <h1 className="text-display font-display font-semibold text-foreground">
              {article.title}
            </h1>

            <p className="text-[1.0625rem] leading-relaxed text-foreground-muted">
              {article.excerpt}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground-subtle">
              <time dateTime={article.publishedAt}>
                {formatDateLong(article.publishedAt, locale)}
              </time>
              {article.readingMinutes ? (
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="h-4 w-4" />
                  {plural(m.common.readMinutes, article.readingMinutes)}
                </span>
              ) : null}
              <span>{article.author}</span>
            </div>

            {article.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {article.tags.map((tag) => (
                  <li key={tag}>
                    <Badge tone="outline">{tag}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          <AssetImage
            image={article.cover}
            altFallback={article.title}
            priority
            sizes="(max-width: 768px) 100vw, 48rem"
            className="mt-8 aspect-[16/9] w-full rounded-2xl border border-border shadow-soft"
            markPlaceholder
          />

          <div className="mt-10">
            <ArticleBody blocks={article.body} />
          </div>
        </article>
      </Container>

      {relatedTours.length > 0 ? (
        <Section tone="muted" spacing="default">
          <Container>
            <SectionHeading
              eyebrow={m.guides.relatedToursEyebrow}
              title={m.guides.relatedToursTitle}
              description={m.guides.relatedToursDescription}
              as="h2"
            />
            <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedTours.map((tour) => (
                <li key={tour.slug} className="flex">
                  <TourCard tour={tour} />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {relatedArticles.length > 0 ? (
        <Section tone="default" spacing="default">
          <Container>
            <SectionHeading
              eyebrow={m.guides.relatedArticlesEyebrow}
              title={m.guides.relatedArticlesTitle}
              as="h2"
              action={
                <ButtonLink
                  href={localizePath(locale, ROUTES.guides)}
                  variant="secondary"
                >
                  {m.guides.allGuides}
                </ButtonLink>
              }
            />
            <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((related) => (
                <Reveal as="li" key={related.slug} className="flex">
                  <ArticleCard
                    article={related}
                    locale={locale}
                    className="w-full"
                  />
                </Reveal>
              ))}
            </ul>
            <p className="mt-6 text-sm text-foreground-muted">
              {m.guides.askQuestionPre}{" "}
              <Link
                href={localizePath(locale, ROUTES.contact)}
                className="font-semibold text-primary-strong underline underline-offset-2"
              >
                {m.guides.askQuestionLink}
              </Link>
              {m.guides.askQuestionPost}
            </p>
          </Container>
        </Section>
      ) : null}

      <ConsultSection
        locale={locale}
        tone="muted"
        title={m.guides.articleConsultTitle}
        description={m.guides.articleConsultDescription}
      />
    </>
  );
}
