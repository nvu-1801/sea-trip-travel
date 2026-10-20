"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import "./header-shell.css";
import { cn } from "@/lib/utils";
import {
  getNavOpenSnapshot,
  getScrollSnapshot,
  getServerNavSnapshot,
  getServerScrollSnapshot,
  subscribeToNav,
  subscribeToScroll,
} from "./header-state";

/**
 * Sticky header shell with scroll-driven motion.
 *
 * Two effects, both tied to the scroll position:
 *  1. a gradient **scroll progress bar** pinned to the header's bottom edge;
 *  2. the bar **condenses** (row shrinks, background solidifies, shadow grows)
 *     once the page has moved.
 *
 * The header never slides away: it stays visible on every page, like the
 * previous UI. (`scroll.hidden` is still tracked by `header-state` but
 * deliberately not consumed here.)
 *
 * The home hero sits behind a fixed, transparent header. Scrolling reveals its
 * background and keeps navigation visible. Opening a nav panel always keeps
 * the header visible and gives it a solid background.
 *
 * Everything is transform/opacity/height — no layout thrash — and the whole
 * block is disabled under `prefers-reduced-motion` (see globals.css).
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const home = /^\/(?:vi\/?|en\/?)?$/.test(pathname);
  const scroll = useSyncExternalStore(
    subscribeToScroll,
    getScrollSnapshot,
    getServerScrollSnapshot,
  );
  const navOpen = useSyncExternalStore(subscribeToNav, getNavOpenSnapshot, getServerNavSnapshot);

  const hidden = false;
  const solid = scroll.condensed || navOpen;

  return (
    <header
      data-condensed={scroll.condensed}
      data-hidden={hidden}
      data-overlay={home && !solid}
      className={cn(
        "stt-site-header group top-0 z-40 border-b",
        home ? "fixed inset-x-0" : "sticky",
        "transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out",
        solid
          ? "border-border bg-surface/95 backdrop-blur-md shadow-[0_8px_28px_-18px_rgba(122,0,49,0.4)]"
          : "border-transparent bg-transparent",
        hidden ? "-translate-y-full" : "translate-y-0",
      )}
    >
      {children}

      {/* Scroll progress */}
      <div
        aria-hidden="true"
        data-print-hidden=""
        className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-0.5 overflow-hidden"
      >
        <div
          className="brand-gradient h-full w-full origin-left transition-transform duration-100 ease-out"
          style={{ transform: `scaleX(${scroll.progress})` }}
        />
      </div>
    </header>
  );
}
