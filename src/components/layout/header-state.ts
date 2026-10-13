"use client";

/**
 * Header state stores.
 *
 * Both are read with `useSyncExternalStore` rather than `useEffect` +
 * `useState`: the scroll position and "is a nav panel open" are genuinely
 * external state, and this avoids cascading renders on mount plus the
 * `react-hooks/set-state-in-effect` rule.
 *
 * Scroll progress is quantised to 1% and the whole snapshot is cached behind a
 * string key, so `getSnapshot` returns a referentially stable object between
 * meaningful changes. That is required — a fresh object every call would loop.
 */

export type HeaderScrollState = {
  /** 0–1, quantised to 1%. Drives the scroll progress bar. */
  progress: number;
  /** Past the first few pixels: solidify the background and add elevation. */
  condensed: boolean;
  /** Scrolling down past the intro: slide the header out of the way. */
  hidden: boolean;
};

const SERVER_SCROLL_STATE: HeaderScrollState = {
  progress: 0,
  condensed: false,
  hidden: false,
};

/** Ignore sub-pixel and rubber-band jitter when detecting direction. */
const DIRECTION_EPSILON = 8;
/** Only hide once the visitor is committed to reading, never in the intro. */
const HIDE_AFTER_Y = 720;

let lastY = 0;
let lastDirection: "up" | "down" = "up";
let scrollKey = "";
let scrollValue: HeaderScrollState = SERVER_SCROLL_STATE;

function readScrollState(): HeaderScrollState {
  const doc = document.documentElement;
  const y = Math.max(0, window.scrollY);
  const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
  const progress = Math.round(Math.min(1, y / maxScroll) * 100) / 100;

  if (Math.abs(y - lastY) > DIRECTION_EPSILON) {
    lastDirection = y > lastY ? "down" : "up";
    lastY = y;
  }

  const condensed = y > 10;
  const hidden = lastDirection === "down" && y > HIDE_AFTER_Y;

  const key = `${progress}|${condensed}|${hidden}`;
  if (key !== scrollKey) {
    scrollKey = key;
    scrollValue = { progress, condensed, hidden };
  }
  return scrollValue;
}

export function subscribeToScroll(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange, { passive: true });
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

export function getScrollSnapshot(): HeaderScrollState {
  return readScrollState();
}

export function getServerScrollSnapshot(): HeaderScrollState {
  return SERVER_SCROLL_STATE;
}

/* -------------------------------------------------------------------------- */
/* Nav-open store                                                             */
/* -------------------------------------------------------------------------- */

let openPanels = 0;
const navListeners = new Set<() => void>();

/**
 * Reference-counted so two open panels (never happens today, but cheap to
 * guarantee) cannot leave the header permanently pinned.
 */
export function setNavOpen(open: boolean): void {
  const next = open ? openPanels + 1 : Math.max(0, openPanels - 1);
  if (next === openPanels) return;
  openPanels = next;
  for (const listener of navListeners) listener();
}

export function subscribeToNav(onChange: () => void): () => void {
  navListeners.add(onChange);
  return () => {
    navListeners.delete(onChange);
  };
}

export function getNavOpenSnapshot(): boolean {
  return openPanels > 0;
}

export function getServerNavSnapshot(): boolean {
  return false;
}
