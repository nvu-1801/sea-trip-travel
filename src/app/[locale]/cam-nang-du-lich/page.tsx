import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/config/navigation";
import {
  getFeaturedArticle,
  getNonFeaturedArticles,
} from "@/lib/data/articles";
import {
  getCategoryTourCount,
  getTopLevelCategories,
} from "@/lib/data/categories";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/json-ld";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { PageHero } from "@/features/shared/page-hero";
import { ArticleCard } from "@/features/guides/article-card";
import { CategoryCard } from "@/features/tours/category-card";
import { ConsultSection } from "@/features/leads/consult-section";
import { TranslationNotice } from "@/components/layout/translation-notice";
import { articleTranslationStatus } from "@/lib/data/localize";
import { isIndexable } from "@/domain/localization";
import { isResolvedTranslationComplete } from "@/lib/translation-coverage";
import { getMessages, plural } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import { resolveLocaleFromParams } from "@/i18n/params";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocaleFromParams(params);
  const m = getMessages(locale);
  const featured = getFeaturedArticle(locale);
  const indexable = featured
    ? isIndexable(articleTranslationStatus(featured.id, locale), locale)
    : locale === "vi";

  return buildMetadata({
    title: m.guides.indexTitle,
    description: m.guides.indexDescription,
    path: ROUTES.guides,
    locale,
    noIndex: !indexable,
    hreflang: indexable,
    enIndexable: featured
      ? isIndexable(articleTranslationStatus(featured.id, "en"), "en")
      : false,
  });
}

export default async function GuidesPage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocaleFromParams(params);
  const m = getMessages(locale);
  const featured = getFeaturedArticle(locale);
  const rest = getNonFeaturedArticles(locale);
  const categories = getTopLevelCategories(locale);
  const allArticles = [...(featured ? [featured] : []), ...rest];
  const allTranslated =
    locale === "vi" ||
    allArticles.every((article) =>
      isResolvedTranslationComplete("articles", article),
    );

  const crumbs = [
    { label: m.common.home, href: localizePath(locale, "/") },
    { label: m.nav.guides },
  ];

  const articles = featured ? [featured, ...rest] : rest;
  const readingTimes = articles
    .map((article) => article.readingMinutes ?? 5)
    .filter((minutes) => Number.isFinite(minutes));
  const minRead = readingTimes.length ? Math.min(...readingTimes) : 5;
  const maxRead = readingTimes.length ? Math.max(...readingTimes) : 5;
  const readRange =
    minRead === maxRead ? String(minRead) : `${minRead}–${maxRead}`;

  const featuredHref = featured
    ? localizePath(locale, `/cam-nang-du-lich/${featured.slug}`)
    : localizePath(locale, ROUTES.quyNhonPhuYen);

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: m.common.home, path: localizePath(locale, "/") },
          { label: m.nav.guides, path: localizePath(locale, ROUTES.guides) },
        ])}
      />

      <PageHero
        crumbs={crumbs}
        crumbsLabel={m.common.breadcrumbAria}
        notice={
          allTranslated ? null : (
            <TranslationNotice
              locale={locale}
              viHref={localizePath("vi", ROUTES.guides)}
            />
          )
        }
        eyebrow={m.guides.heroEyebrow}
        titleLines={[
          { text: m.guides.heroTitleLine1 },
          { text: m.guides.heroTitleLine2, emphasis: true },
        ]}
        description={m.guides.heroDescription}
        actions={
          <>
            <ButtonLink href={featuredHref} size="lg">
              {m.guides.heroCta}
            </ButtonLink>
            <Link
              href={localizePath(locale, ROUTES.quyNhonPhuYen)}
              className="stt-page-hero-link"
            >
              {m.nav.quyNhonPhuYen}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </>
        }
        meta={[
          { label: m.guides.heroMetaArticles, value: articles.length },
          { label: m.guides.heroMetaRead, value: readRange },
        ]}
        media={{
          src: "/images/hero/blue-bay.webp",
          alt: m.guides.heroImageAlt,
          sizes: "(max-width: 1023px) 100vw, 46vw",
        }}
        floating={
          featured ? (
            <Link href={featuredHref} className="group block">
              <p className="stt-page-hero-float-kicker">
                {m.guides.featuredBadge}
              </p>
              <p className="stt-page-hero-float-body line-clamp-2 transition-colors group-hover:text-primary-strong">
                {featured.title}
              </p>
              <p className="mt-1 text-[0.6875rem] font-semibold text-foreground-subtle">
                {plural(m.common.readMinutesShort, featured.readingMinutes ?? 5)}
              </p>
            </Link>
          ) : null
        }
        scrollCue={m.common.scrollCue}
      />

      {featured ? (
        <Section
          id="bai-noi-bat"
          tone="default"
          spacing="none"
          className="pt-6 pb-12 sm:pt-8 sm:pb-16"
        >
          <Container>
            <h2 className="sr-only">{m.guides.featuredSr}</h2>
            <ArticleCard
              article={featured}
              locale={locale}
              variant="feature"
            />
          </Container>
        </Section>
      ) : null}

      {rest.length > 0 ? (
        <Section tone="muted" spacing="default">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow={m.guides.otherEyebrow}
                title={m.guides.otherTitle}
                as="h2"
              />
            </Reveal>
            <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((article) => (
                <Reveal as="li" key={article.slug} className="flex">
                  <ArticleCard
                    article={article}
                    locale={locale}
                    className="w-full"
                  />
                </Reveal>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <Section tone="default" spacing="default">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={m.guides.toToursEyebrow}
              title={m.guides.toToursTitle}
              description={m.guides.toToursDescription}
              as="h2"
            />
          </Reveal>
          <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {categories.map((category) => (
              <Reveal as="li" key={category.id} className="flex">
                <CategoryCard
                  category={category}
                  locale={locale}
                  tourCount={getCategoryTourCount(category.id)}
                  className="w-full"
                />
              </Reveal>
            ))}
          </ul>
        </Container>
      </Section>

      <ConsultSection
        locale={locale}
        tone="muted"
        title={m.guides.consultTitle}
        description={m.guides.consultDescription}
      />
    </>
  );
}
