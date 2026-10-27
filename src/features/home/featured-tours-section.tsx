import { ROUTES } from "@/config/navigation";
import { HeadingAccent } from "@/components/ui/heading-accent";
import { featuredCopy, getFeaturedHome } from "@/lib/data/featured";
import { Container, Section } from "@/components/ui/layout";
import { SectionEyebrow } from "@/components/ui/section-eyebrow";
import { Reveal, RevealGroup } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { TourGrid } from "@/features/tours/tour-grid";
import { TourCard } from "@/features/tours/tour-card";
import { toTourCard } from "@/features/tours/tour-card-model";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";

/**
 * Featured tours. The Studio chooses the route/region and either pins an
 * ordered list or lets the route pick the line-up; this section only renders
 * that decision. With no configuration it keeps the original Quy Nhơn – Phú Yên
 * focus line-up.
 */
export function FeaturedToursSection({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const section = getFeaturedHome(locale);
  const copy = featuredCopy(section, locale, m.home.featured);
  const categoryName = section.category?.name ?? "";
  const ctaHref = section.category?.path ?? ROUTES.quyNhonPhuYen;
  const tours = section.tours.map((tour) => toTourCard(tour, locale));

  return (
    <Section tone="muted" spacing="loose" className="journal-featured">
      <Container>
        <RevealGroup className="intro-centered">
          <SectionEyebrow className="eyebrow-pill">
            {copy.eyebrow}
          </SectionEyebrow>
          <h2>
            <HeadingAccent text={copy.title} phrase={categoryName} />
          </h2>
          <p>{copy.description}</p>
          <div className="intro-cta">
            <ButtonLink
              href={localizePath(locale, ctaHref)}
              variant="secondary"
              className="group"
            >
              {m.home.featured.cta}
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </ButtonLink>
          </div>
        </RevealGroup>

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
