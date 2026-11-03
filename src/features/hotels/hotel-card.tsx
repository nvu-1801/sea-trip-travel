import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { format, getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import type { PublicHotelCard } from "@/server/hotels/public";
import { formatVnd } from "./hotel-format";

/**
 * One catalogue card. Renders a reference price only when a valid, effective
 * rule exists; otherwise it invites a quote instead of printing 0 ₫.
 */
export function HotelCard({
  hotel,
  locale,
}: {
  hotel: PublicHotelCard;
  locale: Locale;
}) {
  const m = getMessages(locale);
  const t = m.hotels.card;
  const href = localizePath(locale, `/khach-san/${hotel.slug}`);
  return (
    <article className="stt-hotel-card">
      <Link href={href} className="stt-hotel-card-media" tabIndex={-1} aria-hidden="true">
        {hotel.image?.src ? (
          <Image
            src={hotel.image.src}
            alt={hotel.image.alt}
            width={640}
            height={400}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <span className="stt-hotel-card-placeholder">
            {hotel.lodgingTypeLabel}
          </span>
        )}
      </Link>
      <div className="stt-hotel-card-body">
        <p className="stt-hotel-card-meta">
          {hotel.province} · {hotel.lodgingTypeLabel}
          {hotel.starRating ? ` · ${"★".repeat(hotel.starRating)}` : ""}
        </p>
        <h3 className="stt-hotel-card-title">
          <Link href={href}>{hotel.name}</Link>
        </h3>
        <p className="stt-hotel-card-summary">{hotel.summary}</p>
        {hotel.amenities.length > 0 ? (
          <ul className="stt-hotel-card-amenities">
            {hotel.amenities.slice(0, 3).map((amenity) => (
              <li key={amenity}>{amenity}</li>
            ))}
          </ul>
        ) : null}
        <div className="stt-hotel-card-foot">
          {hotel.priceFrom !== null ? (
            <p className="stt-hotel-card-price">
              {format(t.fromPrice, {
                price: formatVnd(hotel.priceFrom, locale),
              })}
              {hotel.priceIncludesBreakfast ? (
                <small> · {t.breakfast}</small>
              ) : null}
            </p>
          ) : (
            <p className="stt-hotel-card-price stt-hotel-card-price--contact">
              {t.contactForQuote}
            </p>
          )}
          <p className="stt-hotel-card-rooms">
            {format(t.roomsCount, { count: hotel.roomsCount })}
          </p>
          <Link href={href} className="stt-btn-secondary stt-hotel-card-cta">
            {t.viewHotel}
          </Link>
        </div>
        <p className="stt-hotel-card-note">{t.priceNote}</p>
      </div>
    </article>
  );
}
