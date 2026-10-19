import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

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
    host: absoluteUrl("/"),
  };
}
