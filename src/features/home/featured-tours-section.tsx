import { ROUTES } from "@/config/navigation";
import { getFeaturedTours } from "@/lib/data/tours";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { TourGrid } from "@/features/tours/tour-grid";
import { toTourCard } from "@/features/tours/tour-card-model";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { localizePath } from "@/i18n/routing";

/**
 * Featured tours. Prefers the Quy Nhơn – Phú Yên line-up (the site's focus) and
 * tops up from other regions so the section is never thin.
 */
export function FeaturedToursSection({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const tours = getFeaturedTours(6, locale).map((tour) => toTourCard(tour, locale));

  return (
    <Section tone="muted" spacing="loose">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={m.home.featured.eyebrow}
            title={m.home.featured.title}
            description={m.home.featured.description}
            action={
              <ButtonLink href={localizePath(locale, ROUTES.quyNhonPhuYen)} variant="secondary">
                {m.home.featured.cta}
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            }
          />
        </Reveal>

        <div className="mt-10">
          <TourGrid tours={tours} priorityCount={3} />
        </div>
      </Container>
    </Section>
  );
}
