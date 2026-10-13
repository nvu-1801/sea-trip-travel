import Link from "next/link";
import type { Tour } from "@/domain/tour";
import { formatDestinationNames } from "@/lib/data/destinations";
import { formatDuration, formatPriceFrom, hasPublishedPrice } from "@/lib/format";
import { AssetImage, type AssetImageInput } from "@/components/ui/asset-image";
import { ArrowRightIcon, ClockIcon, MapPinIcon } from "@/components/ui/icons";

/**
 * Card view-model.
 *
 * The UI never sees a raw `Tour`. It sees a small, serialisable projection,
 * which is what lets the listing page hand data to a Client Component for
 * filtering without shipping the whole content graph to the browser.
 */
export type TourCardModel = {
  slug: string;
  title: string;
  summary: string;
  durationLabel: string;
  /** Used by the listing sort control. */
  durationDays: number;
  /** "Từ 1.200.000 ₫" or "Liên hệ tư vấn". Never "0 ₫". */
  priceLabel: string;
  priceIsContact: boolean;
  destinationsLabel: string;
  departureLabel: string | null;
  highlights: readonly string[];
  tags: readonly string[];
  image?: AssetImageInput;
};

export function toTourCard(tour: Tour): TourCardModel {
  return {
    slug: tour.slug,
    title: tour.title,
    summary: tour.summary,
    durationLabel: formatDuration(tour.duration),
    durationDays: tour.duration.days,
    priceLabel: formatPriceFrom(tour.priceFrom),
    priceIsContact: !hasPublishedPrice(tour.priceFrom),
    destinationsLabel: formatDestinationNames(tour.destinationIds),
    departureLabel: tour.departurePoints[0] ?? null,
    highlights: tour.highlights.slice(0, 3),
    tags: tour.tags,
    image: tour.images[0],
  };
}

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
          <Link href={`/tour/${tour.slug}`} className="transition-colors hover:text-primary-strong">
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

        {tour.departureLabel ? (
          <p className="text-xs text-foreground-subtle">Khởi hành: {tour.departureLabel}</p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-foreground-subtle">
              Giá tham khảo
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
            Xem chi tiết
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
