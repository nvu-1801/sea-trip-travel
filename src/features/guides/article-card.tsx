import Link from "next/link";
import type { TravelArticle } from "@/domain/article";
import { formatDateLong } from "@/lib/format";
import { AssetImage } from "@/components/ui/asset-image";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon, ClockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";
import { getMessages, plural } from "@/i18n/messages";
import { localizePath } from "@/i18n/routing";

/** Compact row used by the side list next to a featured article. */
export function CompactArticleRow({
  article,
  locale,
  className,
}: {
  article: TravelArticle;
  locale: Locale;
  className?: string;
}) {
  const m = getMessages(locale);
  return (
    <article
      className={cn(
        "group relative flex items-start gap-4 py-4 transition-colors duration-200 first:pt-0",
        className,
      )}
    >
      <div className="relative shrink-0 overflow-hidden rounded-xl border border-border">
        <AssetImage
          image={article.cover}
          altFallback={article.title}
          sizes="120px"
          className="h-[4.25rem] w-[5.25rem] transition-transform duration-500 ease-out group-hover:scale-[1.08]"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.6875rem] text-foreground-subtle">
          <time dateTime={article.publishedAt}>{formatDateLong(article.publishedAt, locale)}</time>
          {article.readingMinutes ? (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {plural(m.common.readMinutesShort, article.readingMinutes)}
            </span>
          ) : null}
        </div>

        <h3 className="mt-1 text-[0.9375rem] font-bold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary-strong">
          <Link
            href={localizePath(locale, `/cam-nang-du-lich/${article.slug}`)}
            className="focus-visible:outline-none"
          >
            <span className="absolute inset-0 z-10" aria-hidden="true" />
            {article.title}
          </Link>
        </h3>

        {article.tags.length > 0 ? (
          <p className="mt-1 truncate text-xs text-foreground-muted">
            {article.tags.slice(0, 3).join(" · ")}
          </p>
        ) : null}
      </div>

      {/* Arrow slides in on hover — the only motion cue this dense row needs. */}
      <ArrowRightIcon
        aria-hidden="true"
        className="mt-1 h-4 w-4 shrink-0 -translate-x-1 text-brand-300 opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100"
      />
    </article>
  );
}

export function ArticleCard({
  article,
  locale,
  variant = "default",
  imageFill = false,
  className,
}: {
  article: TravelArticle;
  locale: Locale;
  /** `feature` is the large lead card on the guides index. */
  variant?: "default" | "feature";
  /**
   * Feature only: stretch the cover to the card height instead of a fixed 4:3
   * box, so the image never leaves an empty strip when a sibling column is
   * taller.
   */
  imageFill?: boolean;
  className?: string;
}) {
  const m = getMessages(locale);
  const isFeature = variant === "feature";
  const href = localizePath(locale, `/cam-nang-du-lich/${article.slug}`);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-[box-shadow,transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card",
        isFeature && "sm:flex-row",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          isFeature
            ? cn(
                "aspect-[16/10] w-full sm:w-1/2",
                imageFill ? "sm:aspect-auto sm:min-h-56" : "sm:aspect-[4/3]",
              )
            : "aspect-[16/10] w-full",
        )}
      >
        <AssetImage
          image={article.cover}
          altFallback={article.title}
          sizes={isFeature ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 768px) 100vw, 33vw"}
          className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        {/* Brand gradient hairline on hover. */}
        <span
          aria-hidden="true"
          className="brand-gradient absolute inset-x-0 bottom-0 z-10 h-0.5 origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100"
        />
        {isFeature ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-white/92 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-primary-strong shadow-soft backdrop-blur-sm">
            {m.guides.featuredBadge}
          </span>
        ) : null}
      </div>

      <div className={cn("flex flex-1 flex-col gap-3 p-5", isFeature && "sm:justify-center sm:p-7")}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-subtle">
          <time dateTime={article.publishedAt}>{formatDateLong(article.publishedAt, locale)}</time>
          {article.readingMinutes ? (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {plural(m.common.readMinutes, article.readingMinutes)}
            </span>
          ) : null}
        </div>

        <h3
          className={cn(
            "font-bold leading-snug text-foreground",
            isFeature ? "text-xl sm:text-2xl" : "text-lg",
          )}
        >
          <Link href={href} className="transition-colors hover:text-primary-strong">
            <span className="absolute inset-0 z-10" aria-hidden="true" />
            {article.title}
          </Link>
        </h3>

        <p className="text-sm leading-relaxed text-foreground-muted">{article.excerpt}</p>

        {article.tags.length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {article.tags.slice(0, 3).map((tag) => (
              <li key={tag}>
                <Badge tone="outline">{tag}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
