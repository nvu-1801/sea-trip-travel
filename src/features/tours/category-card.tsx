import Link from "next/link";
import type { TourCategory } from "@/domain/category";
import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * Category tile.
 *
 * Destination photography is the focal point of the whole design, so the tile
 * leans on the image (or the brand-gradient placeholder) and keeps the text
 * overlay minimal: name, count, one line.
 */
export function CategoryCard({
  category,
  tourCount,
  className,
  priority = false,
}: {
  category: TourCategory;
  tourCount: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href={category.path}
      className={cn(
        "group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-2xl border border-border shadow-soft transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:shadow-lifted",
        className,
      )}
    >
      <AssetImage
        image={category.image}
        altFallback={`Điểm đến ${category.name}`}
        priority={priority}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.05]"
      />
      {/* Scrim keeps text readable over any image, including the placeholder. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-brand-900/88 via-brand-900/38 to-brand-900/5 transition-opacity duration-300 group-hover:opacity-95"
      />

      <span className="relative z-10 flex flex-col gap-2 p-5 text-white">
        <span className="inline-flex w-fit items-center rounded-full bg-white/20 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider backdrop-blur-sm">
          {tourCount} tour
        </span>
        <span className="text-xl font-extrabold leading-tight drop-shadow-sm">
          {category.name}
        </span>
        {category.tagline ? (
          <span className="text-sm leading-snug text-white/85">{category.tagline}</span>
        ) : null}
        <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold">
          Khám phá
          <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </span>
    </Link>
  );
}
