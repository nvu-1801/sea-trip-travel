"use client";

import { useEffect, useEffectEvent } from "react";

/** Lightweight conditional requests; no session affinity or persistent socket.
 * Keep the old version when a dirty editor defers an update, so it is retried.
 */
export function useContentUpdates({
  enabled,
  url,
  initialVersion,
  onChange,
  onUnauthorized,
}: {
  enabled: boolean;
  url: string;
  initialVersion?: string;
  onChange: () => boolean | Promise<boolean>;
  onUnauthorized?: () => void;
}) {
  const changed = useEffectEvent(onChange);
  const unauthorized = useEffectEvent(() => onUnauthorized?.());

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let pending = false;
    let version = initialVersion;
    let etag: string | null = null;
    let retry = 5000;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;

    async function check() {
      clearTimeout(timer);
      if (stopped || pending || document.hidden || !navigator.onLine) return;
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch(url, {
          cache: "no-store",
          credentials: "same-origin",
          headers: etag ? { "if-none-match": etag } : {},
          signal: controller.signal,
        });
        if (stopped) return;
        if (response.status === 401) {
          stopped = true;
          unauthorized();
          return;
        }
        if (response.status !== 304) {
          if (!response.ok) throw new Error("Version check failed");
          const next: { version: string } = await response.json();
          if (stopped) return;
          if (typeof next.version !== "string")
            throw new Error("Invalid version");
          // Without an SSR baseline (login), take a fresh snapshot before
          // acknowledging the version; a write may race the initial list load.
          if (next.version === version || (await changed())) {
            version = next.version;
            etag = response.headers.get("etag");
          }
        }
        retry = 5000;
      } catch {
        // Offline/server failure keeps the last page and backs off to 60s.
        retry = Math.min(retry * 2, 60000);
      } finally {
        clearTimeout(timeout);
        pending = false;
        if (!stopped && !document.hidden && navigator.onLine)
          timer = setTimeout(check, retry + Math.random() * 500);
      }
    }
    function resume() {
      if (!document.hidden && navigator.onLine) void check();
      else {
        clearTimeout(timer);
        controller?.abort();
      }
    }
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    void check();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", resume);
    };
  }, [enabled, url, initialVersion]);
}
