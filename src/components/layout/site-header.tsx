import { siteConfig } from "@/config/runtime-site";
import { PhoneIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { getMessages } from "@/i18n/server";
import type { Locale } from "@/i18n/config";
import { getDestinationSearchIndex } from "@/lib/data/destination-search";
import { DesktopNav } from "./desktop-nav";
import { HeaderSearch } from "./header-search";
import { HeaderShell } from "./header-shell";
import { LocaleSwitcher } from "./locale-switcher";
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
    <div
      className={cn(
        "stt-header-container mx-auto w-full max-w-[88rem] px-5 sm:px-7 lg:px-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Sticky site header: mark + wordmark, desktop nav with dropdowns, the language
 * switch, a mobile drawer, the hotline and the primary consultation CTA.
 *
 * The language switch lives in the header only from `lg` up; below that it lives
 * inside the mobile drawer, which keeps the 360–390px bar to the logo, the call
 * button and the menu button.
 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const navLabels = { nav: m.nav, header: m.header, allOf: m.common.allOf };
  const searchItems = getDestinationSearchIndex(locale, m.regions);
  return (
    <HeaderShell>
      <div className="stt-header-brandline brand-gradient h-px w-full" aria-hidden="true" />

      <HeaderContainer>
        <div className="flex h-16 items-center justify-between gap-4 transition-[height] duration-300 ease-out sm:h-18 sm:gap-6 sm:group-data-[condensed=true]:h-16 xl:gap-4">
          <LogoLink locale={locale} priority className="stt-header-logo" />

          <DesktopNav locale={locale} labels={navLabels} />

          <div className="stt-header-actions flex shrink-0 items-center gap-2">
            <HeaderSearch
              locale={locale}
              items={searchItems}
              labels={m.header.search}
            />

            <a
              href={siteConfig.contact.hotlineHref}
              className="stt-header-hotline hidden shrink-0 items-center gap-2 rounded-full py-2 pl-2.5 pr-3 transition-colors hover:bg-primary-soft 2xl:inline-flex"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                <PhoneIcon className="h-4 w-4 text-primary-strong" />
              </span>
              <span className="flex flex-col whitespace-nowrap leading-tight">
                <span className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-foreground-subtle">
                  {m.common.hotline}
                </span>
                <span className="text-sm font-bold text-foreground">
                  {siteConfig.contact.hotline}
                </span>
              </span>
            </a>

            <LocaleSwitcher
              locale={locale}
              label={m.locale.label}
              switchToLabel={m.locale.switchTo}
              currentLabel={m.locale.current}
              leaveWarning={m.lead.leaveWarning}
              className="stt-header-locale hidden xl:block"
            />

            {/* Phones get a direct call action instead of the text CTA. */}
            <a
              href={siteConfig.contact.hotlineHref}
              aria-label={m.common.callHotlineAria.replace(
                "{phone}",
                siteConfig.contact.hotline,
              )}
              className="stt-header-call inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-primary-strong transition-colors hover:border-primary sm:hidden"
            >
              <PhoneIcon className="h-5 w-5" />
            </a>

            <MobileNav
              locale={locale}
              labels={navLabels}
              ui={{
                openMenu: m.header.openMenu,
                closeMenu: m.header.closeMenu,
                menuLabel: m.header.menuLabel,
                primaryNavAria: m.header.primaryNavMobileAria,
                requestConsultationFree: m.common.requestConsultationFree,
                hotline: m.common.hotline,
                email: m.common.email,
                langLabel: m.locale.label,
                langSwitchTo: m.locale.switchTo,
                langCurrent: m.locale.current,
                leaveWarning: m.lead.leaveWarning,
              }}
            />
          </div>
        </div>
      </HeaderContainer>
    </HeaderShell>
  );
}

/** Skip link — first focusable element on every page. */
export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#noi-dung-chinh"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-primary-strong focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
    >
      {label}
    </a>
  );
}
