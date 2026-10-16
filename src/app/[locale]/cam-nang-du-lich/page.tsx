import type { Metadata } from "next";
import { ROUTES } from "@/config/navigation";
import { getFeaturedArticle, getNonFeaturedArticles } from "@/lib/data/articles";
import { getCategoryTourCount, getTopLevelCategories } from "@/lib/data/categories";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { ArticleCard } from "@/features/guides/article-card";
import { CategoryCard } from "@/features/tours/category-card";
import { ConsultSection } from "@/features/leads/consult-section";
import { TranslationNotice } from "@/components/layout/translation-notice";
import { articleTranslationStatus } from "@/lib/data/localize";
import { isIndexable } from "@/domain/localization";
import { getMessages } from "@/i18n/messages";
import { localizePath } from "@/i18n/routing";
import { resolveLocaleFromParams } from "@/i18n/params";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocaleFromParams(params);
  const m = getMessages(locale);
  const featured = await getFeaturedArticle(locale);
  const indexable = featured
    ? isIndexable(await articleTranslationStatus(featured.id, locale), locale)
    : locale === "vi";

  return buildMetadata({
    title: m.guides.indexTitle,
    description: m.guides.indexDescription,
    path: ROUTES.guides,
    locale,
    noIndex: !indexable,
    hreflang: indexable,
  });
}

export default async function GuidesPage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocaleFromParams(params);
  const m = getMessages(locale);
  const featured = await getFeaturedArticle(locale);
  const rest = await getNonFeaturedArticles(locale);
  const categories = await getTopLevelCategories(locale);
  const indexable = featured
    ? isIndexable(await articleTranslationStatus(featured.id, locale), locale)
    : locale === "vi";
  const tourCounts = new Map(
    await Promise.all(
      categories.map(async (category) => [category.id, await getCategoryTourCount(category.id)] as const),
    ),
  );

  const crumbs = [
    { label: m.common.home, href: localizePath(locale, "/") },
    { label: m.nav.guides },
  ];

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: m.common.home, path: localizePath(locale, "/") },
          { label: m.nav.guides, path: localizePath(locale, ROUTES.guides) },
        ])}
      />

      {indexable ? null : <TranslationNotice locale={locale} />}

      <Breadcrumbs items={crumbs} ariaLabel={m.common.breadcrumbAria} />

      <section className="relative overflow-hidden border-b border-border bg-surface-muted">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-100/70 blur-3xl"
        />
        <Container>
          <div className="relative flex flex-col gap-4 py-12 sm:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-strong">
              {m.guides.heroEyebrow}
            </p>
            <h1 className="max-w-3xl text-display font-display font-semibold text-foreground">
              {m.guides.heroTitle}
            </h1>
            <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-foreground-muted">
              {m.guides.heroDescription}
            </p>
          </div>
        </Container>
      </section>

      {featured ? (
        <Section tone="default" spacing="default">
          <Container>
            <h2 className="sr-only">{m.guides.featuredSr}</h2>
            <Reveal>
              <ArticleCard article={featured} locale={locale} variant="feature" />
            </Reveal>
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
                  <ArticleCard article={article} locale={locale} className="w-full" />
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
                  tourCount={tourCounts.get(category.id) ?? 0}
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
