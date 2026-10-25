import Link from "next/link";
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
import type { Crumb } from "@/components/layout/breadcrumbs";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { PageHero } from "@/features/shared/page-hero";
import { CategoryCard } from "./category-card";
import { TourExplorer } from "./tour-explorer";
import { toTourCard } from "./tour-card-model";
import { ConsultSection } from "@/features/leads/consult-section";
import { TranslationNotice } from "@/components/layout/translation-notice";
import { categoryTranslationStatus } from "@/lib/data/localize";
import { isIndexable } from "@/domain/localization";
import { absoluteUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/config";
import { format, getMessages, plural } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import { ROUTES } from "@/config/navigation";
import { CATEGORY_SEO } from "@/content/seo";

/**
 * Shared view for all tour category pages (parent and child).
 *
 * `categoryPath` is passed explicitly by each route file rather than read from
 * params, which keeps every category page a fully static prerender.
 */

function crumbsFor(path: string, locale: Locale): Crumb[] {
  const m = getMessages(locale);
  const category = getCategoryByPath(path, locale);
  if (!category)
    return [{ label: m.common.home, href: localizePath(locale, "/") }];

  const trail = getCategoryTrail(category.id, locale);
  const crumbs: Crumb[] = [
    { label: m.common.home, href: localizePath(locale, "/") },
  ];
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

export function buildCategoryMetadata(
  categoryPath: string,
  locale: Locale,
): Metadata {
  const m = getMessages(locale);
  const category = getCategoryByPath(categoryPath, locale);
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

  const indexable = isIndexable(
    categoryTranslationStatus(category.id, locale),
    locale,
  );
  const seoDefault = locale === "vi" ? CATEGORY_SEO[category.id] : undefined;

  return buildMetadata({
    title: category.seo?.title ?? seoDefault?.title ?? category.name,
    description:
      category.seo?.description ??
      seoDefault?.description ??
      category.description,
    path: category.path,
    locale,
    noIndex: !indexable,
    hreflang: indexable,
    enIndexable: isIndexable(
      categoryTranslationStatus(category.id, "en"),
      "en",
    ),
  });
}

export function CategoryPageView({
  categoryPath,
  locale,
}: {
  categoryPath: string;
  locale: Locale;
}) {
  const m = getMessages(locale);
  const category = getCategoryByPath(categoryPath, locale);
  if (!category) notFound();

  const children = getChildCategories(category.id, locale);
  const parent = category.parentId
    ? getCategoryById(category.parentId, locale)
    : undefined;

  const tours = getToursByCategoryId(category.id, locale).map((tour) =>
    toTourCard(tour, locale),
  );
  const tags = getTourTags(locale);
  const crumbs = crumbsFor(categoryPath, locale);

  const siblings = parent
    ? getChildCategories(parent.id, locale).filter(
        (item) => item.id !== category.id,
      )
    : getCategories(locale).filter(
        (item) => item.parentId === null && item.id !== category.id,
      );

  const descendantCount = getCategoryAndDescendantIds(category.id).length;
  const indexable = isIndexable(
    categoryTranslationStatus(category.id, locale),
    locale,
  );

  const dayValues = tours.map((tour) => tour.durationDays);
  const minDays = dayValues.length ? Math.min(...dayValues) : 0;
  const maxDays = dayValues.length ? Math.max(...dayValues) : 0;
  const durationValue =
    tours.length === 0
      ? "—"
      : minDays === maxDays
        ? plural(m.common.dayUnit, minDays)
        : format(m.category.metaDurationRange, { min: minDays, max: maxDays });

  const regionLabel = m.regions[category.region];
  const scopeLabel = parent ? parent.name : m.tour.categoryFallback;
  const normalizeScope = (value: string) =>
    value
      .toLowerCase()
      .replace(/^tour\s+/, "")
      .replace(/\s*[-–—]\s*/g, "-")
      .trim();
  const eyebrow =
    normalizeScope(scopeLabel) === normalizeScope(regionLabel)
      ? scopeLabel
      : `${scopeLabel} · ${regionLabel}`;

  return (
    <>
      <JsonLd
        id="ld-collection"
        data={collectionPageJsonLd({
          name: category.name,
          description: category.description,
          url: absoluteUrl(localizePath(locale, category.path)),
          tours: tours.map((tour) => ({
            title: tour.title,
            url: absoluteUrl(tour.href),
          })),
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

      <PageHero
        className="stt-tour-category-hero"
        crumbs={crumbs}
        crumbsLabel={m.common.breadcrumbAria}
        notice={indexable ? null : <TranslationNotice locale={locale} />}
        eyebrow={eyebrow}
        titleLines={[{ text: category.name }]}
        description={category.description}
        actions={
          <>
            <ButtonLink href="#tour-list" size="lg">
              {format(m.category.heroCta, { count: tours.length })}
            </ButtonLink>
            {category.region === "quy-nhon-phu-yen" ? (
              <Link
                href={localizePath(
                  locale,
                  "/cam-nang-du-lich/kinh-nghiem-du-lich-quy-nhon-phu-yen",
                )}
                className="stt-page-hero-link"
              >
                Kinh nghiệm du lịch Quy Nhơn – Phú Yên
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href={localizePath(locale, ROUTES.contact)}
                className="stt-page-hero-link"
              >
                {m.common.requestConsultationFree}
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            )}
          </>
        }
        meta={[
          { label: m.category.metaTours, value: tours.length },
          { label: m.common.duration, value: durationValue },
          { label: m.common.departure, value: m.category.metaDaily },
        ]}
        badges={
          children.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {children.map((child) => (
                <li key={child.id}>
                  <a href={`#${child.slug}`} className="stt-page-hero-chip">
                    {child.name}
                    <span>{getCategoryTourCount(child.id)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null
        }
        media={{
          src: category.image?.src,
          alt: category.image?.alt ?? category.name,
          // Cover crops a landscape source into a taller frame; request enough
          // source pixels for the covered height as well as the visible width.
          sizes: "(max-width: 1023px) 150vw, 70vw",
        }}
        floating={
          <div>
            <p className="stt-page-hero-float-kicker">
              {plural(m.common.tourCount, tours.length)}
            </p>
            <p className="stt-page-hero-float-body">
              {category.tagline ?? m.regions[category.region]}
            </p>
          </div>
        }
        scrollCue={m.common.scrollCue}
      />

      <Section
        id="tour-list"
        tone="default"
        spacing="tight"
        className="relative"
      >
        <Container>
          <div className="relative z-10">
            <h2 className="sr-only">
              {format(m.category.listHeadingSr, { name: category.name })}
            </h2>
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
          </div>
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
                    tourCount={getCategoryTourCount(child.id)}
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
                    tourCount={getCategoryTourCount(sibling.id)}
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
