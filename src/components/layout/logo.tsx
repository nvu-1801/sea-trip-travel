import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Header/footer lockup: the supplied peacock mark plus the wordmark set as live
 * text. Keeping the wordmark as text (rather than shipping the raster lockup)
 * means it stays crisp at any size, stays selectable, and is readable by search
 * engines. The raster lockup is used where text cannot be styled — the OG image
 * and the HTML email.
 *
 * The wordmark is `whitespace-nowrap`, so the brand never breaks onto two lines
 * inside the header, and the mark shrinks slightly with the condensed header.
 */
export function Logo({
  className,
  size = "md",
  showTagline = false,
  priority = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  priority?: boolean;
}) {
  const markClass =
    size === "sm"
      ? "h-8 w-8"
      : size === "lg"
        ? "h-12 w-12"
        : "h-9 w-9 sm:h-10 sm:w-10 group-data-[condensed=true]:sm:h-9 group-data-[condensed=true]:sm:w-9";

  const wordClass =
    size === "sm"
      ? "text-[0.875rem] sm:text-[0.9375rem]"
      : size === "lg"
        ? "text-xl sm:text-2xl"
        : "text-base sm:text-[1.0625rem] xl:text-[1.125rem]";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={48}
        height={48}
        priority={priority}
        className={cn(
          markClass,
          "shrink-0 transition-[height,width,transform] duration-300 ease-out group-hover:scale-105",
        )}
      />
      <span className="flex flex-col whitespace-nowrap leading-none">
        <span
          className={cn(
            "whitespace-nowrap font-extrabold uppercase tracking-tight text-brand-500",
            wordClass,
          )}
        >
          {siteConfig.name}
        </span>
        {showTagline ? (
          <span className="mt-1 whitespace-nowrap text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-foreground-muted">
            {siteConfig.message}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function LogoLink({
  className,
  size = "md",
  showTagline = false,
  priority = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  priority?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("shrink-0 rounded-sm", className)}
      aria-label={`${siteConfig.name} – về trang chủ`}
    >
      <Logo size={size} showTagline={showTagline} priority={priority} />
    </Link>
  );
}
