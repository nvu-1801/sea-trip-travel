"use client";

import { useEffect } from "react";

/** Keep a fresh document at the top while fonts and streamed content settle. */
export function InitialScroll() {
  useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (location.hash || navigation?.type === "back_forward") return;

    let cancelled = false;
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const stop = () => {
      cancelled = true;
    };
    const reset = () => {
      if (!cancelled && !location.hash) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    events.forEach((event) => window.addEventListener(event, stop, { passive: true }));
    reset();
    window.addEventListener("load", reset, { once: true });
    const finish = () => {
      reset();
      history.scrollRestoration = previousRestoration;
    };
    window.addEventListener("pageshow", finish, { once: true });
    if (document.readyState === "complete") finish();
    void document.fonts.ready.then(reset);
    return () => {
      cancelled = true;
      window.removeEventListener("load", reset);
      window.removeEventListener("pageshow", finish);
      history.scrollRestoration = previousRestoration;
      events.forEach((event) => window.removeEventListener(event, stop));
    };
  }, []);

  return null;
}
