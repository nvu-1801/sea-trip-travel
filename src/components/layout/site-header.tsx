import { ROUTES } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { PhoneIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { DesktopNav } from "./desktop-nav";
import { HeaderShell } from "./header-shell";
import { LogoLink } from "./logo";
import { MobileNav } from "./mobile-nav";

/**
 * Header container.
 *
 * Wider than the page container on purpose: the nav needs horizontal room, so
 * the chrome breathes while the content stays on a comfortable measure.
 */
export function HeaderContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[88rem] px-5 sm:px-7 lg:px-10", className)}>
      {children}
    </div>
  );
}

/**
 * Sticky site header: mark + wordmark, desktop nav with dropdowns, a mobile
 * drawer, the hotline and the primary consultation CTA.
 *
 * Every label is `whitespace-nowrap` and every nav item is `shrink-0`: text must
 * never wrap inside the chrome. If space runs out, the hotline drops out at a
 * breakpoint — items are never squeezed.
 */
export function SiteHeader() {
  return (
    <HeaderShell>
      {/* 1px brand rule, always visible — this is the identity mark. */}
      <div className="brand-gradient h-px w-full" aria-hidden="true" />

      <HeaderContainer>
        <div className="flex h-16 items-center justify-between gap-4 transition-[height] duration-300 ease-out sm:h-18 sm:gap-6 sm:group-data-[condensed=true]:h-16">
          <LogoLink priority />

          <DesktopNav />

          <div className="flex shrink-0 items-center gap-2">
            <a
              href={siteConfig.contact.hotlineHref}
              className="hidden shrink-0 items-center gap-2 rounded-full py-2 pl-2.5 pr-3 transition-colors hover:bg-primary-soft xl:inline-flex"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                <PhoneIcon className="h-4 w-4 text-primary-strong" />
              </span>
              <span className="flex flex-col whitespace-nowrap leading-tight">
                <span className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-foreground-subtle">
                  Hotline
                </span>
                <span className="text-sm font-bold text-foreground">
                  {siteConfig.contact.hotline}
                </span>
              </span>
            </a>

            <ButtonLink
              href={ROUTES.contact}
              size="sm"
              sheen
              className="hidden shrink-0 whitespace-nowrap sm:inline-flex"
            >
              Nhận tư vấn
            </ButtonLink>

            {/* Phones get a direct call action instead of the text CTA. */}
            <a
              href={siteConfig.contact.hotlineHref}
              aria-label={`Gọi hotline ${siteConfig.contact.hotline}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-primary-strong transition-colors hover:border-primary sm:hidden"
            >
              <PhoneIcon className="h-5 w-5" />
            </a>

            <MobileNav />
          </div>
        </div>
      </HeaderContainer>
    </HeaderShell>
  );
}

/** Skip link — first focusable element on every page. */
export function SkipLink() {
  return (
    <a
      href="#noi-dung-chinh"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-primary-strong focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
    >
      Bỏ qua điều hướng, tới nội dung chính
    </a>
  );
}

/** Thin "hotline" strip shown above the footer on content pages. */
export function ContactStrip() {
  return (
    <div className="border-t border-border bg-surface-muted">
      <HeaderContainer>
        <div className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground-muted">
            Chưa biết chọn tour nào? Gửi yêu cầu, SEA TRIP sẽ tư vấn theo thời gian và ngân sách
            của bạn.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={ROUTES.contact} size="sm">
              Gửi yêu cầu tư vấn
            </ButtonLink>
            <ButtonLink
              href={siteConfig.contact.hotlineHref}
              variant="secondary"
              size="sm"
              external
            >
              <PhoneIcon className="h-4 w-4" />
              {siteConfig.contact.hotline}
            </ButtonLink>
          </div>
        </div>
      </HeaderContainer>
    </div>
  );
}
