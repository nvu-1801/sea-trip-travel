import Link from "next/link";
import { ROUTES } from "@/config/navigation";
import {
  getCategories,
  getChildCategories,
  getCategoryTourCount,
} from "@/lib/data/categories";
import { getToursByCategoryId } from "@/lib/data/tours";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon, MapPinIcon } from "@/components/ui/icons";
import { AssetImage } from "@/components/ui/asset-image";
import type { Locale } from "@/i18n/config";
import { format, getMessages, plural } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";

/**
 * Domestic tours by region.
 *
 * Deliberately a list rather than another grid: alternating a narrow image with
 * a text column breaks up the rhythm of the page and reads faster than a fourth
 * row of identical cards.
 */
export function RegionsSection({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const domestic = getCategories(locale).find(
    (category) => category.path === ROUTES.domestic,
  );
  if (!domestic) return null;

  const regions = getChildCategories(domestic.id, locale);

  return (
    <Section tone="default" spacing="loose">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={m.home.regions.eyebrow}
            title={m.home.regions.title}
            description={m.home.regions.description}
            action={
              <ButtonLink
                href={localizePath(locale, ROUTES.domestic)}
                variant="secondary"
              >
                {m.home.regions.cta}
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            }
          />
        </Reveal>

        <ul className="mt-10 flex flex-col gap-5">
          {regions.map((region) => {
            const regionTours = getToursByCategoryId(region.id, locale).slice(
              0,
              3,
            );
            return (
              <Reveal as="li" key={region.id}>
                <Link
                  href={localizePath(locale, region.path)}
                  className="group grid grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-[box-shadow,transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card sm:grid-cols-[minmax(0,15rem)_1fr]"
                >
                  <AssetImage
                    image={region.image}
                    altFallback={format(m.home.regions.regionAlt, {
                      name: region.name,
                    })}
                    sizes="(max-width: 640px) 100vw, 240px"
                    className="aspect-[16/9] w-full sm:aspect-auto sm:h-full sm:min-h-44"
                  />

                  <div className="flex flex-col gap-2 p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="text-xl font-extrabold text-foreground transition-colors group-hover:text-primary-strong">
                        {region.name}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-strong">
                        <MapPinIcon className="h-3.5 w-3.5" />
                        {plural(
                          m.common.tourCount,
                          getCategoryTourCount(region.id),
                        )}
                      </span>
                    </div>

                    <p className="text-sm leading-relaxed text-foreground-muted">
                      {region.tagline ?? region.description}
                    </p>

                    {regionTours.length > 0 ? (
                      <ul className="mt-1 flex flex-wrap gap-1.5">
                        {regionTours.map((tour) => (
                          <li
                            key={tour.slug}
                            className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground-muted"
                          >
                            {tour.title}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong">
                      {format(m.home.regions.viewRegion, { name: region.name })}
                      <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
