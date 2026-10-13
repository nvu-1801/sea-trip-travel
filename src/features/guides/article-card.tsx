import Link from "next/link";
import type { TravelArticle } from "@/domain/article";
import { formatDateLong } from "@/lib/format";
import { AssetImage } from "@/components/ui/asset-image";
import { Badge } from "@/components/ui/badge";
import { ClockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function ArticleCard({
  article,
  variant = "default",
  className,
}: {
  article: TravelArticle;
  /** `feature` is the large lead card on the guides index. */
  variant?: "default" | "feature";
  className?: string;
}) {
  const isFeature = variant === "feature";

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
          isFeature ? "aspect-[16/10] w-full sm:aspect-auto sm:w-1/2" : "aspect-[16/10] w-full",
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
      </div>

      <div className={cn("flex flex-1 flex-col gap-3 p-5", isFeature && "sm:justify-center sm:p-7")}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-subtle">
          <time dateTime={article.publishedAt}>{formatDateLong(article.publishedAt)}</time>
          {article.readingMinutes ? (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {article.readingMinutes} phút đọc
            </span>
          ) : null}
        </div>

        <h3
          className={cn(
            "font-bold leading-snug text-foreground",
            isFeature ? "text-xl sm:text-2xl" : "text-lg",
          )}
        >
          <Link
            href={`/cam-nang-du-lich/${article.slug}`}
            className="transition-colors hover:text-primary-strong"
          >
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
