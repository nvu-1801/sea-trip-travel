import "server-only";
import { getMessages as original, type Messages } from "./messages";
import { published } from "@/server/cms/store";
import { messageSeeds } from "@/server/cms/settings";
import type { Locale } from "./config";
export { format, plural } from "./messages";
export type { Messages, Plural } from "./messages";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * CMS rows are seeded once. A later release can add a new message key to the
 * JSON catalog while the existing SQLite row still has the old shape — without
 * this merge the UI would read `undefined` for the new key. The CMS value wins
 * for any key it has; the JSON catalog fills the rest.
 */
function mergeCatalog<T>(base: T, override: unknown): T {
  if (!isRecord(base) || !isRecord(override)) {
    return (override === undefined ? base : (override as T));
  }
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] =
      key in merged ? mergeCatalog(merged[key], value) : value;
  }
  return merged as T;
}

export function getMessages(locale: Locale): Messages {
  const base = original(locale);
  const cms = published("messages", messageSeeds).find(
    (item) => item.id === locale,
  );
  return cms ? mergeCatalog(base, cms) : base;
}
