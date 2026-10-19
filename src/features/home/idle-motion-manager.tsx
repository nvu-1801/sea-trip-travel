"use client";
import { useEffect } from "react";

/**
 * Pauses looping background motion when its section scrolls out of view and
 * when the tab is hidden. Only touches `animation-play-state` on the animated
 * nodes, so the manual pause toggle (`data-motion-paused`), reduced-motion
 * CSS and print rules keep working unchanged. No animation library involved.
 */
const TARGETS = ".stt-idle-waves svg, .stt-hero-bloom, .stt-coastal-lines";

export function IdleMotionManager() {
  useEffect(() => {
    const scopes = Array.from(document.querySelectorAll("[data-idle-scope]"));
    if (!scopes.length) return;
    const visible = new Set<Element>();
    const apply = () => {
      const hidden = document.hidden;
      for (const scope of scopes) {
        const paused = hidden || !visible.has(scope);
        scope.querySelectorAll(TARGETS).forEach((node) => {
          (node as HTMLElement).style.animationPlayState = paused
            ? "paused"
            : "";
        });
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        apply();
      },
      { threshold: 0 },
    );
    for (const scope of scopes) io.observe(scope);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);
  return null;
}
