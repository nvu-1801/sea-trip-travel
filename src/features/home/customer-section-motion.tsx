"use client";

import { useEffect } from "react";

/**
 * Pauses the CSS logo rail while the customer section is off screen. The video
 * carousel has its own observer for autoplay; this one covers the rail that is
 * rendered by the server, without adding a second React render loop.
 */
export function CustomerSectionMotion() {
  useEffect(() => {
    const section = document.getElementById("khach-hang");
    if (!section || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        section.dataset.customerInView = entry?.isIntersecting ? "true" : "false";
      },
      { rootMargin: "120px 0px", threshold: 0 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  return null;
}
