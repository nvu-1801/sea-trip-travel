"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { primaryNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "@/components/ui/icons";
import { setNavOpen } from "./header-state";

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
 *
 * Every label is `whitespace-nowrap` and `shrink-0`, so the nav can only ever
 * run out of room — it can never wrap, which is what made the header look broken
 * at ~1280px.
 */
export function DesktopNav() {
  const pathname = usePathname();
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const navOpenRef = useRef(false);

  /**
   * Single funnel for opening/closing so the header's "hold" flag can never get
   * out of sync: opening a panel pins the header in place.
   */
  const applyOpen = (label: string | null) => {
    setOpenLabel(label);
    const next = label !== null;
    if (next !== navOpenRef.current) {
      navOpenRef.current = next;
      setNavOpen(next);
    }
  };

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

  const focusFirstLink = (label: string) => {
    const container = itemRefs.current.get(label);
    const link = container?.querySelector<HTMLAnchorElement>("a[data-nav-panel-link]");
    link?.focus();
  };

  const isActive = (href: string, childHrefs: readonly string[] = []) => {
    if (href === "/") return pathname === "/";
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      childHrefs.some((child) => pathname === child || pathname.startsWith(`${child}/`))
    );
  };

  /** Shared look for every top-level item. */
  const itemClass = (active: boolean, expanded = false) =>
    cn(
      "group/item relative inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5",
      "text-[0.8125rem] font-semibold transition-colors duration-200 xl:px-3.5 xl:text-[0.9375rem]",
      active || expanded
        ? "text-primary-strong"
        : "text-foreground hover:text-primary-strong",
    );

  /** Gradient underline that grows from the left on hover / when active. */
  const underlineClass = (active: boolean) =>
    cn(
      "brand-gradient absolute -bottom-1 left-0 h-0.5 w-full origin-left rounded-full",
      "transition-transform duration-300 ease-out",
      active ? "scale-x-100" : "scale-x-0 group-hover/item:scale-x-100",
    );

  return (
    <nav aria-label="Điều hướng chính" className="hidden min-w-0 lg:block">
      <ul className="flex items-center gap-0.5 xl:gap-1">
        {primaryNav.map((item) => {
          const childHrefs = item.children?.map((child) => child.href) ?? [];
          const active = isActive(item.href, childHrefs);

          if (!item.children || item.children.length === 0) {
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={itemClass(active)}
                >
                  <span className="relative">
                    {item.label}
                    <span aria-hidden="true" className={underlineClass(active)} />
                  </span>
                </Link>
              </li>
            );
          }

          const expanded = openLabel === item.label;

          return (
            <li key={item.href} className="shrink-0">
              <div
                ref={(node) => {
                  if (node) itemRefs.current.set(item.label, node);
                  else itemRefs.current.delete(item.label);
                }}
                className="relative"
                onMouseEnter={() => open(item.label)}
                onMouseLeave={scheduleClose}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    applyOpen(null);
                  }
                }}
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-haspopup="true"
                  onClick={() => applyOpen(expanded ? null : item.label)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      open(item.label);
                      requestAnimationFrame(() => focusFirstLink(item.label));
                    }
                    if (event.key === "Escape") applyOpen(null);
                  }}
                  data-focus-ring=""
                  className={itemClass(active, expanded)}
                >
                  <span className="relative">
                    {item.label}
                    <span aria-hidden="true" className={underlineClass(active || expanded)} />
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
                        .get(item.label)
                        ?.querySelector<HTMLButtonElement>("button")
                        ?.focus();
                    }
                  }}
                >
                  <Link
                    href={item.href}
                    data-nav-panel-link=""
                    tabIndex={expanded ? 0 : -1}
                    onClick={() => applyOpen(null)}
                    className="group/overview relative block overflow-hidden rounded-xl bg-primary-soft px-3.5 py-3 text-sm font-bold whitespace-nowrap text-primary-strong transition-colors hover:bg-brand-100"
                  >
                    <span className="flex items-center justify-between gap-2">
                      Tất cả {item.label}
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-brand-400 transition-transform duration-300 group-hover/overview:scale-150"
                      />
                    </span>
                  </Link>

                  <ul className="mt-1">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          data-nav-panel-link=""
                          tabIndex={expanded ? 0 : -1}
                          onClick={() => applyOpen(null)}
                          aria-current={pathname === child.href ? "page" : undefined}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                            pathname === child.href
                              ? "bg-surface-sunken text-primary-strong"
                              : "text-foreground hover:bg-surface-muted hover:text-primary-strong",
                          )}
                        >
                          {child.label}
                          <span
                            aria-hidden="true"
                            className="h-px w-4 bg-border-strong transition-all duration-300 group-hover:w-6"
                          />
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
