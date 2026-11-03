import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { localizePath } from "@/i18n/routing";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getMessages, format } from "@/i18n/server";
import { hotelSettings } from "@/server/cms/store";
import { hotelListPage } from "@/server/hotels/public";
import {
  availableFacets,
  hotelQueryToSearch,
  isCanonicalHotelQuery,
  parseHotelQuery,
  type HotelQuery,
} from "@/lib/hotel-filters";
import { HotelCard } from "@/features/hotels/hotel-card";
import { HotelFilterForm } from "@/features/hotels/hotel-filters";
import { HotelDepth } from "@/features/hotels/hotel-motion";
import { MaskedHeading } from "@/components/motion/word-reveal";
import { Reveal } from "@/components/ui/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/json-ld";
import { absoluteUrl } from "@/lib/seo";
import "@/features/hotels/hotels.css";

/**
 * Public hotel catalogue (`/khach-san`, `/en/khach-san`).
 *
 * The module switch is checked server-side before anything renders, so a
 * disabled module returns the localized 404 rather than an empty page. Filters,
 * sort and pagination all live in the URL.
 */

export const dynamic = "force-dynamic";

type PageParams = { locale: string };
type SearchParams = Record<string, string | string[] | undefined>;

function localeOf(params: PageParams): Locale {
  return isLocale(params.locale) ? params.locale : defaultLocale;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const locale = localeOf(await params);
  const query = parseHotelQuery(await searchParams);
  const m = getMessages(locale);
  return buildMetadata({
    title: m.hotels.list.title,
    description: m.hotels.list.description,
    path: "/khach-san",
    locale,
    // Filter permutations are useful for humans, not search landing pages.
    noIndex: !isCanonicalHotelQuery(query),
    hreflang: isCanonicalHotelQuery(query),
  });
}

export default async function HotelListPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  if (!hotelSettings().enabled) notFound();

  const locale = localeOf(await params);
  const query = parseHotelQuery(await searchParams);
  const m = getMessages(locale);
  const t = m.hotels.list;

  let page: ReturnType<typeof hotelListPage> | null = null;
  let failed = false;
  try {
    page = hotelListPage(locale, query);
  } catch {
    failed = true;
  }

  if (failed)
    return (
      <main className="stt-hotel-page">
        <div className="stt-hotel-empty" role="alert">
          <h1>{t.errorTitle}</h1>
          <p>{t.errorBody}</p>
          <a className="stt-btn-secondary" href={localizePath(locale, "/khach-san")}>
            {t.retry}
          </a>
        </div>
      </main>
    );

  const result = page!;
  const facets = availableFacets(result.all);
  const pageHref = (next: Partial<HotelQuery>) =>
    `${localizePath(locale, "/khach-san")}${hotelQueryToSearch({ ...query, ...next })}`;

  return (
    <main className="stt-hotel-page">
      <JsonLd
        data={collectionPageJsonLd({
          name: t.title,
          description: t.description,
          url: absoluteUrl(localizePath(locale, "/khach-san")),
          tours: result.items.map((hotel) => ({
            title: hotel.name,
            url: absoluteUrl(localizePath(locale, `/khach-san/${hotel.slug}`)),
          })),
          locale,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { label: m.common.home, path: "/" },
          { label: t.title, path: "/khach-san" },
        ])}
      />

      <header className="stt-hotel-hero">
        <p className="eyebrow-pill">{t.eyebrow}</p>
        <MaskedHeading
          as="h1"
          lines={[{ text: t.title }]}
          className="stt-hotel-hero-title"
        />
        <p className="stt-hotel-lede">{t.description}</p>
      </header>

      <HotelFilterForm
        locale={locale}
        query={query}
        provinces={facets.provinces}
        amenities={facets.amenities}
      />

      <section className="stt-hotel-results" aria-live="polite">
        <p className="stt-hotel-count">
          {format(t.resultsCount, { count: result.total })}
        </p>

        {result.total === 0 ? (
          <div className="stt-hotel-empty">
            <h2>{t.emptyTitle}</h2>
            <p>{t.emptyBody}</p>
            <a className="stt-btn-secondary" href={localizePath(locale, "/khach-san")}>
              {t.clearFilters}
            </a>
          </div>
        ) : (
          <div className="stt-hotel-grid-cards">
            {result.items.map((hotel, index) => (
              <Reveal key={hotel.id} delay={index % 3}>
                <HotelCard hotel={hotel} locale={locale} index={index} />
              </Reveal>
            ))}
          </div>
        )}

        {result.pageCount > 1 ? (
          <nav className="stt-hotel-pagination" aria-label={t.pageOf}>
            {result.page > 1 ? (
              <Link className="stt-btn-secondary" href={pageHref({ page: result.page - 1 })}>
                ← {t.prev}
              </Link>
            ) : null}
            <span>
              {format(t.pageOf, {
                page: result.page,
                total: result.pageCount,
              })}
            </span>
            {result.page < result.pageCount ? (
              <Link className="stt-btn-secondary" href={pageHref({ page: result.page + 1 })}>
                {t.next} →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>

      <HotelDepth scope=".stt-hotel-page" />
    </main>
  );
}
