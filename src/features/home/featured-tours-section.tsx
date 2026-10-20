import { ROUTES } from "@/config/navigation";
import { getFeaturedTours } from "@/lib/data/tours";
import { Container, Section } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { TourGrid } from "@/features/tours/tour-grid";
import { TourCard } from "@/features/tours/tour-card";
import { toTourCard } from "@/features/tours/tour-card-model";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";

/**
 * Featured tours. Prefers the Quy Nhơn – Phú Yên line-up (the site's focus) and
 * tops up from other regions so the section is never thin.
 */
export function FeaturedToursSection({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const tours = getFeaturedTours(6, locale).map((tour) =>
    toTourCard(tour, locale),
  );

  return (
    <Section tone="muted" spacing="loose" className="journal-featured">
      <Container>
        <Reveal className="intro-centered">
          <p className="eyebrow-pill">
            <span aria-hidden="true" />
            {m.home.featured.eyebrow}
          </p>
          <h2>{m.home.featured.title}</h2>
          <p>{m.home.featured.description}</p>
          <div className="intro-cta">
            <ButtonLink
              href={localizePath(locale, ROUTES.quyNhonPhuYen)}
              variant="secondary"
              className="group"
            >
              {m.home.featured.cta}
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </ButtonLink>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6">
          {tours[0] ? (
            <Reveal>
              <TourCard tour={tours[0]} priority layout="horizontal" />
            </Reveal>
          ) : null}
          {tours.length > 1 ? (
            <TourGrid tours={tours.slice(1)} priorityCount={2} />
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
