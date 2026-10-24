import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/layout";
import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  /** Omit `href` for the current page (rendered as plain text). */
  href?: string;
};

/**
 * Breadcrumb with matching JSON-LD emitted by `BreadcrumbJsonLd`.
 *
 * `hero` is the variant used inside `PageHero`: same semantics and same
 * container, a slightly tighter type scale and a little less vertical padding,
 * because the hero already owns the surrounding rhythm.
 */
export function Breadcrumbs({
  items,
  ariaLabel = "Breadcrumb",
  variant = "default",
}: {
  items: readonly Crumb[];
  ariaLabel?: string;
  variant?: "default" | "hero";
}) {
  const isHero = variant === "hero";

  return (
    <nav aria-label={ariaLabel} className={isHero ? "relative z-10" : undefined}>
      <Container>
        <ol
          className={cn(
            "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm",
            isHero ? "pb-5 pt-2 text-[0.8125rem] sm:pb-7" : "py-4",
          )}
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className={cn(
                      "inline-flex min-h-11 items-center transition-colors hover:text-primary-strong",
                      isHero ? "text-foreground-subtle" : "text-foreground-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current="page"
                    className={cn(
                      "font-semibold text-foreground",
                      isHero && "line-clamp-1",
                    )}
                  >
                    {item.label}
                  </span>
                )}
                {!isLast ? (
                  <ChevronRightIcon className="h-3.5 w-3.5 text-foreground-subtle" />
                ) : null}
              </li>
            );
          })}
        </ol>
      </Container>
    </nav>
  );
}
