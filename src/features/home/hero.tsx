import { ROUTES } from "@/config/navigation";
import { getCategories, getCategoryTourCount } from "@/lib/data/categories";
import { getDestinationsByRegion } from "@/lib/data/destinations";
import { AssetImage } from "@/components/ui/asset-image";
import { Container } from "@/components/ui/layout";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon, CheckIcon, CompassIcon, SparkleIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { format, getMessages } from "@/i18n/messages";
import { localizePath } from "@/i18n/routing";

/**
 * Home hero.
 *
 * Destination imagery is the focal point, so the layout is an editorial
 * collage rather than a full-bleed photo behind a dark overlay: it keeps the
 * brand's warm-white field, and it degrades gracefully to branded gradient
 * tiles while real photography is still pending.
 */
export function Hero({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const quyNhon = getCategories(locale).find(
    (category) => category.slug === "tour-quy-nhon-phu-yen",
  );
  const highlights = getDestinationsByRegion("quy-nhon-phu-yen", locale).slice(0, 3);

  const assurances = [
    quyNhon
      ? format(m.home.hero.assuranceTours, { count: getCategoryTourCount(quyNhon.id) })
      : null,
    m.home.hero.assuranceAdvice,
    m.home.hero.assuranceNoBooking,
  ].filter((item): item is string => Boolean(item));

  return (
    <section className="relative overflow-x-clip bg-background">
      {/* Brand field: two soft blooms plus a faint dot grid, no heavy wash. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-brand-200/45 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-36 bottom-0 h-80 w-80 rounded-full bg-sun-300/25 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--color-brand-500) 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />

      <Container>
        <div className="relative grid grid-cols-1 items-center gap-10 py-12 sm:gap-12 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:py-24">
          {/* --- Copy ------------------------------------------------------- */}
          <div className="lg:col-span-6">
            <p
              data-entrance
              className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-strong backdrop-blur-sm"
            >
              <SparkleIcon className="h-3.5 w-3.5" />
              {m.home.hero.badge}
            </p>

            <h1
              data-entrance
              style={{ animationDelay: "80ms" }}
              className="mt-6 text-display-xl font-display font-semibold text-foreground"
            >
              <span className="block">{m.home.hero.titleLine1}</span>
              <span className="mt-1 block brand-gradient-text font-medium">
                {m.home.hero.titleLine2}
              </span>
            </h1>

            <p
              data-entrance
              style={{ animationDelay: "140ms" }}
              className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-foreground sm:text-xl"
            >
              {m.home.hero.lead}
            </p>

            <p
              data-entrance
              style={{ animationDelay: "200ms" }}
              className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-foreground-muted"
            >
              {m.home.hero.bodyA}{" "}
              <strong className="font-semibold text-foreground">
                {m.home.hero.focusName}
              </strong>{" "}
              {m.home.hero.bodyB}
            </p>

            <div
              data-entrance
              style={{ animationDelay: "280ms" }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <ButtonLink
                href={localizePath(locale, ROUTES.quyNhonPhuYen)}
                size="lg"
                className="group"
              >
                {m.home.hero.ctaTours}
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </ButtonLink>
              <ButtonLink
                href={localizePath(locale, ROUTES.contact)}
                variant="secondary"
                size="lg"
              >
                {m.home.hero.ctaConsult}
              </ButtonLink>
            </div>

            <ul
              data-entrance
              style={{ animationDelay: "360ms" }}
              className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-foreground-muted"
            >
              {assurances.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 shrink-0 text-primary-strong" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* --- Collage ---------------------------------------------------- */}
          <div className="lg:col-span-6">
            <div
              data-entrance
              style={{ animationDelay: "200ms" }}
              className="relative mx-auto max-w-lg pb-10 sm:pb-12 lg:max-w-none lg:pb-0"
            >
              <div className="overflow-hidden rounded-3xl border border-border shadow-lifted">
                <AssetImage
                  image={{ alt: m.home.hero.collageAltMain }}
                  sizes="(max-width: 1024px) 90vw, 40vw"
                  priority
                  parallax
                  className="aspect-[4/5] w-full"
                  markPlaceholder
                />
              </div>

              {/* Brand badge card */}
              <div className="absolute -right-2 top-5 max-w-[9.5rem] rounded-2xl border border-border bg-surface/95 p-3 shadow-card backdrop-blur-sm sm:-right-6 sm:top-6 sm:max-w-52 sm:p-4">
                <span className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-primary-strong sm:gap-2 sm:text-[0.6875rem]">
                  <CompassIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {m.home.hero.focusBadge}
                </span>
                <p className="mt-1.5 text-[0.8125rem] font-extrabold leading-snug text-foreground sm:text-sm">
                  {m.home.hero.focusName}
                </p>
                {highlights.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-[0.6875rem] leading-snug text-foreground-muted sm:text-xs">
                    {highlights.map((destination) => (
                      <li key={destination.id}>{destination.name}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {/* Overlapping secondary tile */}
              <div className="absolute -bottom-6 -left-3 w-28 sm:-bottom-8 sm:-left-8 sm:w-44 lg:w-48">
                <div className="overflow-hidden rounded-2xl border-4 border-background shadow-card">
                  <AssetImage
                    image={{ alt: m.home.hero.collageAltSecondary }}
                    sizes="200px"
                    parallax
                    className="aspect-square w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Thin brand rule closing the hero — the logo gradient, used sparingly. */}
      <div className="brand-gradient h-px w-full opacity-40" aria-hidden="true" />

      <p className="sr-only">{m.site.tagline}</p>
    </section>
  );
}
