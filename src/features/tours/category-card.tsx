import Link from "next/link";
import type { TourCategory } from "@/domain/category";
import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { format, getMessages, plural } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";

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
  locale,
  className,
  priority = false,
}: {
  category: TourCategory;
  tourCount: number;
  locale: Locale;
  className?: string;
  priority?: boolean;
}) {
  const m = getMessages(locale);
  return (
    <Link
      href={localizePath(locale, category.path)}
      className={cn(
        "group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-2xl border border-border shadow-soft transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:shadow-lifted",
        className,
      )}
    >
      <AssetImage
        image={category.image}
        altFallback={format(m.common.destinationAlt, { name: category.name })}
        priority={priority}
        sizes="(max-width: 640px) 150vw, (max-width: 1024px) 75vw, 50vw"
        className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.05]"
      />
      {/* Scrim keeps text readable over any image, including the placeholder.
          Neutral ink (not the theme's dark) so a maroon theme cannot tint the
          photograph pink. */}
      <span
        aria-hidden="true"
        className="stt-photo-scrim absolute inset-0 transition-opacity duration-300 group-hover:opacity-95"
      />

      <span className="relative z-10 flex flex-col gap-2 p-5 text-white">
        <span className="inline-flex w-fit items-center rounded-full bg-white/20 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider backdrop-blur-sm">
          {plural(m.common.tourCount, tourCount)}
        </span>
        <span className="text-xl font-extrabold leading-tight drop-shadow-sm">
          {category.name}
        </span>
        {category.tagline ? (
          <span className="text-sm leading-snug text-white/85">
            {category.tagline}
          </span>
        ) : null}
        <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold">
          {m.common.explore}
          <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </span>
    </Link>
  );
}
