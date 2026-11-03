import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { localizePath } from "@/i18n/routing";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { format, getMessages } from "@/i18n/server";
import { hotelSettings } from "@/server/cms/store";
import { publicHotelDetail } from "@/server/hotels/public";
import { HotelGallery } from "@/features/hotels/hotel-gallery";
import { HotelBookingPanel } from "@/features/hotels/hotel-booking-panel";
import { HotelMobileBar } from "@/features/hotels/hotel-mobile-bar";
import { HotelDepth } from "@/features/hotels/hotel-motion";
import { formatVnd } from "@/features/hotels/hotel-format";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MaskedHeading } from "@/components/motion/word-reveal";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/layout";
import { TiltCard } from "@/components/motion/tilt-card";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, hotelJsonLd } from "@/lib/json-ld";
import "@/features/hotels/hotels.css";

/**
 * Hotel detail (`/khach-san/[slug]`).
 *
 * Only published hotels and rooms are read. The booking panel is a client
 * island; everything else is server-rendered, so prices and availability shown
 * before hydration already come from the server projection.
 *
 * The hero is the same `PageHero` the guides, contact and tour-category pages
 * use, so the eyebrow, masked headline, meta strip and floating card read as
 * one site. `HotelDepth` adds the scroll depth below it in every browser.
 */

export const dynamic = "force-dynamic";

type PageParams = { locale: string; slug: string };
type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

function localeOf(params: PageParams): Locale {
  return isLocale(params.locale) ? params.locale : defaultLocale;
}

function selectionOf(raw: string, roomIds: string[]): Record<string, number> {
  const selection: Record<string, number> = {};
  if (!raw) return selection;
  for (const entry of raw.split(",")) {
    const [roomId, count] = entry.split(":");
    if (!roomIds.includes(roomId)) continue;
    const quantity = Number(count);
    if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 5)
      selection[roomId] = quantity;
  }
  return selection;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = localeOf(await params);
  if (!hotelSettings().enabled) return { title: "404", robots: { index: false } };
  const detail = publicHotelDetail(slug, locale);
  const m = getMessages(locale);
  if (!detail)
    return { title: m.notFound.title, robots: { index: false, follow: false } };
  return buildMetadata({
    title: detail.name,
    description: detail.summary,
    path: `/khach-san/${detail.slug}`,
    locale,
    image: detail.image?.src,
    noIndex: locale === "en" && !detail.hreflangReady,
    hreflang: detail.hreflangReady || locale === "vi",
    enIndexable: detail.hreflangReady,
  });
}

export default async function HotelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  if (!hotelSettings().enabled) notFound();

  const { slug } = await params;
  const locale = localeOf(await params);
  const query = await searchParams;
  const m = getMessages(locale);
  const t = m.hotels.detail;

  const checkInRaw = first(query.checkIn);
  const checkOutRaw = first(query.checkOut);
  const checkIn = /^\d{4}-\d{2}-\d{2}$/.test(checkInRaw) ? checkInRaw : null;
  const checkOut = /^\d{4}-\d{2}-\d{2}$/.test(checkOutRaw) ? checkOutRaw : null;
  const tourSlug = first(query.tour) || null;

  const detail = publicHotelDetail(slug, locale, {
    checkIn,
    checkOut,
    tourSlug,
  });
  if (!detail) notFound();

  const selection = selectionOf(
    first(query.rooms),
    detail.rooms.map((room) => room.id),
  );
  const path = `/khach-san/${detail.slug}`;
  const pageUrl = absoluteUrl(localizePath(locale, path));
  const heroImage = detail.images[0] ?? detail.image;
  const priceLabel =
    detail.priceFrom !== null
      ? formatVnd(detail.priceFrom, locale)
      : m.hotels.card.contactForQuote;
  // The hero already prints the summary; repeating it as the first paragraph
  // makes the overview look like a copy-paste.
  const overview = detail.description.filter(
    (paragraph, index) =>
      !(index === 0 && paragraph.trim() === detail.summary.trim()),
  );

  const availabilityLabel = (room: (typeof detail.rooms)[number]) => {    const result = room.availability;
    if (result.kind === "on_request") return t.trustNote;
    if (result.kind === "unknown") return m.hotels.availability.unknown;
    if (result.kind === "closed") return m.hotels.availability.closed;
    return format(m.hotels.availability.available, { count: result.rooms });
  };

  return (
    <main className="stt-hotel-page stt-hotel-detail">
      <JsonLd
        data={hotelJsonLd({
          name: detail.name,
          description: detail.summary,
          url: pageUrl,
          image: detail.image?.src ?? "/opengraph-image.png",
          address: {
            street: detail.address,
            locality: detail.province,
            region: detail.province,
          },
          amenities: detail.amenities,
          checkInTime: detail.checkInTime,
          checkOutTime: detail.checkOutTime,
          priceFrom: detail.priceFrom,
          locale,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { label: m.common.home, path: "/" },
          { label: m.hotels.list.title, path: "/khach-san" },
          { label: detail.name, path },
        ])}
      />

      <header className="stt-hotel-hero-lux">
        <Breadcrumbs
          items={[
            { label: m.common.home, href: localizePath(locale, "/") },
            {
              label: m.hotels.list.title,
              href: localizePath(locale, "/khach-san"),
            },
            { label: detail.name, href: localizePath(locale, path) },
          ]}
          ariaLabel={m.common.breadcrumbAria}
        />

        <div className="stt-hotel-hero-lux-top">
          <div className="stt-hotel-hero-lux-copy">
            <p className="eyebrow-pill">
              {detail.lodgingTypeLabel} · {detail.province}
            </p>
            <MaskedHeading
              as="h1"
              lines={[{ text: detail.name }]}
              className="stt-hotel-hero-lux-title"
            />
            <p className="stt-hotel-hero-lux-lead">{detail.summary}</p>
            <div className="stt-hotel-hero-lux-actions">
              <ButtonLink href="#hang-phong">{t.roomsCta}</ButtonLink>
              {detail.mapUrl ? (
                <ButtonLink href={detail.mapUrl} variant="secondary" external>
                  {t.viewMap}
                </ButtonLink>
              ) : null}
            </div>
          </div>

          <dl className="stt-hotel-hero-lux-meta">
            {detail.checkInTime ? (
              <div>
                <dt>{t.checkIn}</dt>
                <dd>{detail.checkInTime}</dd>
              </div>
            ) : null}
            {detail.checkOutTime ? (
              <div>
                <dt>{t.checkOut}</dt>
                <dd>{detail.checkOutTime}</dd>
              </div>
            ) : null}
            {detail.starRating ? (
              <div>
                <dt>{t.starLabel}</dt>
                <dd>
                  <span aria-label={`${detail.starRating}/5`}>
                    {"★".repeat(detail.starRating)}
                  </span>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>{t.priceFromLabel}</dt>
              <dd>{priceLabel}</dd>
            </div>
          </dl>
        </div>

        <div className="stt-hotel-hero-lux-media">
          {heroImage?.src ? (
            <Image
              src={heroImage.src}
              alt={heroImage.alt ?? detail.name}
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="stt-hotel-hero-lux-img"
            />
          ) : null}
          <div className="stt-hotel-hero-lux-price">
            <p className="stt-hotel-float-eyebrow">{t.priceFromLabel}</p>
            <p className="stt-hotel-float-price">{priceLabel}</p>
            <p className="stt-hotel-float-note">{t.trustNote}</p>
          </div>
          <p className="stt-hotel-hero-lux-cue">
            <span aria-hidden="true" />
            {t.scrollCue}
          </p>
        </div>
      </header>

      <HotelGallery
        images={detail.images}
        hotelName={detail.name}
        labels={{
          open: t.galleryOpen,
          close: t.galleryClose,
          counter: t.galleryCounter,
          all: format(t.galleryAll, { count: detail.images.length }),
        }}
      />

      <div className="stt-hotel-layout">
        <div className="stt-hotel-content">
          {detail.description.length > 0 || detail.highlights.length > 0 ? (
            <section className="stt-hotel-block" aria-label={t.overview}>
              <Reveal>
                <SectionHeading title={t.overview} />
                <div className="stt-hotel-overview">
                  <div className="stt-hotel-prose">
                    {overview.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {detail.highlights.length > 0 ? (
                    <ul className="stt-hotel-highlights">
                      {detail.highlights.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </Reveal>
            </section>
          ) : null}

          {detail.amenities.length > 0 ? (
            <section className="stt-hotel-block" aria-label={t.amenities}>
              <Reveal>
                <SectionHeading title={t.amenities} />
                <ul className="stt-hotel-tags stt-hotel-tags--lg">
                  {detail.amenities.map((amenity) => (
                    <li key={amenity}>{amenity}</li>
                  ))}
                </ul>
              </Reveal>
            </section>
          ) : null}

          <section
            id="hang-phong"
            className="stt-hotel-block"
            aria-label={t.rooms}
          >
            <Reveal>
              <SectionHeading title={t.rooms} description={t.roomPickerHint} />
              {detail.rooms.length === 0 ? (
                <p className="stt-hotel-muted">{t.noRooms}</p>
              ) : null}
              <div className="stt-hotel-roomlist">
                {detail.rooms.map((room, index) => {
                  const image = room.images[0] ?? heroImage;
                  return (
                  <div
                    key={room.id}
                    data-hotel-depth={((index % 3) + 1) as 1 | 2 | 3}
                  >
                    <TiltCard max={2.5}>
                      <article className="stt-hotel-room">
                        {image?.src ? (
                          <div className="stt-hotel-room-media">
                            <Image
                              src={image.src}
                              alt={image.alt ?? detail.name}
                              width={720}
                              height={480}
                              sizes="(max-width: 768px) 100vw, 340px"
                            />
                          </div>
                        ) : null}
                        <div className="stt-hotel-room-body">
                          <h3>{room.name}</h3>
                          <p className="stt-hotel-room-meta">
                            {room.sizeSqm
                              ? format(t.size, { size: room.sizeSqm })
                              : null}
                            {room.bed ? ` · ${t.bed}: ${room.bed}` : null}
                            {room.view ? ` · ${t.view}: ${room.view}` : null}
                            {` · ${format(t.capacity, {
                              count: room.maxOccupancy,
                            })}`}
                          </p>
                          {room.description ? <p>{room.description}</p> : null}
                          {room.amenities.length > 0 ? (
                            <ul className="stt-hotel-tags">
                              {room.amenities.slice(0, 6).map((amenity) => (
                                <li key={amenity}>{amenity}</li>
                              ))}
                            </ul>
                          ) : null}
                          <div className="stt-hotel-room-foot">
                            <div className="stt-hotel-room-rate">
                              <p className="stt-hotel-room-price">
                                {room.priceFrom !== null
                                  ? format(t.priceFrom, {
                                      price: formatVnd(room.priceFrom, locale),
                                    })
                                  : m.hotels.card.contactForQuote}
                              </p>
                              <p className="stt-hotel-room-state">
                                {availabilityLabel(room)}
                              </p>
                            </div>
                            <a href="#dat-phong" className="stt-hotel-room-cta">
                              {t.roomCta}
                              <span aria-hidden="true">→</span>
                            </a>
                          </div>
                        </div>
                      </article>
                    </TiltCard>
                  </div>
                  );
                })}
              </div>
            </Reveal>
          </section>

          <section className="stt-hotel-block" aria-label={t.location}>
            <Reveal>
              <SectionHeading title={t.location} />
              <div className="stt-hotel-location">
                <p className="stt-hotel-location-address">{detail.address}</p>
                {detail.mapUrl ? (
                  <a
                    className="stt-btn-secondary"
                    href={detail.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.viewMap}
                  </a>
                ) : null}
              </div>
            </Reveal>
          </section>

          {detail.policies.length > 0 ? (
            <section className="stt-hotel-block" aria-label={t.policies}>
              <Reveal>
                <SectionHeading title={t.policies} />
                <ul className="stt-hotel-policies">
                  {detail.policies.map((policy) => (
                    <li key={policy}>{policy}</li>
                  ))}
                </ul>
              </Reveal>
            </section>
          ) : null}

          {detail.tourLinks.length > 0 ? (
            <section className="stt-hotel-block" aria-label={t.relatedTours}>
              <Reveal>
                <SectionHeading title={t.relatedTours} />
                <ul className="stt-hotel-tourlinks">
                  {detail.tourLinks.map((link) => (
                    <li key={`${link.tourSlug}-${link.relation}`}>
                      <a
                        href={localizePath(locale, `/tour/${link.tourSlug}`)}
                        className="stt-hotel-tourlink"
                      >
                        <span>{link.tourTitle}</span>
                        <small>
                          {link.relation === "included"
                            ? t.tourIncluded
                            : link.relation === "upgrade"
                              ? t.tourUpgrade
                              : t.tourAdditional}
                        </small>
                        <span aria-hidden="true">→</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </section>
          ) : null}

          <p className="stt-hotel-fine">{t.trustNote}</p>
        </div>

        <div className="stt-hotel-panel-col" id="dat-phong">
          <HotelBookingPanel
          locale={locale}
          hotelId={detail.id}
          sourcePage={localizePath(locale, path)}
          initial={{
            checkIn: checkIn ?? "",
            checkOut: checkOut ?? "",
            tourSlug: tourSlug ?? "",
            selection,
          }}
          rooms={detail.rooms.map((room) => ({
            id: room.id,
            name: room.name,
            capacityAdults: room.capacityAdults,
            capacityChildren: room.capacityChildren,
            maxOccupancy: room.maxOccupancy,
            priceFrom: room.priceFrom,
            breakfastIncluded: room.breakfastIncluded,
            taxIncluded: room.taxIncluded,
            availability: room.availability,
          }))}
          tourOptions={detail.tourLinks.map((link) => ({
            slug: link.tourSlug,
            title: link.tourTitle,
            relation: link.relation,
          }))}
          labels={{
            title: m.hotels.form.title,
            description: m.hotels.form.description,
            dates: m.hotels.form.dates,
            datesFlexible: m.hotels.form.datesFlexible,
            checkIn: t.checkIn,
            checkOut: t.checkOut,
            adults: m.hotels.form.adults,
            children: m.hotels.form.children,
            childrenAges: m.hotels.form.childrenAges,
            childrenAgesHint: m.hotels.form.childrenAgesHint,
            rooms: m.hotels.form.rooms,
            roomQuantity: m.hotels.form.roomQuantity,
            tourOptional: m.hotels.form.tourOptional,
            noTour: m.hotels.form.noTour,
            tourHelp: m.hotels.form.tourHelp,
            submit: m.lead.submit,
            submitting: m.lead.submitting,
            noRoomsSelected: m.hotels.form.noRoomsSelected,
            quoteTitle: m.hotels.quote.title,
            quoteSubtotal: m.hotels.quote.subtotal,
            quoteNights: m.hotels.quote.nights,
            quoteNeeds: m.hotels.quote.needsQuote,
            quoteNeedsHint: m.hotels.quote.needsQuoteHint,
            quoteIncluded: m.hotels.quote.included,
            quoteUpgrade: m.hotels.quote.upgrade,
            quoteFees: m.hotels.quote.fees,
            quoteRefreshing: m.hotels.quote.refreshing,
            quoteError: m.hotels.quote.error,
            quoteNoDates: m.hotels.quote.noDates,
            quoteNotConfirmed: m.hotels.quote.notConfirmed,
            estimateTitle: m.hotels.estimate.title,
            estimateTotal: m.hotels.estimate.total,
            estimateTour: m.hotels.estimate.tour,
            estimateStay: m.hotels.estimate.stay,
            estimateNoTour: m.hotels.estimate.noTour,
            estimateRooms: m.hotels.estimate.rooms,
            estimateAdults: m.hotels.estimate.adults,
            estimateChildren: m.hotels.estimate.children,
            estimateNeeds: m.hotels.estimate.needs,
            estimateNeedsHint: m.hotels.estimate.needsHint,
            estimateShow: m.hotels.estimate.show,
            estimateHide: m.hotels.estimate.hide,
            estimateNote: m.hotels.estimate.note,
            successTitle: m.hotels.form.successTitle,
            successBody: m.hotels.form.successBody,
            fullName: m.lead.fields.fullName,
            phone: m.lead.fields.phone,
            email: m.lead.fields.email,
            message: m.lead.fields.message,
            consent: m.lead.consent.pre,
            consentHint: m.lead.consent.hint,
            privacyLabel: m.nav.privacy,
            privacyHref: localizePath(locale, "/chinh-sach-bao-mat"),
            optional: m.lead.optional,
            genericError: m.lead.genericError,
            networkError: m.lead.networkError,
            available: m.hotels.availability.available,
            unavailable: m.hotels.availability.closed,
            unknown: m.hotels.availability.unknown,
          }}
        />
        </div>
      </div>

      <HotelMobileBar
        priceLabel={priceLabel}
        hasPrice={detail.priceFrom !== null}
        label={t.roomsCta}
        hint={t.mobileHint}
      />

      <HotelDepth scope=".stt-hotel-detail" />
    </main>
  );
}
