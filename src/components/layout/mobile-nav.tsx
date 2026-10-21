"use client";
import { useSiteContact } from "./site-context";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { primaryNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n/config";
import { localizePath, stripLocaleFromPath } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import {
  ChevronDownIcon,
  CloseIcon,
  MailIcon,
  MenuIcon,
  PhoneIcon,
} from "@/components/ui/icons";
import { setNavOpen } from "./header-state";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import type { NavLabels } from "./desktop-nav";

export type MobileNavUi = {
  openMenu: string;
  closeMenu: string;
  menuLabel: string;
  primaryNavAria: string;
  requestConsultationFree: string;
  hotline: string;
  email: string;
  langLabel: string;
  langSwitchTo: string;
  langCurrent: string;
  leaveWarning: string;
};

/**
 * Mobile navigation drawer.
 *
 * Built on the native `<dialog>` element with `showModal()`, which gives us a
 * real focus trap, inert background content, Escape-to-close and a backdrop
 * without shipping a focus-trap library.
 *
 * The language switch sits at the top of the drawer, where it is always reachable
 * without overflowing the 360–390px bar.
 */
export function MobileNav({
  locale,
  labels,
  ui,
}: {
  locale: Locale;
  labels: NavLabels;
  ui: MobileNavUi;
}) {
  const identity = useSiteContact();
  const pathname = usePathname();
  const currentPath = stripLocaleFromPath(pathname ?? "/").path;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (openRef.current) {
        openRef.current = false;
        setNavOpen(false);
      }
    };
  }, []);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next !== openRef.current) {
      openRef.current = next;
      setNavOpen(next);
    }
  };

  const close = () => {
    changeOpen(false);
    setExpanded(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => changeOpen(true)}
        data-focus-ring=""
        aria-label={ui.openMenu}
        aria-haspopup="dialog"
        className="stt-menu-trigger inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-foreground transition-colors hover:border-primary hover:text-primary-strong xl:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => changeOpen(false)}
        aria-label={ui.menuLabel}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-brand-900/45 backdrop:backdrop-blur-sm"
      >
        <div className="stt-drawer-panel flex h-dvh w-full flex-col bg-background">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
            <Logo size="sm" />
            <div className="flex items-center gap-2">
              <LocaleSwitcher
                locale={locale}
                label={ui.langLabel}
                switchToLabel={ui.langSwitchTo}
                currentLabel={ui.langCurrent}
                leaveWarning={ui.leaveWarning}
              />
              <button
                type="button"
                onClick={close}
                data-focus-ring=""
                aria-label={ui.closeMenu}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-foreground transition-colors hover:border-primary hover:text-primary-strong"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <nav
            aria-label={ui.primaryNavAria}
            className="flex-1 overflow-y-auto px-3 py-4"
          >
            <ul className="flex flex-col gap-1">
              {(identity.navigation ?? primaryNav).map((item) => {
                const label =
                  locale === "en"
                    ? item.labelEn || item.label || labels.nav[item.labelKey]
                    : item.label || labels.nav[item.labelKey];
                const isActive =
                  item.href === "/"
                    ? currentPath === "/"
                    : currentPath === item.href ||
                      currentPath.startsWith(`${item.href}/`);

                if (!item.children || item.children.length === 0) {
                  return (
                    <li key={item.href}>
                      <Link
                        href={localizePath(locale, item.href)}
                        onClick={close}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "block rounded-lg px-4 py-3.5 text-base font-semibold whitespace-nowrap transition-colors",
                          isActive
                            ? "bg-primary-soft text-primary-strong"
                            : "text-foreground hover:bg-surface-muted",
                        )}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                }

                const isExpanded = expanded === item.href;
                const panelId = `mobile-panel-${item.labelKey}-${item.href.replaceAll("/", "-")}`;

                return (
                  <li key={item.href}>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => setExpanded(isExpanded ? null : item.href)}
                      data-focus-ring=""
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-4 py-3.5 text-left text-base font-semibold whitespace-nowrap transition-colors",
                        isActive || isExpanded
                          ? "bg-primary-soft text-primary-strong"
                          : "text-foreground hover:bg-surface-muted",
                      )}
                    >
                      {label}
                      <ChevronDownIcon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-transform duration-300 ease-out",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>

                    <div
                      id={panelId}
                      inert={!isExpanded}
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                        isExpanded
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="mb-2 mt-1 pl-2">
                          <Link
                            href={localizePath(locale, item.href)}
                            onClick={close}
                            className="block rounded-lg px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-primary-strong transition-colors hover:bg-primary-soft"
                          >
                            {labels.allOf.replace("{label}", label)}
                          </Link>
                          <ul className="mt-0.5 border-l border-border pl-2">
                            {item.children.map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={localizePath(locale, child.href)}
                                  onClick={close}
                                  aria-current={
                                    currentPath === child.href
                                      ? "page"
                                      : undefined
                                  }
                                  className={cn(
                                    "block rounded-lg px-4 py-2.5 text-[0.9375rem] whitespace-nowrap transition-colors",
                                    currentPath === child.href
                                      ? "font-semibold text-primary-strong"
                                      : "text-foreground-muted hover:bg-surface-muted hover:text-foreground",
                                  )}
                                >
                                  {locale === "en"
                                    ? child.labelEn ||
                                      child.label ||
                                      labels.nav[child.labelKey]
                                    : child.label || labels.nav[child.labelKey]}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-border bg-surface px-5 py-4">
            <ButtonLink
              href={localizePath(locale, "/lien-he")}
              size="lg"
              sheen
              className="w-full"
            >
              {ui.requestConsultationFree}
            </ButtonLink>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 shrink-0 text-primary-strong" />
                <dt className="sr-only">{ui.hotline}</dt>
                <dd>
                  <a
                    href={siteConfig.contact.hotlineHref}
                    className="font-semibold whitespace-nowrap text-foreground hover:text-primary-strong"
                  >
                    {siteConfig.contact.hotline}
                  </a>
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <MailIcon className="h-4 w-4 shrink-0 text-primary-strong" />
                <dt className="sr-only">{ui.email}</dt>
                <dd>
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="text-foreground-muted hover:text-primary-strong"
                  >
                    {siteConfig.contact.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </dialog>
    </>
  );
}
