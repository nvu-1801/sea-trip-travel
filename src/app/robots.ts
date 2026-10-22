import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Render per request so `SITE_URL` from the runtime environment is used.
 * Building this file statically baked `http://localhost:3000` into the
 * production robots.txt.
 */
export const dynamic = "force-dynamic";

/** robots.txt — everything public is crawlable; the API is not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    // The Yandex `Host` directive is a hostname, not a full URL.
    host: new URL(absoluteUrl("/")).host,
  };
}
