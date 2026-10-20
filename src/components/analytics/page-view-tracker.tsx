"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function deviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem("st_visit_sid");
    if (!id) {
      id = `s${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      sessionStorage.setItem("st_visit_sid", id);
    }
    return id;
  } catch {
    return "";
  }
}

function getVisitorId(): string {
  try {
    const match = document.cookie.match(/(?:^|; )st_visitor_id=([^;]*)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
    const id = `v${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    document.cookie = `st_visitor_id=${encodeURIComponent(id)}; max-age=31536000; path=/; SameSite=Lax`;
    return id;
  } catch {
    return "";
  }
}

export function PageViewTracker() {
  const pathname = usePathname();
  const last = useRef("");

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (last.current === pathname) return;
    last.current = pathname;
    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer,
      device: deviceType(),
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
    });
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        if (navigator.sendBeacon("/api/track", blob)) return;
      }
      void fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Thống kê không được ảnh hưởng UX.
    }
  }, [pathname]);

  return null;
}
