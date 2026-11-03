import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { localizePath } from "@/i18n/routing";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { format, getMessages } from "@/i18n/server";
import { hotelSettings } from "@/server/cms/store";
import { publicHotelDetail } from "@/server/hotels/public";
import { HotelGallery } from "@/features/hotels/hotel-gallery";
import { HotelBookingPanel } from "@/features/hotels/hotel-booking-panel";
import { formatVnd } from "@/features/hotels/hotel-format";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, hotelJsonLd } from "@/lib/json-ld";
import "@/features/hotels/hotels.css";

/**
 * Hotel detail (`/khach-san/[slug]`).
 *
 * Only published hotels and rooms are read. The booking panel is a client
 * island; everything else is server-rendered, so prices and availability shown
 * before hydration already come from the server projection.
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

  const availabilityLabel = (room: (typeof detail.rooms)[number]) => {
    const result = room.availability;
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

      <nav className="stt-hotel-breadcrumb" aria-label={m.common.breadcrumbAria}>
        <Link href={localizePath(locale, "/")}>{m.common.home}</Link>
        <span aria-hidden="true">/</span>
        <Link href={localizePath(locale, "/khach-san")}>
          {m.hotels.list.title}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{detail.name}</span>
      </nav>

      <header className="stt-hotel-detail-head">
        <div>
          <p className="stt-hotel-eyebrow">
            {detail.lodgingTypeLabel} · {detail.province}
          </p>
          <h1>{detail.name}</h1>
          {detail.starRating ? (
            <p className="stt-hotel-stars">
              <span aria-hidden="true">{"★".repeat(detail.starRating)}</span>{" "}
              {detail.starBasis ? (
                <small>({detail.starBasis})</small>
              ) : null}
            </p>
          ) : null}
          <p className="stt-hotel-address">{detail.address}</p>
          <div className="stt-hotel-headlinks">
            {detail.mapUrl ? (
              <a
                href={detail.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.viewMap}
              </a>
            ) : null}
            <a href="#hang-phong">{t.rooms}</a>
          </div>
        </div>
        <dl className="stt-hotel-times">
          {detail.checkInTime ? (
            <>
              <dt>{t.checkIn}</dt>
              <dd>{detail.checkInTime}</dd>
            </>
          ) : null}
          {detail.checkOutTime ? (
            <>
              <dt>{t.checkOut}</dt>
              <dd>{detail.checkOutTime}</dd>
            </>
          ) : null}
        </dl>
      </header>

      <HotelGallery
        images={detail.images}
        hotelName={detail.name}
        labels={{
          open: t.galleryOpen,
          close: t.galleryClose,
          counter: t.galleryCounter,
        }}
      />

      <div className="stt-hotel-layout">
        <div className="stt-hotel-content">
          {detail.description.length > 0 || detail.highlights.length > 0 ? (
            <section aria-labelledby="hotel-overview">
              <h2 id="hotel-overview">{t.overview}</h2>
              {detail.description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {detail.highlights.length > 0 ? (
                <ul className="stt-hotel-highlights">
                  {detail.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {detail.amenities.length > 0 ? (
            <section aria-labelledby="hotel-amenities">
              <h2 id="hotel-amenities">{t.amenities}</h2>
              <ul className="stt-hotel-tags">
                {detail.amenities.map((amenity) => (
                  <li key={amenity}>{amenity}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section id="hang-phong" aria-labelledby="hotel-rooms">
            <h2 id="hotel-rooms">{t.rooms}</h2>
            <p className="stt-hotel-muted">{t.roomPickerHint}</p>
            {detail.rooms.length === 0 ? (
              <p className="stt-hotel-muted">{t.noRooms}</p>
            ) : null}
            <div className="stt-hotel-roomlist">
              {detail.rooms.map((room) => (
                <article className="stt-hotel-room" key={room.id}>
                  {room.images[0]?.src ? (
                    <Image
                      src={room.images[0].src}
                      alt={room.images[0].alt}
                      width={420}
                      height={280}
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                  ) : null}
                  <div>
                    <h3>{room.name}</h3>
                    <p className="stt-hotel-room-meta">
                      {room.sizeSqm ? format(t.size, { size: room.sizeSqm }) : null}
                      {room.bed ? ` · ${t.bed}: ${room.bed}` : null}
                      {room.view ? ` · ${t.view}: ${room.view}` : null}
                      {` · ${format(t.capacity, { count: room.maxOccupancy })}`}
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
                      <p className="stt-hotel-room-price">
                        {room.priceFrom !== null
                          ? format(t.priceFrom, {
                              price: formatVnd(room.priceFrom, locale),
                            })
                          : m.hotels.card.contactForQuote}
                      </p>
                      <p className="stt-hotel-muted">{availabilityLabel(room)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {detail.policies.length > 0 ? (
            <section aria-labelledby="hotel-policies">
              <h2 id="hotel-policies">{t.policies}</h2>
              <ul className="stt-hotel-policies">
                {detail.policies.map((policy) => (
                  <li key={policy}>{policy}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {detail.tourLinks.length > 0 ? (
            <section aria-labelledby="hotel-tours">
              <h2 id="hotel-tours">{t.relatedTours}</h2>
              <ul className="stt-hotel-tourlinks">
                {detail.tourLinks.map((link) => (
                  <li key={`${link.tourSlug}-${link.relation}`}>
                    <Link href={localizePath(locale, `/tour/${link.tourSlug}`)}>
                      {link.tourTitle}
                    </Link>
                    <small>
                      {link.relation === "included"
                        ? t.tourIncluded
                        : link.relation === "upgrade"
                          ? t.tourUpgrade
                          : t.tourAdditional}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="stt-hotel-fine">{t.trustNote}</p>
        </div>

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
    </main>
  );
}
