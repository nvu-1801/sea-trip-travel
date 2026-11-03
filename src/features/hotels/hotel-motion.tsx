"use client";

import { useEffect } from "react";
import { motionAllowed } from "@/lib/motion";

/**
 * Scroll depth for the hotel pages, driven by one rAF loop.
 *
 * CSS scroll timelines (`animation-timeline: view()`) are Chrome-only, and the
 * owner asked for the depth effect to be visible in every browser, so this
 * writes a single progress custom property per marked element and lets the
 * stylesheet turn it into translate/rotate. No React state per frame, no
 * layout reads outside the animation frame, and nothing at all when motion is
 * reduced or paused - the markup then keeps the resting layout.
 *
 * Markup contract: put `data-hotel-depth="1|2|3"` on the elements that should
 * travel, inside the element named by `scope`.
 */
export function HotelDepth({ scope }: { scope: string }) {
  useEffect(() => {
    if (!motionAllowed()) return;
    const root = document.querySelector(scope);
    if (!root) return;

    const items = Array.from(
      root.querySelectorAll<HTMLElement>("[data-hotel-depth]"),
    );
    if (items.length === 0) return;

    let frame = 0;
    let last = -1;

    const update = () => {
      frame = 0;
      if (!motionAllowed()) return;
      const viewport = window.innerHeight || 1;
      const scroll = window.scrollY;
      // The page barely moved since the last frame: nothing to paint.
      if (Math.abs(scroll - last) < 0.5) return;
      last = scroll;

      for (const element of items) {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < -160 || rect.top > viewport + 160) continue;
        const progress = (viewport - rect.top) / (viewport + rect.height);
        element.style.setProperty(
          "--stt-hotel-p",
          Math.min(1, Math.max(0, progress)).toFixed(4),
        );
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    // A preference change while the page is open should stop the loop rather
    // than leave transforms parked mid-travel.
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onPreference = () => {
      if (media.matches) {
        for (const element of items) element.style.removeProperty("--stt-hotel-p");
      } else {
        schedule();
      }
    };
    media.addEventListener("change", onPreference);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", onPreference);
    };
  }, [scope]);

  return null;
}
