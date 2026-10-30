import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ROUTES } from "@/config/navigation";
import { getRelatedTours, getTourBySlug } from "@/lib/data/tours";
import { getCategoryById, getCategoryTrail } from "@/lib/data/categories";
import { getDestinationsByIds } from "@/lib/data/destinations";
import {
  formatDuration,
  formatPriceFrom,
  hasPublishedPrice,
} from "@/lib/format";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, touristTripJsonLd } from "@/lib/json-ld";
import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import {
  ArrowRightIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { ConsultSection } from "@/features/leads/consult-section";
import { TranslationNotice } from "@/components/layout/translation-notice";
import { isIndexable } from "@/domain/localization";
import { isResolvedTranslationComplete } from "@/lib/translation-coverage";
import type { Tour } from "@/domain/tour";
import { tourTranslationStatus } from "@/lib/data/localize";
import type { Locale } from "@/i18n/config";
import { format, getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import { ItineraryTimeline } from "./itinerary-timeline";
import { TourGallery } from "./tour-gallery";
import { TourGrid } from "./tour-grid";
import { toTourCard } from "./tour-card-model";
import {
  TourHighlights,
  TourKeyFacts,
  TourNotes,
  TourPolicies,
  TourPriceBlock,
  TourPackages,
  TourServices,
} from "./tour-facts";
import { MobileConsultBar } from "./mobile-consult-bar";
import { TOUR_SEO } from "@/content/seo";
import "./tour-detail.css";

function crumbsFor(tour: Tour, locale: Locale): Crumb[] {
  const m = getMessages(locale);
  const crumbs: Crumb[] = [
    { label: m.common.home, href: localizePath(locale, ROUTES.home) },
  ];

  const category = getCategoryById(tour.categoryIds[0], locale);
  if (category) {
    const trail = getCategoryTrail(category.id, locale);
    trail.forEach((item) =>
      crumbs.push({
        label: item.name,
        href: localizePath(locale, item.path),
      }),
    );
  }

  crumbs.push({ label: tour.title });
  return crumbs;
}

export function buildTourMetadata(slug: string, locale: Locale): Metadata {
  const m = getMessages(locale);
  const tour = getTourBySlug(slug, locale);
  if (!tour) {
    return buildMetadata({
      title: m.tour.notFoundTitle,
      description: m.tour.notFoundDescription,
      path: `/tour/${slug}`,
      locale,
      noIndex: true,
      hreflang: false,
    });
  }

  const indexable = isIndexable(tourTranslationStatus(tour.id, locale), locale);
  const seoDefault = locale === "vi" ? TOUR_SEO[tour.slug] : undefined;

  return buildMetadata({
    title: tour.seo?.title ?? seoDefault?.title ?? tour.title,
    description:
      tour.seo?.description ?? seoDefault?.description ?? tour.summary,
    path: `/tour/${tour.slug}`,
    locale,
    keywords: tour.tags,
    image: tour.seo?.ogImage ?? tour.images[0]?.src,
    noIndex: !indexable,
    hreflang: indexable,
    enIndexable: isIndexable(tourTranslationStatus(tour.id, "en"), "en"),
  });
}

export function TourDetailContent({
  tour,
  locale,
  preview = false,
}: {
  tour: Tour;
  locale: Locale;
  /** Draft preview: skip JSON-LD, leave the consult form inert, no indexable flags. */
  preview?: boolean;
}) {
  const m = getMessages(locale);
  const destinations = getDestinationsByIds(tour.destinationIds, locale);
  const related = getRelatedTours(tour.slug, 3, locale).map((item) =>
    toTourCard(item, locale),
  );
  const crumbs = crumbsFor(tour, locale);
  const primaryCategory = getCategoryById(tour.categoryIds[0], locale);
  const cover = tour.images[0]?.src ?? "/opengraph-image.png";
  const fullyTranslated = isResolvedTranslationComplete("tours", tour);

  const sections = [
    { id: "tong-quan", label: m.tour.sections.overview },
    ...(hasPublishedPrice(tour.priceFrom) && tour.pricingOptions.length > 0
      ? [{ id: "bang-gia", label: m.tour.packages.title }]
      : []),
    ...(tour.highlights.length > 0
      ? [{ id: "diem-noi-bat", label: m.tour.sections.highlights }]
      : []),
    { id: "lich-trinh", label: m.tour.sections.itinerary },
    ...(tour.included.length > 0 || tour.excluded.length > 0
      ? [{ id: "dich-vu", label: m.tour.sections.services }]
      : []),
    ...(tour.notes.length > 0 || tour.policies.length > 0
      ? [{ id: "luu-y", label: m.tour.sections.notes }]
      : []),
    { id: "tu-van", label: m.tour.sections.consult },
  ];

  return (
    <>
      {preview ? null : (
        <>
          <JsonLd
            id="ld-trip"
            data={touristTripJsonLd({
              title: tour.title,
              summary: tour.summary,
              url: absoluteUrl(localizePath(locale, `/tour/${tour.slug}`)),
              destinations,
              itinerary: tour.itinerary.map((day) => ({
                title: day.title,
                summary: day.summary,
              })),
              price: tour.priceFrom,
              image: cover,
              locale,
            })}
          />
          <JsonLd
            id="ld-breadcrumb"
            data={breadcrumbJsonLd(
              crumbs.map((crumb) => ({
                label: crumb.label,
                path: crumb.href ?? localizePath(locale, `/tour/${tour.slug}`),
              })),
            )}
          />
        </>
      )}

      {preview || fullyTranslated ? null : (
        <TranslationNotice
          locale={locale}
          viHref={localizePath("vi", `/tour/${tour.slug}`)}
        />
      )}

      <header className="tour-detail-hero">
        <Breadcrumbs items={crumbs} ariaLabel={m.common.breadcrumbAria} />

        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            {/* --- Main column ------------------------------------------------ */}
            <div className="lg:col-span-7">
              <div className="flex flex-col gap-6">
                {primaryCategory || tour.tourCode ? (
                  <div className="flex flex-wrap items-center gap-2.5">
                    {primaryCategory ? (
                      <Link
                        href={localizePath(locale, primaryCategory.path)}
                        className="eyebrow-pill group/cat gap-2 transition-colors hover:text-primary-strong-hover"
                      >
                        {primaryCategory.name}
                        <ArrowRightIcon className="h-3 w-3 transition-transform duration-200 group-hover/cat:translate-x-0.5" />
                      </Link>
                    ) : null}
                    {tour.tourCode ? (
                      <span className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 text-[0.6875rem] font-bold tracking-[0.14em] text-foreground-subtle">
                        {tour.tourCode}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <h1 className="text-display font-display font-semibold text-foreground">
                  {tour.title}
                </h1>

                <p className="text-[1.0625rem] leading-relaxed text-foreground-muted">
                  {tour.summary}
                </p>

                {destinations.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {destinations.map((destination) => (
                      <li
                        key={destination.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground-muted"
                      >
                        <MapPinIcon className="h-3.5 w-3.5 text-primary-strong" />
                        {destination.name}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-8">
                <TourGallery
                  images={tour.images}
                  title={tour.title}
                  labels={{
                    aria: m.tour.galleryAria,
                    listAria: m.tour.galleryListAria,
                    imageSr: m.tour.galleryImageLabel,
                    alt: m.tour.galleryAlt,
                    placeholderAlt: m.tour.galleryPlaceholderAlt,
                    prev: m.tour.galleryPrev,
                    next: m.tour.galleryNext,
                    counter: m.tour.galleryCounter,
                  }}
                />
              </div>

              <div className="mt-6 lg:hidden">
                <TourKeyFacts tour={tour} locale={locale} />
              </div>
            </div>

            {/* --- Sticky panel ---------------------------------------------- */}
            <aside className="lg:col-span-5">
              <div className="lg:sticky lg:top-28 flex flex-col gap-5">
                <div className="hidden rounded-2xl border border-border bg-surface-muted p-5 shadow-soft lg:block">
                  <dl className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-sm text-foreground-muted">
                        <ClockIcon className="h-4 w-4 text-primary-strong" />
                        {m.common.duration}
                      </dt>
                      <dd className="text-sm font-bold text-foreground">
                        {formatDuration(tour.duration, locale)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-sm text-foreground-muted">
                        <UsersIcon className="h-4 w-4 text-primary-strong" />
                        {m.common.departure}
                      </dt>
                      <dd className="text-sm font-bold text-foreground">
                        {tour.departurePoints.join(", ") ||
                          m.common.contactForPricing}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-sm text-foreground-muted">
                        <MapPinIcon className="h-4 w-4 text-primary-strong" />
                        {m.common.destinationsCount}
                      </dt>
                      <dd className="text-sm font-bold text-foreground">
                        {destinations.length}
                      </dd>
                    </div>
                  </dl>
                </div>

                <TourPriceBlock tour={tour} locale={locale} />
                {tour.returnPoints.length > 0 || tour.transport.length > 0 ? (
                  <dl className="grid gap-4 rounded-2xl border border-border bg-surface p-5 text-sm shadow-soft">
                    {tour.returnPoints.length > 0 ? (
                      <div>
                        <dt className="text-xs text-foreground-subtle">
                          {m.tour.packages.returnPoint}
                        </dt>
                        <dd className="mt-1 font-semibold">
                          {tour.returnPoints.join(", ")}
                        </dd>
                      </div>
                    ) : null}
                    {tour.transport.length > 0 ? (
                      <div>
                        <dt className="text-xs text-foreground-subtle">
                          {m.tour.packages.transport}
                        </dt>
                        <dd className="mt-1 leading-relaxed">
                          {tour.transport.join(" · ")}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}

                <div className="tour-aside-cta hidden rounded-2xl border border-border p-5 shadow-soft lg:block">
                  <p className="text-sm font-semibold text-foreground">
                    {m.tour.asideWant}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground-muted">
                    {m.tour.asideDescription}
                  </p>
                  <ButtonLink href="#tu-van" size="lg" className="mt-4 w-full">
                    {m.tour.asideCta}
                  </ButtonLink>
                  <p className="mt-3 text-center text-xs text-foreground-subtle">
                    {m.common.notAvailableBooking}
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {/* --- In-page anchors --------------------------------------------- */}
          <nav
            aria-label={m.common.pageNavAria}
            className="mt-10 border-y border-border sm:mt-12"
          >
            <ul className="no-scrollbar flex flex-wrap gap-1 py-2 sm:-mx-7 sm:flex-nowrap sm:overflow-x-auto sm:px-7 lg:mx-0 lg:px-0">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-semibold text-foreground-muted transition-colors hover:bg-primary-soft hover:text-primary-strong"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </header>

      <div className="pb-24 lg:pb-0">
        {hasPublishedPrice(tour.priceFrom) && tour.pricingOptions.length > 0 ? (
          <Section tone="muted" spacing="default">
            <Container>
              <TourPackages tour={tour} locale={locale} />
            </Container>
          </Section>
        ) : null}

        {/* --- Overview ---------------------------------------------------- */}
        <Section id="tong-quan" tone="default" spacing="default">
          <Container>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <SectionHeading
                  eyebrow={m.tour.overviewEyebrow}
                  title={m.tour.overviewTitle}
                  as="h2"
                />
                <div className="mt-6 flex flex-col gap-4">
                  {tour.overview.length > 0 ? (
                    tour.overview.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-[1.0625rem] leading-relaxed text-foreground-muted"
                      >
                        {paragraph}
                      </p>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-border-strong bg-surface px-5 py-6 text-sm text-foreground-muted">
                      {m.tour.overviewEmpty}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Container>
        </Section>

        {/* --- Highlights -------------------------------------------------- */}
        {tour.highlights.length > 0 ? (
          <Section id="diem-noi-bat" tone="muted" spacing="default">
            <Container>
              <Reveal>
                <TourHighlights tour={tour} locale={locale} />
              </Reveal>
            </Container>
          </Section>
        ) : null}

        {/* --- Itinerary --------------------------------------------------- */}
        <Section id="lich-trinh" tone="default" spacing="default">
          <Container>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <SectionHeading
                  eyebrow={m.tour.itineraryEyebrow}
                  title={m.tour.itineraryTitle}
                  as="h2"
                />
                <p className="mt-4 text-sm leading-relaxed text-foreground-muted">
                  {m.tour.itineraryNote}
                </p>
              </div>
              <div className="lg:col-span-9">
                <ItineraryTimeline days={tour.itinerary} locale={locale} />
              </div>
            </div>
          </Container>
        </Section>

        {/* --- Services ---------------------------------------------------- */}
        {tour.included.length > 0 || tour.excluded.length > 0 ? (
          <Section id="dich-vu" tone="muted" spacing="default">
            <Container>
              <SectionHeading
                eyebrow={m.tour.servicesEyebrow}
                title={m.tour.servicesTitle}
                as="h2"
              />
              <div className="mt-8">
                <TourServices tour={tour} locale={locale} />
              </div>
            </Container>
          </Section>
        ) : null}

        {/* --- Notes + policies -------------------------------------------- */}
        {tour.notes.length > 0 || tour.policies.length > 0 ? (
          <Section id="luu-y" tone="default" spacing="default">
            <Container>
              {tour.policies.length > 0 && tour.notes.length > 0 ? (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
                  <TourNotes tour={tour} locale={locale} />
                  <TourPolicies tour={tour} locale={locale} />
                </div>
              ) : (
                <div className="max-w-3xl">
                  <TourNotes tour={tour} locale={locale} />
                  <TourPolicies tour={tour} locale={locale} />
                </div>
              )}
            </Container>
          </Section>
        ) : null}

        {/* --- Related ----------------------------------------------------- */}
        {related.length > 0 ? (
          <Section tone="muted" spacing="default">
            <Container>
              <SectionHeading
                eyebrow={m.tour.relatedEyebrow}
                title={m.tour.relatedTitle}
                description={m.tour.relatedDescription}
                as="h2"
              />
              <div className="mt-8">
                <TourGrid tours={related} />
              </div>
            </Container>
          </Section>
        ) : null}
      </div>

      {preview ? (
        <Section id="tu-van" tone="default" spacing="loose">
          <Container>
            <div className="rounded-3xl border border-dashed border-border-strong bg-surface px-6 py-10 text-center">
              <p className="text-sm font-bold uppercase tracking-wider text-primary-strong">
                Bản xem trước
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-foreground-muted">
                Biểu mẫu tư vấn không hoạt động trong bản xem trước để tránh
                tạo yêu cầu thật. Khối tư vấn trên trang công khai sẽ dùng
                tiêu đề tour và giá hiện tại.
              </p>
            </div>
          </Container>
        </Section>
      ) : (
        <ConsultSection
          locale={locale}
          id="tu-van"
          tourSlug={tour.slug}
          defaultInterest={tour.title}
          tone="default"
          spacing="loose"
          title={m.tour.consultTitle}
          description={format(m.tour.consultDescription, {
            title: tour.title,
            price: formatPriceFrom(tour.priceFrom, locale),
          })}
        />
      )}

      {preview ? null : (
        <MobileConsultBar
          tourTitle={tour.title}
          priceLabel={formatPriceFrom(tour.priceFrom, locale)}
          labels={{
            consult: m.common.requestConsultation,
            callHotlineAria: m.common.callHotlineAria,
          }}
        />
      )}
    </>
  );
}

/** Public page: resolves the published tour and renders it. */
export function TourDetailView({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  const tour = getTourBySlug(slug, locale);
  if (!tour) notFound();
  return <TourDetailContent tour={tour} locale={locale} />;
}
