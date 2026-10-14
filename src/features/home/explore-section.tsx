import { getCategories, getCategoryTourCount } from "@/lib/data/categories";
import { getDestinationsByRegion } from "@/lib/data/destinations";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { CategoryCard } from "@/features/tours/category-card";
import { DestinationCard } from "@/features/destinations/destination-card";
import { ROUTES } from "@/config/navigation";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { localizePath } from "@/i18n/routing";

/**
 * "Khám phá nhanh" — the bridge between the brand promise and the catalogue.
 *
 * Every tile is real navigation: top-level categories first, then the
 * destinations inside the focus region. No decorative filters.
 */
export function ExploreSection({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const topLevel = getCategories(locale).filter((category) => category.parentId === null);
  const focusDestinations = getDestinationsByRegion("quy-nhon-phu-yen", locale).slice(0, 4);

  return (
    <Section tone="default" spacing="default">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={m.home.explore.eyebrow}
            title={m.home.explore.title}
            description={m.home.explore.description}
            action={
              <ButtonLink href={localizePath(locale, ROUTES.domestic)} variant="secondary">
                {m.home.explore.ctaAll}
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            }
          />
        </Reveal>

        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {topLevel.map((category) => (
            <Reveal as="li" key={category.id} className="flex">
              <CategoryCard
                category={category}
                locale={locale}
                tourCount={getCategoryTourCount(category.id)}
                className="w-full"
              />
            </Reveal>
          ))}
        </ul>

        <div className="mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-strong">
                {m.home.explore.destinationsEyebrow}
              </p>
              <h3 className="mt-3 text-display-sm font-display font-semibold text-foreground">
                {m.regions["quy-nhon-phu-yen"]}
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-foreground-muted">
                {m.home.explore.destinationsBlurb}
              </p>
            </div>
            <div className="shrink-0 [&>a]:max-sm:w-full">
              <ButtonLink href={localizePath(locale, ROUTES.quyNhonPhuYen)} variant="secondary">
                {m.home.explore.ctaRoute}
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>

          <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {focusDestinations.map((destination) => (
              <Reveal as="li" key={destination.id} className="flex">
                <DestinationCard
                  destination={destination}
                  locale={locale}
                  href={localizePath(locale, ROUTES.quyNhonPhuYen)}
                  className="w-full"
                />
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
