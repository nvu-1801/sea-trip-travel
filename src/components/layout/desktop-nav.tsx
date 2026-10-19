"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { primaryNav } from "@/config/navigation";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { localizePath, stripLocaleFromPath } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "@/components/ui/icons";
import { setNavOpen } from "./header-state";

/**
 * Labels are passed in from the server header rather than imported: a Client
 * Component that imported the catalogs would ship every message to the browser.
 */
export type NavLabels = {
  nav: Messages["nav"];
  header: Messages["header"];
  /** "All {label}" template. */
  allOf: string;
};

/**
 * Desktop navigation.
 *
 * Parent items are buttons (not links) that open a panel; the panel's first
 * entry links to the parent category page, so every required destination stays
 * reachable. Keyboard support:
 *   - Tab reaches each trigger and each link
 *   - Enter / Space toggles, ArrowDown opens and moves into the panel
 *   - Escape closes and returns focus to the trigger
 *   - focus leaving the item closes it
 */
export function DesktopNav({
  locale,
  labels,
}: {
  locale: Locale;
  labels: NavLabels;
}) {
  const pathname = usePathname();
  // Links are authored in their Vietnamese-canonical form; strip any prefix
  // before comparing so EN pages still highlight the right item.
  const currentPath = stripLocaleFromPath(pathname ?? "/").path;
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const navOpenRef = useRef(false);
  /** Only a keyboard-triggered open should move focus into the panel. */
  const focusPanelOnOpen = useRef(false);

  const applyOpen = (label: string | null) => {
    setOpenLabel(label);
    const next = label !== null;
    if (next !== navOpenRef.current) {
      navOpenRef.current = next;
      setNavOpen(next);
    }
  };

  useEffect(() => {
    if (!openLabel || !focusPanelOnOpen.current) return;
    focusPanelOnOpen.current = false;

    const label = openLabel;
    let frame = 0;
    let raf = 0;

    const attempt = () => {
      const link = itemRefs.current
        .get(label)
        ?.querySelector<HTMLAnchorElement>("a[data-nav-panel-link]");

      if (link && getComputedStyle(link).visibility !== "hidden") {
        link.focus();
        if (document.activeElement === link) return;
      }
      if (frame++ < 10) raf = requestAnimationFrame(attempt);
    };

    attempt();
    return () => cancelAnimationFrame(raf);
  }, [openLabel]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (navOpenRef.current) {
        navOpenRef.current = false;
        setNavOpen(false);
      }
    };
  }, []);

  const open = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    applyOpen(label);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => applyOpen(null), 140);
  };

  const isActive = (href: string, childHrefs: readonly string[] = []) => {
    if (href === "/") return currentPath === "/";
    return (
      currentPath === href ||
      currentPath.startsWith(`${href}/`) ||
      childHrefs.some(
        (child) => currentPath === child || currentPath.startsWith(`${child}/`),
      )
    );
  };

  const itemClass = (active: boolean, expanded = false) =>
    cn(
      "group/item relative inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2",
      "text-[0.8125rem] font-semibold transition-colors duration-200 hover:bg-primary-soft/70",
      active || expanded
        ? "text-primary-strong"
        : "text-foreground hover:text-primary-strong",
    );

  const underlineClass = (active: boolean) =>
    cn(
      "brand-gradient absolute -bottom-1 left-0 h-0.5 w-full origin-left rounded-full",
      "transition-transform duration-300 ease-out",
      active ? "scale-x-100" : "scale-x-0 group-hover/item:scale-x-100",
    );

  return (
    <nav
      aria-label={labels.header.primaryNavAria}
      className="stt-desktop-nav hidden min-w-0 xl:block"
    >
      <ul className="flex items-center gap-0.5 xl:gap-1">
        {primaryNav.map((item) => {
          const label = labels.nav[item.labelKey];
          const childHrefs = item.children?.map((child) => child.href) ?? [];
          const active = isActive(item.href, childHrefs);
          const allOf = labels.allOf.replace("{label}", label);

          if (!item.children || item.children.length === 0) {
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={localizePath(locale, item.href)}
                  aria-current={active ? "page" : undefined}
                  className={itemClass(active)}
                >
                  <span className="relative">
                    {label}
                    <span
                      aria-hidden="true"
                      className={underlineClass(active)}
                    />
                  </span>
                </Link>
              </li>
            );
          }

          const expanded = openLabel === item.labelKey;

          return (
            <li key={item.href} className="shrink-0">
              <div
                ref={(node) => {
                  if (node) itemRefs.current.set(item.labelKey, node);
                  else itemRefs.current.delete(item.labelKey);
                }}
                className="relative"
                onMouseEnter={() => open(item.labelKey)}
                onMouseLeave={scheduleClose}
                onBlur={(event) => {
                  if (
                    !event.currentTarget.contains(
                      event.relatedTarget as Node | null,
                    )
                  ) {
                    applyOpen(null);
                  }
                }}
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-haspopup="true"
                  onClick={() => applyOpen(expanded ? null : item.labelKey)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusPanelOnOpen.current = true;
                      open(item.labelKey);
                    }
                    if (event.key === "Escape") applyOpen(null);
                  }}
                  data-focus-ring=""
                  className={itemClass(active, expanded)}
                >
                  <span className="relative">
                    {label}
                    <span
                      aria-hidden="true"
                      className={underlineClass(active || expanded)}
                    />
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform duration-300 ease-out",
                      expanded && "rotate-180",
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "absolute left-0 top-[calc(100%+0.65rem)] z-50 w-[19rem] origin-top",
                    "rounded-2xl border border-border bg-surface p-2 shadow-lifted",
                    "transition-[opacity,transform,visibility] duration-200 ease-out",
                    expanded
                      ? "visible translate-y-0 scale-100 opacity-100"
                      : "invisible -translate-y-2 scale-[0.98] opacity-0",
                  )}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      applyOpen(null);
                      itemRefs.current
                        .get(item.labelKey)
                        ?.querySelector<HTMLButtonElement>("button")
                        ?.focus();
                    }
                  }}
                >
                  <Link
                    href={localizePath(locale, item.href)}
                    data-nav-panel-link=""
                    tabIndex={expanded ? 0 : -1}
                    onClick={() => applyOpen(null)}
                    className="group/overview relative block overflow-hidden rounded-xl bg-primary-soft px-3.5 py-3 text-sm font-bold whitespace-nowrap text-primary-strong transition-colors hover:bg-brand-100"
                  >
                    <span className="flex items-center justify-between gap-2">
                      {allOf}
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-brand-400 transition-transform duration-300 group-hover/overview:scale-150"
                      />
                    </span>
                  </Link>

                  {item.descriptionKey ? (
                    <p className="px-3.5 pb-1 pt-2 text-xs text-foreground-muted">
                      {labels.nav.description[item.descriptionKey]}
                    </p>
                  ) : null}

                  <ul className="mt-2 flex flex-wrap gap-2">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={localizePath(locale, child.href)}
                          data-nav-panel-link=""
                          tabIndex={expanded ? 0 : -1}
                          onClick={() => applyOpen(null)}
                          aria-current={
                            currentPath === child.href ? "page" : undefined
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-all duration-200 hover:-translate-y-px",
                            currentPath === child.href
                              ? "border-primary-strong bg-primary-soft text-primary-strong shadow-[0_6px_16px_#e0005a18]"
                              : "border-border-strong bg-surface text-foreground-muted hover:border-primary-strong hover:bg-primary-soft hover:text-primary-strong hover:shadow-[0_6px_16px_#e0005a18]",
                          )}
                        >
                          {labels.nav[child.labelKey]}
                          <span
                            aria-hidden="true"
                            className="text-[11px] leading-none"
                          >
                            ↗
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
