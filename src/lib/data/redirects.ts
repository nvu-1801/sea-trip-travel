import { redirectTarget } from "@/server/cms/store";

/**
 * Locale-less redirect lookup for public pages. Old slugs stay reachable after
 * an editorial rename instead of returning 404 and losing inbound links.
 */
export function contentRedirect(path: string): string | null {
  // Seed-only builds (CI, CMS_ENABLED=0) have no redirect table and must not
  // create a database just to answer a 404.
  if (process.env.CMS_ENABLED !== "1") return null;
  return redirectTarget(path);
}
