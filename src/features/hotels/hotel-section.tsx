import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import { featuredHotelCards } from "@/server/hotels/public";
import { HotelCard } from "./hotel-card";

/**
 * Home page hotel section.
 *
 * Hidden entirely when the module is off, when the owner turned the home block
 * off, or when no hotel is published — never an empty shell with a broken CTA.
 */
export function HotelHomeSection({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const hotels = featuredHotelCards(locale);
  if (hotels.length === 0) return null;
  return (
    <section className="stt-hotel-home" aria-labelledby="home-hotels">
      <div className="stt-hotel-home-head">
        <div>
          <h2 id="home-hotels">{m.hotels.home.title}</h2>
          <p>{m.hotels.home.subtitle}</p>
        </div>
        <Link className="stt-btn-secondary" href={localizePath(locale, "/khach-san")}>
          {m.hotels.home.viewAll}
        </Link>
      </div>
      <div className="stt-hotel-grid-cards">
        {hotels.map((hotel) => (
          <HotelCard key={hotel.id} hotel={hotel} locale={locale} />
        ))}
      </div>
    </section>
  );
}
