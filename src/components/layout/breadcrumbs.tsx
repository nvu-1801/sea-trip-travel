import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/layout";

export type Crumb = {
  label: string;
  /** Omit `href` for the current page (rendered as plain text). */
  href?: string;
};

/** Breadcrumb with matching JSON-LD emitted by `BreadcrumbJsonLd`. */
export function Breadcrumbs({
  items,
  ariaLabel = "Breadcrumb",
}: {
  items: readonly Crumb[];
  ariaLabel?: string;
}) {
  return (
    <nav aria-label={ariaLabel}>
      <Container>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 py-4 text-sm">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center text-foreground-muted transition-colors hover:text-primary-strong"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-semibold text-foreground">
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
