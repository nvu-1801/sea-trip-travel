import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import { featuredHotelCards } from "@/server/hotels/public";
import { HeadingAccent } from "@/components/ui/heading-accent";
import { SectionEyebrow } from "@/components/ui/section-eyebrow";
import { Reveal, RevealGroup } from "@/components/ui/reveal";
import { ArrowRightIcon } from "@/components/ui/icons";
import { HotelCard } from "./hotel-card";
import { HotelDepth } from "./hotel-motion";
import "./hotels.css";

/**
 * Home page hotel section.
 *
 * Hidden entirely when the module is off, when the owner turned the home block
 * off, or when no hotel is published — never an empty shell with a broken CTA.
 *
 * The header reuses `intro-centered`, the same two-column editorial header the
 * featured-tours and guides sections use, so the eyebrow, headline accent, lead
 * and text link keep one rhythm down the page.
 */
export function HotelHomeSection({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const hotels = featuredHotelCards(locale);
  if (hotels.length === 0) return null;
  return (
    <section className="stt-hotel-home" aria-labelledby="home-hotels">
      <RevealGroup className="intro-centered">
        <SectionEyebrow className="eyebrow-pill">
          {m.hotels.list.eyebrow}
        </SectionEyebrow>
        <h2 id="home-hotels">
          <HeadingAccent
            text={m.hotels.home.title}
            phrase={m.hotels.home.titleAccent}
          />
        </h2>
        <p>{m.hotels.home.subtitle}</p>
        <div className="intro-cta">
          <Link href={localizePath(locale, "/khach-san")} className="group">
            {m.hotels.home.viewAll}
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </RevealGroup>

      <div className="stt-hotel-grid-cards">
        {hotels.map((hotel, index) => (
          <Reveal key={hotel.id} delay={index % 3}>
            <HotelCard hotel={hotel} locale={locale} index={index} />
          </Reveal>
        ))}
      </div>
      <p className="stt-hotel-grid-note">{m.hotels.card.priceNote}</p>
      <HotelDepth scope=".stt-hotel-home" />
    </section>
  );
}
