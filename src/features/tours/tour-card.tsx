import Link from "next/link";
import { AssetImage } from "@/components/ui/asset-image";
import { ArrowRightIcon, CheckIcon, ClockIcon, MapPinIcon, SparkleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { TourCardModel } from "./tour-card-model";

export type { TourCardModel } from "./tour-card-model";

/**
 * Tour card.
 *
 * Purely presentational: every string (including the URL) is already resolved in
 * the `TourCardModel`, so this component can render inside the client-side
 * `TourExplorer` without pulling the message catalogs into the browser bundle.
 *
 * `layout="horizontal"` stretches the card into a full-width spotlight
 * (photo left, content right) for the first item of the home feature section.
 */
export function TourCard({
  tour,
  priority = false,
  layout = "vertical",
}: {
  tour: TourCardModel;
  priority?: boolean;
  layout?: "vertical" | "horizontal";
}) {
  const horizontal = layout === "horizontal";
  return (
    <article
      className={cn(
        "stt-tour-card group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-soft",
        horizontal && "stt-tour-card-horizontal sm:flex-row",
      )}
    >
      {/* Brand gradient hairline that draws in on hover. */}
      <span
        aria-hidden="true"
        className="stt-card-rule brand-gradient pointer-events-none absolute inset-x-0 top-0 z-20 h-1 origin-left scale-x-0"
      />

      <div
        className={cn(
          "stt-card-media relative overflow-hidden",
          horizontal && "sm:w-[42%] sm:shrink-0",
        )}
      >
        <AssetImage
          image={tour.image}
          altFallback={tour.title}
          priority={priority}
          sizes={
            horizontal
              ? "(max-width: 640px) 100vw, 45vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          }
          className={cn(
            "stt-card-photo aspect-[16/10] w-full",
            horizontal && "sm:aspect-auto sm:h-full sm:min-h-[320px]",
          )}
        />
        <span aria-hidden="true" className="stt-card-scrim" />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {tour.badge ? (
            <span className="stt-card-badge">
              <SparkleIcon className="h-3.5 w-3.5" />
              {tour.badge}
            </span>
          ) : null}
          <span className="stt-card-pill">
            <ClockIcon className="h-3.5 w-3.5 text-primary-strong" />
            {tour.durationLabel}
          </span>
        </div>
        {!tour.priceIsContact ? (
          <span className="stt-card-price-float">{tour.priceLabel}</span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-6">
        {tour.destinationsLabel ? (
          <p className="stt-card-dest">
            <MapPinIcon className="h-3.5 w-3.5" />
            <span className="truncate">{tour.destinationsLabel}</span>
          </p>
        ) : null}

        <h3 className="stt-card-title">
          <Link href={tour.href} className="transition-colors hover:text-primary-strong">
            {/* Single stretched hit area for the whole card. */}
            <span className="absolute inset-0 z-10" aria-hidden="true" />
            {tour.title}
          </Link>
        </h3>

        <p className="stt-card-summary">{tour.summary}</p>

        {tour.highlights.length > 0 ? (
          <ul className="stt-card-highlights">
            {tour.highlights.slice(0, 3).map((highlight) => (
              <li key={highlight}>
                <CheckIcon
                  aria-hidden="true"
                  className="stt-card-tick h-4 w-4"
                />
                <span className="truncate">{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {tour.departureText ? (
          <p className="stt-card-depart">{tour.departureText}</p>
        ) : null}

        <div className="stt-card-foot">
          <div>
            <p className="stt-card-price-label">{tour.referencePriceText}</p>
            <p
              className={
                tour.priceIsContact
                  ? "stt-card-price-contact"
                  : "stt-card-price"
              }
            >
              {tour.priceLabel}
            </p>
          </div>
          <span className="stt-card-cta">
            {tour.viewDetailsText}
            <ArrowRightIcon className="stt-card-arrow h-4 w-4" />
          </span>
        </div>
      </div>
    </article>
  );
}
