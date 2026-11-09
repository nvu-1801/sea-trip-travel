import { HotelRoomDate } from "@/features/hotels/hotel-room-date";
import { Input } from "@/components/ui/form-controls";
import { MAX_NIGHTS_PER_STAY, stayDates } from "@/domain/hotel-pricing";
import type { Metadata } from "next";
import { HotelRoomRequest } from "@/features/hotels/hotel-room-request";
import { notFound } from "next/navigation";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { localizePath } from "@/i18n/routing";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { format, getMessages } from "@/i18n/server";
import { hotelSettings } from "@/server/cms/store";
import { publicHotelDetail } from "@/server/hotels/public";
import { HotelGallery } from "@/features/hotels/hotel-gallery";
import { HotelRequestPanel } from "@/features/hotels/hotel-request-panel";
import { HotelMobileBar } from "@/features/hotels/hotel-mobile-bar";
import { HotelDepth } from "@/features/hotels/hotel-motion";
import { formatVnd } from "@/features/hotels/hotel-format";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MaskedHeading } from "@/components/motion/word-reveal";
import { Reveal } from "@/components/ui/reveal";
import { Button, ButtonLink, buttonStyles } from "@/components/ui/button";
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
  const datesValid = Boolean(stayDates(checkInRaw, checkOutRaw));
  const invalidDates = Boolean(checkInRaw || checkOutRaw) && !datesValid;
  const checkIn = datesValid ? checkInRaw : null;
  const checkOut = datesValid ? checkOutRaw : null;
  const tourSlug = first(query.tour) || null;

  const detail = publicHotelDetail(slug, locale, {
    checkIn,
    checkOut,
    tourSlug,
  });
  if (!detail) notFound();

  const path = `/khach-san/${detail.slug}`;
  const pageUrl = absoluteUrl(localizePath(locale, path));
  const heroImage = detail.images[0] ?? detail.image;
  const galleryImages = detail.images.length ? detail.images : heroImage ? [heroImage] : [];
  const vi = locale === "vi";
  const guestCount = (value: string, min: number, max: number) => {
    const count = Number(value);
    return /^\d+$/.test(value) && count >= min && count <= max ? count : min;
  };
  const adults = guestCount(first(query.adults), 1, 20);
  const children = guestCount(first(query.children), 0, 10);
  const amenities = [...new Set(detail.rooms.flatMap((room) => room.amenities))];
  const requestedAmenities = Array.isArray(query.amenity) ? query.amenity : [query.amenity];
  const selectedAmenities = amenities.filter((amenity) => requestedAmenities.includes(amenity));
  const visibleRooms = detail.rooms.filter((room) =>
    adults <= room.capacityAdults &&
    children <= room.capacityChildren &&
    adults + children <= room.maxOccupancy &&
    selectedAmenities.every((amenity) => room.amenities.includes(amenity)),
  );
  const resetQuery = new URLSearchParams();
  if (tourSlug) resetQuery.set("tour", tourSlug);
  const resetHref = localizePath(locale, path) + (resetQuery.size ? `?${resetQuery}` : "") + "#hang-phong";
  const galleryLabels = {
    open: t.galleryOpen,
    close: t.galleryClose,
    all: format(t.galleryAll, { count: galleryImages.length }),
    previous: vi ? "Ảnh trước" : "Previous photo",
    next: vi ? "Ảnh sau" : "Next photo",
  };
  const priceLabel =
    detail.priceFrom !== null
      ? formatVnd(detail.priceFrom, locale)
      : m.hotels.card.contactForQuote;
  const overview = detail.description.filter(
    (paragraph, index) =>
      paragraph.trim() !== "" && !(index === 0 && paragraph.trim() === detail.summary.trim()),
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
            <p className="stt-hotel-hero-lux-lead">{detail.address}</p>
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

        <HotelGallery images={galleryImages} hotelName={detail.name} labels={galleryLabels} />
      </header>

      <div className="stt-hotel-layout">
        <div className="stt-hotel-content">
          {detail.summary || overview.length > 0 || detail.highlights.length > 0 ? (
            <section className="stt-hotel-block" aria-label={t.overview}>
              <Reveal>
                <SectionHeading title={t.overview} />
                <div className="stt-hotel-overview">
                  <div className="stt-hotel-prose">
                    {detail.summary ? <p>{detail.summary}</p> : null}
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

          <div className="stt-hotel-location-grid">
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
          </div>
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
              {detail.rooms.length ? (
                <form action={`${localizePath(locale, path)}#hang-phong`} className="stt-room-filters">
                  {tourSlug ? <input type="hidden" name="tour" value={tourSlug} /> : null}
                  <HotelRoomDate key={`in-${checkInRaw}`} name="checkIn" label={t.checkIn} initialValue={checkInRaw} labels={m.datePicker} invalid={invalidDates} />
                  <HotelRoomDate key={`out-${checkOutRaw}`} name="checkOut" label={t.checkOut} initialValue={checkOutRaw} labels={m.datePicker} invalid={invalidDates} />
                  <label className="stt-room-filter-field">{vi ? "Người lớn" : "Adults"}<Input type="number" name="adults" min={1} max={20} defaultValue={adults} required /></label>
                  <label className="stt-room-filter-field">{vi ? "Trẻ em" : "Children"}<Input type="number" name="children" min={0} max={10} defaultValue={children} required /></label>
                  {amenities.length ? (
                    <details open={selectedAmenities.length > 0}>
                      <summary>{vi ? "Lọc theo tiện nghi phòng" : "Filter by room amenities"}</summary>
                      <div className="stt-room-filter-options">
                        {amenities.map((amenity) => (
                          <label key={amenity}>
                            <input type="checkbox" name="amenity" value={amenity} defaultChecked={selectedAmenities.includes(amenity)} /> {amenity}
                          </label>
                        ))}
                      </div>
                    </details>
                  ) : null}
                  <div className="stt-room-filter-actions">
                    <Button type="submit">{vi ? "Tìm phòng" : "Find rooms"}</Button>
                    <a href={resetHref} className={buttonStyles("secondary")} data-focus-ring="">
                      {vi ? "Xóa bộ lọc" : "Clear filters"}
                    </a>
                  </div>
                </form>
              ) : null}
              {invalidDates ? (
                <p role="alert">{vi ? `Chọn ngày nhận và trả phòng cho kỳ nghỉ từ 1 đến ${MAX_NIGHTS_PER_STAY} đêm.` : `Choose check-in and check-out dates for a stay of 1 to ${MAX_NIGHTS_PER_STAY} nights.`}</p>
              ) : null}
              {detail.rooms.length > 0 && visibleRooms.length === 0 ? (
                <p>{vi ? "Không có hạng phòng phù hợp." : "No matching room types."}</p>
              ) : null}
              <div className="stt-hotel-roomlist">
                {visibleRooms.map((room, index) => {
                  const hasRoomPhotos = room.images.some((image) => image.src);
                  return (
                    <div
                      key={room.id}
                      data-hotel-depth={((index % 3) + 1) as 1 | 2 | 3}
                    >
                      <TiltCard max={2.5}>
                        <article className="stt-hotel-room">
                          <div className="stt-room-photo">
                            <HotelGallery
                              images={hasRoomPhotos ? room.images : heroImage ? [heroImage] : []}
                              hotelName={hasRoomPhotos ? room.name : detail.name}
                              labels={galleryLabels}
                              room
                            />
                            {!hasRoomPhotos && heroImage?.src ? (
                              <small>{vi ? "Ảnh khách sạn" : "Hotel photo"}</small>
                            ) : null}
                            <p>{format(t.capacity, { count: room.maxOccupancy })}</p>
                            {room.bed ? <p>{t.bed} · {room.bed}</p> : null}
                          </div>
                          <div className="stt-hotel-room-body">
                            <h3>{room.name}</h3>
                            <p className="stt-hotel-room-meta">
                              {room.sizeSqm
                                ? format(t.size, { size: room.sizeSqm })
                                : null}
                              {room.view ? ` · ${t.view}: ${room.view}` : null}
                            </p>
                            {room.description ? <p>{room.description}</p> : null}
                            {room.amenities.length > 0 ? (
                              <ul className="stt-hotel-tags">
                                {room.amenities.slice(0, 6).map((amenity) => (
                                  <li key={amenity}>{amenity}</li>
                                ))}
                              </ul>
                            ) : null}
                            {room.amenities.length > 6 ? (
                              <details>
                                <summary>{vi ? "Xem thêm tiện nghi" : "More amenities"}</summary>
                                <ul className="stt-hotel-tags">
                                  {room.amenities.slice(6).map((amenity) => <li key={amenity}>{amenity}</li>)}
                                </ul>
                              </details>
                            ) : null}
                          </div>
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
                            <HotelRoomRequest
                              href={`${localizePath(locale, "/lien-he")}#tu-van`}
                              label={t.roomCta}
                              draft={{
                                id: detail.id,
                                slug: detail.slug,
                                name: detail.name,
                                priceFrom: detail.priceFrom,
                                roomId: room.id,
                                roomName: room.name,
                              }}
                            />
                          </div>
                        </article>
                      </TiltCard>
                    </div>
                  );
                })}
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
          <HotelRequestPanel
            locale={locale}
            hotel={{
              id: detail.id,
              slug: detail.slug,
              name: detail.name,
              priceFrom: detail.priceFrom,
            }}
            rooms={detail.rooms.map((room) => ({
              id: room.id,
              name: room.name,
              priceFrom: room.priceFrom,
              image: room.images[0]?.src ?? heroImage?.src,
            }))}
            contactHref={`${localizePath(locale, "/lien-he")}#tu-van`}
            toursHref={localizePath(locale, "/tim-tour")}
            labels={{
              title: m.hotels.request.title,
              description: m.hotels.request.description,
              roomsLabel: m.hotels.request.roomsLabel,
              pick: m.hotels.request.pick,
              submit: m.hotels.request.submit,
              fallback: m.hotels.request.fallback,
              note: m.hotels.request.note,
              noRooms: m.hotels.request.noRooms,
              assignedTitle: m.hotels.request.assignedTitle,
              assignedBody: m.hotels.request.assignedBody,
              assignedNote: m.hotels.request.assignedNote,
              continueTours: m.hotels.request.continueTours,
              goToForm: m.hotels.request.goToForm,
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
