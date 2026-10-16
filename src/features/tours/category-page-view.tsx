import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCategories,
  getCategoryAndDescendantIds,
  getCategoryByPath,
  getCategoryById,
  getCategoryTourCount,
  getCategoryTrail,
  getChildCategories,
} from "@/lib/data/categories";
import { getTourTags, getToursByCategoryId } from "@/lib/data/tours";
import { buildMetadata } from "@/lib/seo";
import { collectionPageJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";
import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { CategoryCard } from "./category-card";
import { TourExplorer } from "./tour-explorer";
import { toTourCard } from "./tour-card-model";
import { ConsultSection } from "@/features/leads/consult-section";
import { TranslationNotice } from "@/components/layout/translation-notice";
import { categoryTranslationStatus } from "@/lib/data/localize";
import { isIndexable } from "@/domain/localization";
import { absoluteUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import { format, getMessages } from "@/i18n/messages";
import { localizePath } from "@/i18n/routing";
import { ROUTES } from "@/config/navigation";

/**
 * Shared view for all tour category pages (parent and child).
 *
 * `categoryPath` is passed explicitly by each route file rather than read from
 * params, which keeps every category page a fully static prerender.
 */

async function crumbsFor(path: string, locale: Locale): Promise<Crumb[]> {
  const m = getMessages(locale);
  const category = await getCategoryByPath(path, locale);
  if (!category) return [{ label: m.common.home, href: localizePath(locale, "/") }];

  const trail = await getCategoryTrail(category.id, locale);
  const crumbs: Crumb[] = [{ label: m.common.home, href: localizePath(locale, "/") }];
  trail.forEach((item, index) => {
    const isLast = index === trail.length - 1;
    crumbs.push(
      isLast
        ? { label: item.name }
        : { label: item.name, href: localizePath(locale, item.path) },
    );
  });
  return crumbs;
}

export async function buildCategoryMetadata(categoryPath: string, locale: Locale): Promise<Metadata> {
  const m = getMessages(locale);
  const category = await getCategoryByPath(categoryPath, locale);
  if (!category) {
    return buildMetadata({
      title: m.category.notFoundTitle,
      description: m.category.notFoundDescription,
      path: categoryPath,
      locale,
      noIndex: true,
      hreflang: false,
    });
  }

  const indexable = isIndexable(await categoryTranslationStatus(category.id, locale), locale);

  return buildMetadata({
    title: category.seo?.title ?? category.name,
    description: category.seo?.description ?? category.description,
    path: category.path,
    locale,
    noIndex: !indexable,
    hreflang: indexable,
  });
}

export async function CategoryPageView({
  categoryPath,
  locale,
}: {
  categoryPath: string;
  locale: Locale;
}) {
  const m = getMessages(locale);
  const category = await getCategoryByPath(categoryPath, locale);
  if (!category) notFound();

  const children = await getChildCategories(category.id, locale);
  const parent = category.parentId ? await getCategoryById(category.parentId, locale) : undefined;

  const tours = await Promise.all(
    (await getToursByCategoryId(category.id, locale)).map((tour) => toTourCard(tour, locale)),
  );
  const tags = await getTourTags(locale);
  const crumbs = await crumbsFor(categoryPath, locale);

  const siblings = parent
    ? (await getChildCategories(parent.id, locale)).filter((item) => item.id !== category.id)
    : (await getCategories(locale)).filter(
        (item) => item.parentId === null && item.id !== category.id,
      );

  const descendantCount = (await getCategoryAndDescendantIds(category.id)).length;
  const indexable = isIndexable(await categoryTranslationStatus(category.id, locale), locale);

  // One lookup for every child-category badge instead of a query per render.
  const countTargets = [...children, ...siblings];
  const tourCounts = new Map(
    await Promise.all(
      countTargets.map(
        async (item) => [item.id, await getCategoryTourCount(item.id)] as const,
      ),
    ),
  );

  return (
    <>
      <JsonLd
        id="ld-collection"
        data={collectionPageJsonLd({
          name: category.name,
          description: category.description,
          url: absoluteUrl(localizePath(locale, category.path)),
          tours: tours.map((tour) => ({ title: tour.title, url: absoluteUrl(tour.href) })),
          locale,
        })}
      />
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd(
          crumbs.map((crumb) => ({
            label: crumb.label,
            path: crumb.href ?? localizePath(locale, categoryPath),
          })),
        )}
      />

      {indexable ? null : <TranslationNotice locale={locale} />}

      <Breadcrumbs items={crumbs} ariaLabel={m.common.breadcrumbAria} />

      <section className="relative overflow-hidden border-b border-border bg-surface-muted">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-brand-100/60 blur-3xl"
        />
        <Container>
          <div className="relative flex flex-col gap-5 py-12 sm:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-strong">
              {parent ? parent.name : m.tour.categoryFallback} · {m.regions[category.region]}
            </p>

            <h1 className="max-w-3xl text-display font-display font-semibold text-foreground">
              {category.name}
            </h1>

            <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-foreground-muted">
              {category.description}
            </p>

            {children.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {children.map((child) => (
                  <li key={child.id}>
                    <a
                      href={`#${child.slug}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-strong"
                    >
                      {child.name}
                      <span className="text-xs font-medium text-foreground-subtle">
                        {tourCounts.get(child.id) ?? 0}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Container>
      </section>

      <Section tone="default" spacing="default">
        <Container>
          <h2 className="sr-only">{format(m.category.listHeadingSr, { name: category.name })}</h2>
          <Reveal>
            <TourExplorer
              tours={tours}
              tags={tags}
              labels={{
                filterLabel: m.tourExplorer.filterLabel,
                all: m.common.all,
                sortLabel: m.tourExplorer.sortLabel,
                sortRecommended: m.tourExplorer.sortRecommended,
                sortDurationAsc: m.tourExplorer.sortDurationAsc,
                sortDurationDesc: m.tourExplorer.sortDurationDesc,
                tourCount: m.common.tourCount,
                clearFilter: m.common.clearFilters,
                emptyTitle: m.tourExplorer.emptyTitle,
                emptyBody: m.tourExplorer.emptyBody,
                clearFiltersShort: m.common.clearFilterShort,
                sendRequest: m.common.sendConsultRequest,
                contactHref: localizePath(locale, ROUTES.contact),
              }}
            />
          </Reveal>
        </Container>
      </Section>

      {children.length > 0 ? (
        <Section tone="muted" spacing="default">
          <Container>
            <SectionHeading
              eyebrow={m.category.groupEyebrow}
              title={m.category.groupTitle}
              description={m.category.groupDescription}
            />
            <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {children.map((child) => (
                <Reveal as="li" key={child.id} className="flex">
                  <CategoryCard
                    category={child}
                    locale={locale}
                    tourCount={tourCounts.get(child.id) ?? 0}
                    className="w-full"
                  />
                </Reveal>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {siblings.length > 0 ? (
        <Section tone="default" spacing="tight">
          <Container>
            <SectionHeading
              eyebrow={m.category.moreEyebrow}
              title={
                parent
                  ? format(m.category.moreTitleInParent, { name: parent.name })
                  : m.category.moreTitle
              }
              as="h2"
            />
            <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {siblings.map((sibling) => (
                <Reveal as="li" key={sibling.id} className="flex">
                  <CategoryCard
                    category={sibling}
                    locale={locale}
                    tourCount={tourCounts.get(sibling.id) ?? 0}
                    className="w-full"
                  />
                </Reveal>
              ))}
            </ul>
            <p className="mt-6 text-xs text-foreground-subtle">
              {format(m.category.groupCount, { count: descendantCount })}
            </p>
          </Container>
        </Section>
      ) : null}

      <ConsultSection
        locale={locale}
        defaultInterest={category.name}
        tone="muted"
        title={m.category.consultTitle}
        description={m.category.consultDescription}
      />
    </>
  );
}
