"use client";

import { useSyncExternalStore } from "react";

/**
 * Shared motion gate for the home page's 3D layer.
 *
 * Three independent switches can silence motion: the operating system's
 * `prefers-reduced-motion`, the owner's CMS toggle (mirrored onto
 * `html[data-motion-paused]` by the layout), and a hidden tab. Every JS-driven
 * effect in `src/components/motion` and `src/features/home` asks this module
 * instead of re-implementing the checks, and every CSS-only effect is gated by
 * the same conditions in `src/features/home/home-motion.css`.
 *
 * `useSyncExternalStore` is deliberate: the answer lives in the DOM (a media
 * query, an attribute and the page visibility API), not in React, and the
 * server snapshot is always `false`, so markup is identical on both sides and
 * nothing is hidden before client JavaScript has decided motion is safe.
 */

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

export function motionAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia(REDUCED_QUERY).matches) return false;
  if (document.hidden) return false;
  return document.documentElement.dataset.motionPaused !== "true";
}

/** Fires for OS preference, CMS pause toggle and tab visibility changes. */
export function subscribeMotion(listener: () => void): () => void {
  const media = window.matchMedia(REDUCED_QUERY);
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion-paused"],
  });
  media.addEventListener("change", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

/** `true` only when motion is currently allowed. `false` during SSR. */
export function useMotionAllowed(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    motionAllowed,
    () => false,
  );
}
