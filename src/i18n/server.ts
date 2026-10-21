import "server-only";
import { getMessages as original, type Messages } from "./messages";
import { published } from "@/server/cms/store";
import { messageSeeds } from "@/server/cms/settings";
import type { Locale } from "./config";
export { format, plural } from "./messages";
export type { Messages, Plural } from "./messages";
function merge(base: unknown, saved: unknown): unknown {
  if (
    base &&
    saved &&
    typeof base === "object" &&
    typeof saved === "object" &&
    !Array.isArray(base) &&
    !Array.isArray(saved)
  ) {
    const a = base as Record<string, unknown>,
      b = saved as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(a).map((key) => [
        key,
        key in b ? merge(a[key], b[key]) : a[key],
      ]),
    );
  }
  return saved ?? base;
}
export function getMessages(locale: Locale): Messages {
  return merge(
    original(locale),
    published("messages", messageSeeds).find((item) => item.id === locale) ??
      original(locale),
  ) as Messages;
}
