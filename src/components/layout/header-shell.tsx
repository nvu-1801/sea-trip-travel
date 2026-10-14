"use client";

import { useSyncExternalStore, type ReactNode } from "react";
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
 * Three effects, all tied to the wheel/touch scroll:
 *  1. a gradient **scroll progress bar** pinned to the header's bottom edge;
 *  2. the bar **condenses** (row shrinks, background solidifies, shadow grows)
 *     once the page has moved;
 *  3. the header **slides away** when the visitor scrolls down past the intro,
 *     and returns immediately on any upward scroll.
 *
 * (3) is suspended while a nav panel is open, so a dropdown can never slide out
 * from under the pointer.
 *
 * Everything is transform/opacity/height — no layout thrash — and the whole
 * block is disabled under `prefers-reduced-motion` (see globals.css).
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const scroll = useSyncExternalStore(
    subscribeToScroll,
    getScrollSnapshot,
    getServerScrollSnapshot,
  );
  const navOpen = useSyncExternalStore(subscribeToNav, getNavOpenSnapshot, getServerNavSnapshot);

  const hidden = scroll.hidden && !navOpen;

  return (
    <header
      data-condensed={scroll.condensed}
      data-hidden={hidden}
      className={cn(
        "group sticky top-0 z-40 border-b backdrop-blur-md",
        "transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out",
        scroll.condensed
          ? "border-border bg-surface/95 shadow-[0_8px_28px_-18px_rgba(122,0,49,0.4)]"
          : "border-transparent bg-surface/80",
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
