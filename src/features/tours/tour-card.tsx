import Link from "next/link";
import { AssetImage } from "@/components/ui/asset-image";
import { ArrowRightIcon, ClockIcon, MapPinIcon } from "@/components/ui/icons";
import type { TourCardModel } from "./tour-card-model";

export type { TourCardModel } from "./tour-card-model";

/**
 * Tour card.
 *
 * Purely presentational: every string (including the URL) is already resolved in
 * the `TourCardModel`, so this component can render inside the client-side
 * `TourExplorer` without pulling the message catalogs into the browser bundle.
 */
export function TourCard({ tour, priority = false }: { tour: TourCardModel; priority?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-[box-shadow,transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-brand-200 hover:shadow-lifted">
      {/* Brand gradient hairline that draws in on hover. */}
      <span
        aria-hidden="true"
        className="brand-gradient absolute inset-x-0 top-0 z-20 h-0.5 origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100"
      />

      <div className="relative overflow-hidden">
        <AssetImage
          image={tour.image}
          altFallback={tour.title}
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="aspect-[4/3] w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1 text-xs font-semibold text-foreground shadow-soft backdrop-blur-sm">
            <ClockIcon className="h-3.5 w-3.5 text-primary-strong" />
            {tour.durationLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {tour.destinationsLabel ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-strong">
            <MapPinIcon className="h-3.5 w-3.5" />
            {tour.destinationsLabel}
          </p>
        ) : null}

        <h3 className="text-lg font-bold leading-snug text-foreground">
          <Link href={tour.href} className="transition-colors hover:text-primary-strong">
            {/* Single stretched hit area for the whole card. */}
            <span className="absolute inset-0 z-10" aria-hidden="true" />
            {tour.title}
          </Link>
        </h3>

        <p className="text-sm leading-relaxed text-foreground-muted">{tour.summary}</p>

        {tour.highlights.length > 0 ? (
          <ul className="mt-1 space-y-1.5 text-sm text-foreground-muted">
            {tour.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300"
                />
                <span className="leading-snug">{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {tour.departureText ? (
          <p className="text-xs text-foreground-subtle">{tour.departureText}</p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-foreground-subtle">
              {tour.referencePriceText}
            </p>
            <p
              className={
                tour.priceIsContact
                  ? "text-[0.9375rem] font-bold text-primary-strong"
                  : "text-lg font-extrabold text-foreground"
              }
            >
              {tour.priceLabel}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong">
            {tour.viewDetailsText}
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
