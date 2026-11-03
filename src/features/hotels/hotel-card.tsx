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
 *
 * `index` only feeds the scroll depth level, so a row of cards travels at three
 * different speeds instead of moving as one slab. The price disclaimer is not
 * repeated here — the grid prints it once, which keeps the card foot calm.
 */
export function HotelCard({
  hotel,
  locale,
  index = 0,
}: {
  hotel: PublicHotelCard;
  locale: Locale;
  index?: number;
}) {
  const m = getMessages(locale);
  const t = m.hotels.card;
  const href = localizePath(locale, `/khach-san/${hotel.slug}`);
  return (
    <article
      className="stt-hotel-card"
      data-hotel-depth={((index % 3) + 1) as 1 | 2 | 3}
    >
      <Link
        href={href}
        className="stt-hotel-card-media"
        tabIndex={-1}
        aria-hidden="true"
      >
        {hotel.image?.src ? (
          <Image
            src={hotel.image.src}
            alt={hotel.image.alt}
            width={640}
            height={420}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <span className="stt-hotel-card-placeholder">
            {hotel.lodgingTypeLabel}
          </span>
        )}
        <span className="stt-hotel-card-badge">{hotel.lodgingTypeLabel}</span>
      </Link>

      <div className="stt-hotel-card-body">
        <p className="stt-hotel-card-meta">
          <span>{hotel.province}</span>
          {hotel.starRating ? (
            <span aria-label={`${hotel.starRating}/5`}>
              {"★".repeat(hotel.starRating)}
            </span>
          ) : null}
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
          <div className="stt-hotel-card-rate">
            {hotel.priceFrom !== null ? (
              <p className="stt-hotel-card-price">
                <span className="stt-hotel-card-price-value">
                  {formatVnd(hotel.priceFrom, locale)}
                </span>
                <small>{t.perNight}</small>
              </p>
            ) : (
              <p className="stt-hotel-card-price stt-hotel-card-price--contact">
                {t.contactForQuote}
              </p>
            )}
            <p className="stt-hotel-card-rooms">
              {format(t.roomsCount, { count: hotel.roomsCount })}
              {hotel.priceIncludesBreakfast ? (
                <span className="stt-hotel-card-breakfast">
                  {" · "}
                  {t.breakfast}
                </span>
              ) : null}
            </p>
          </div>
          <Link href={href} className="stt-hotel-card-cta">
            {t.viewHotel}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
