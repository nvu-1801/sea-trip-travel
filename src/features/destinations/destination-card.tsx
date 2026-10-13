import Link from "next/link";
import type { Destination } from "@/domain/destination";
import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";

/**
 * Destination tile used by the "khám phá nhanh" grids.
 * Links to the region category that contains it — a real destination, not a
 * decorative card.
 */
export function DestinationCard({
  destination,
  href,
  className,
}: {
  destination: Destination;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-[box-shadow,transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-brand-200 hover:shadow-card",
        className,
      )}
    >
      <div className="relative overflow-hidden">
        <AssetImage
          image={destination.image}
          altFallback={`Điểm đến ${destination.name}`}
          sizes="(max-width: 640px) 100vw, 25vw"
          className="aspect-[5/4] w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-base font-bold text-foreground transition-colors group-hover:text-primary-strong">
          {destination.name}
        </p>
        <p className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
          {destination.province ?? ""}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{destination.summary}</p>
      </div>
    </Link>
  );
}
