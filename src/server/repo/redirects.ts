import { getDb } from "@/server/db/connection";

/**
 * Slug redirects.
 *
 * Slugs are meant to be immutable. When the owner does rename one, the old slug
 * is remembered here forever and the public page issues a 301 instead of a 404,
 * so inbound links and search rankings survive the change.
 */

export type RedirectEntity = "tour" | "article";

export function findRedirect(entity: RedirectEntity, fromSlug: string): string | undefined {
  const row = getDb()
    .prepare("SELECT to_slug FROM slug_redirect WHERE entity_type = ? AND from_slug = ?")
    .get(entity, fromSlug) as { to_slug: string } | undefined;
  return row?.to_slug;
}

export function listRedirects(): { entity_type: string; from_slug: string; to_slug: string }[] {
  return getDb()
    .prepare("SELECT entity_type, from_slug, to_slug FROM slug_redirect ORDER BY created_at DESC")
    .all() as { entity_type: string; from_slug: string; to_slug: string }[];
}
