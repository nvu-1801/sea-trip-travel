import Link from "next/link";
import type { Destination } from "@/domain/destination";
import { AssetImage } from "@/components/ui/asset-image";
import { MapPinIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";
import { format, getMessages } from "@/i18n/messages";

/**
 * Destination tile used by the "khám phá nhanh" grids.
 * Links to the region category that contains it — a real destination, not a
 * decorative card.
 *
 * Tiles stretch to the row height (`h-full`) so a 2×2 grid reads as one block,
 * and the summary is clamped to two lines so every tile is the same height
 * regardless of copy length.
 */
export function DestinationCard({
  destination,
  href,
  locale,
  className,
}: {
  destination: Destination;
  href: string;
  locale: Locale;
  className?: string;
}) {
  const m = getMessages(locale);
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-[box-shadow,transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-brand-200 hover:shadow-card",
        className,
      )}
    >
      {/* Brand gradient hairline that draws in on hover. */}
      <span
        aria-hidden="true"
        className="brand-gradient absolute inset-x-0 top-0 z-20 h-0.5 origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100"
      />

      <div className="relative overflow-hidden">
        <AssetImage
          image={destination.image}
          altFallback={format(m.common.destinationAlt, { name: destination.name })}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="aspect-[16/10] w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <p className="text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary-strong">
          {destination.name}
        </p>
        {destination.province ? (
          <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-foreground-subtle">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-primary-strong/70" />
            {destination.province}
          </p>
        ) : null}
        <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-foreground-muted">
          {destination.summary}
        </p>
      </div>
    </Link>
  );
}
