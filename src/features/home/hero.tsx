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
import { getSiteSettings } from "@/lib/data/settings";

/**
 * Home hero.
 *
 * Destination imagery is the focal point, so the layout is an editorial
 * collage rather than a full-bleed photo behind a dark overlay: it keeps the
 * brand's warm-white field, and it degrades gracefully to branded gradient
 * tiles while real photography is still pending.
 */
export async function Hero({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const settings = await getSiteSettings(locale);
  /** Owner overrides from Trang chủ win over the shipped catalog copy. */
  const hero = { ...getMessages(locale).home.hero, ...settings.hero };
  const quyNhon = (await getCategories(locale)).find(
    (category) => category.slug === "tour-quy-nhon-phu-yen",
  );
  const focusDestinations = await getDestinationsByRegion("quy-nhon-phu-yen", locale);
  const highlights = focusDestinations.slice(0, 3);
  const mainImage = hero.imageSrc
    ? { src: hero.imageSrc, alt: hero.collageAltMain }
    : focusDestinations.find((destination) => destination.id === "dest_ky_co_eo_gio")?.image;
  const secondaryImage = hero.secondaryImageSrc
    ? { src: hero.secondaryImageSrc, alt: hero.collageAltSecondary }
    : focusDestinations.find((destination) => destination.id === "dest_cu_lao_xanh")?.image;
  const tourCount = quyNhon ? await getCategoryTourCount(quyNhon.id) : 0;

  const assurances = [
    quyNhon ? format(hero.assuranceTours, { count: tourCount }) : null,
    hero.assuranceAdvice,
    hero.assuranceNoBooking,
  ].filter((item): item is string => Boolean(item));

  return (
    <section className="stt-travel-hero relative isolate overflow-x-clip bg-background">
      {/* Brand field: two soft blooms plus a faint dot grid, no heavy wash. */}
      <span
        aria-hidden="true"
        className="stt-hero-bloom pointer-events-none absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-brand-200/45 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="stt-hero-bloom stt-hero-bloom-sun pointer-events-none absolute -left-36 bottom-0 h-80 w-80 rounded-full bg-sun-300/25 blur-3xl"
      />

      {/* A quiet coastal contour, kept behind the content and out of hit areas. */}
      <div aria-hidden="true" className="stt-coastal-lines pointer-events-none absolute inset-x-0 bottom-0 h-36 overflow-hidden text-brand-300/35 sm:h-52">
        <svg className="h-full w-full" viewBox="0 0 1440 200" fill="none" preserveAspectRatio="none">
          <path d="M-80 115C180 0 360 200 650 100S1120 20 1520 100" stroke="currentColor" strokeWidth="1" />
          <path d="M-80 140C180 25 360 225 650 125S1120 45 1520 125" stroke="currentColor" strokeWidth="1" />
          <path d="M-80 165C180 50 360 250 650 150S1120 70 1520 150" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
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
        <div className="relative grid grid-cols-1 items-center gap-10 pt-[22px] pb-12 sm:gap-12 sm:pt-[38px] sm:pb-20 lg:grid-cols-12 lg:gap-16 lg:pt-[46px] lg:pb-24">
          {/* --- Copy ------------------------------------------------------- */}
          <div className="lg:col-span-6">
            <p
              data-entrance
              className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-strong backdrop-blur-sm"
            >
              <SparkleIcon className="h-3.5 w-3.5" />
              {hero.badge}
            </p>

            <h1
              data-entrance
              style={{ animationDelay: "80ms" }}
              className="mt-6 text-display-xl font-display font-semibold text-foreground"
            >
              <span className="block">{hero.titleLine1}</span>
              <span className="mt-1 block brand-gradient-text font-medium">
                {hero.titleLine2}
              </span>
            </h1>

            <p
              data-entrance
              style={{ animationDelay: "140ms" }}
              className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-foreground sm:text-xl"
            >
              {hero.lead}
            </p>

            <p
              data-entrance
              style={{ animationDelay: "200ms" }}
              className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-foreground-muted"
            >
              {hero.bodyA}{" "}
              <strong className="font-semibold text-foreground">
                {hero.focusName}
              </strong>{" "}
              {hero.bodyB}
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
                {hero.ctaTours}
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </ButtonLink>
              <ButtonLink
                href={localizePath(locale, ROUTES.contact)}
                variant="secondary"
                size="lg"
              >
                {hero.ctaConsult}
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
                  image={mainImage ?? { alt: hero.collageAltMain }}
                  sizes="(max-width: 1024px) 90vw, 40vw"
                  priority
                  parallax
                  className="aspect-[4/5] w-full"
                  markPlaceholder
                />
              </div>

              {/* Brand badge card */}
              <div className="stt-hero-badge absolute -right-2 top-5 max-w-[9.5rem] rounded-2xl border border-border bg-surface/95 p-3 shadow-card backdrop-blur-sm sm:-right-6 sm:top-6 sm:max-w-52 sm:p-4">
                <span className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-primary-strong sm:gap-2 sm:text-[0.6875rem]">
                  <CompassIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {hero.focusBadge}
                </span>
                <p className="mt-1.5 text-[0.8125rem] font-extrabold leading-snug text-foreground sm:text-sm">
                  {hero.focusName}
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
                    image={secondaryImage ?? { alt: hero.collageAltSecondary }}
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
