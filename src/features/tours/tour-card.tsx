import Link from "next/link";
import { AssetImage } from "@/components/ui/asset-image";
import { ArrowRightIcon, CheckIcon, ClockIcon, MapPinIcon } from "@/components/ui/icons";
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
              ? "(max-width: 640px) 150vw, 68vw"
              : "(max-width: 640px) 150vw, (max-width: 1024px) 75vw, 50vw"
          }
          className={cn(
            "stt-card-photo aspect-[4/3] w-full",
            horizontal && "sm:aspect-auto sm:h-full sm:min-h-[320px]",
          )}
        />
        <span aria-hidden="true" className="stt-card-scrim" />
        <div className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-5.5rem)] flex-wrap gap-1.5">
          <span className="stt-card-pill">
            <ClockIcon className="h-3.5 w-3.5 text-primary-strong" />
            {tour.durationLabel}
          </span>
        </div>
        {horizontal || tour.badge ? (
          <div className="pointer-events-none absolute right-3 top-3 z-10">
            <span
              className={`stt-card-badge${horizontal ? " stt-card-badge--featured" : ""}`}
            >
              {horizontal ? tour.badge || tour.featuredLabel : tour.badge}
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col gap-3 p-5 sm:p-5",
          horizontal && "stt-card-content-horizontal",
        )}
      >
        <div
          className={`stt-card-price-panel${tour.priceIsContact ? " is-contact" : ""}`}
        >
          <p className="stt-card-price-kicker">
            {tour.priceIsContact
              ? tour.referencePriceText
              : tour.priceFromText}
          </p>
          <p
            className={
              tour.priceIsContact
                ? "stt-card-price-contact"
                : "stt-card-price"
            }
          >
            {tour.priceLabel}
          </p>
          {!tour.priceIsContact &&
          (tour.priceOriginalLabel || tour.discountLabel) ? (
            <div className="stt-card-price-meta">
              {tour.priceOriginalLabel ? (
                <span
                  className="stt-card-price-original"
                  aria-label={tour.priceOriginalAria ?? undefined}
                >
                  {tour.priceOriginalLabel}
                </span>
              ) : null}
              {tour.discountLabel ? (
                <span
                  className="stt-card-price-save"
                  aria-label={tour.discountAria ?? undefined}
                >
                  {tour.discountLabel}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {tour.destinationsLabel ? (
          <p className="stt-card-dest">
            <MapPinIcon className="h-3.5 w-3.5" />
            <span className="truncate">{tour.destinationsLabel}</span>
          </p>
        ) : null}

        <h3 className="stt-card-title">
          <Link href={tour.href} className="transition-colors hover:text-primary-strong">
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
                  className="stt-card-tick h-3.5 w-3.5"
                />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {tour.departureText ? (
          <p className="stt-card-depart">{tour.departureText}</p>
        ) : null}

        <div className="stt-card-actions">
          <Link href={tour.consultHref} className="stt-card-consult">
            {tour.consultText}
            <ArrowRightIcon className="stt-card-arrow h-4 w-4" />
          </Link>
          <Link href={tour.href} className="stt-card-details">
            {tour.viewDetailsText}
          </Link>
        </div>
      </div>
    </article>
  );
}
