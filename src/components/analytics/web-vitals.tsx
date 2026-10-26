"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { deviceOf } from "@/lib/health";

type LatestMetric = { name: string; value: number; navigationType: string };

/**
 * Sends one anonymous Core Web Vitals beacon per page view.
 *
 * Latest value per metric is kept in memory and flushed once when the page is
 * hidden/unloaded, so the health page can show p75 without a request per paint.
 * No visitor id, cookie or IP is sent; the endpoint rejects admin paths and bots.
 */
export function WebVitals() {
  const latest = useRef(new Map<string, LatestMetric>());
  const sent = useRef(false);

  const collect = useCallback((metric: {
    name: string;
    value: number;
    navigationType?: string;
  }) => {
    latest.current.set(metric.name, {
      name: metric.name,
      value: metric.value,
      navigationType: metric.navigationType ?? "",
    });
  }, []);
  useReportWebVitals(collect);

  useEffect(() => {
    const flush = () => {
      if (sent.current) return;
      if (typeof navigator === "undefined" || navigator.webdriver) return;
      const path = window.location.pathname;
      if (path.startsWith("/admin")) return;
      const metrics = [...latest.current.values()]
        .filter((metric) =>
          ["TTFB", "FCP", "LCP", "INP", "CLS"].includes(metric.name),
        )
        .map((metric) => ({ name: metric.name, value: metric.value }));
      if (metrics.length === 0) return;
      sent.current = true;
      const body = JSON.stringify({
        path,
        device: deviceOf(window.innerWidth),
        navigationType:
          latest.current.values().next().value?.navigationType ?? "",
        metrics,
      });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            "/api/vitals",
            new Blob([body], { type: "application/json" }),
          );
        } else {
          void fetch("/api/vitals", {
            method: "POST",
            body,
            keepalive: true,
            headers: { "content-type": "application/json" },
          });
        }
      } catch {
        /* Never let telemetry break the page. */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return null;
}
