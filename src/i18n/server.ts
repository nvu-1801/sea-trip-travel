import "server-only";
import { getMessages as original, type Messages } from "./messages";
import { published } from "@/server/cms/store";
import { messageSeeds } from "@/server/cms/settings";
import type { Locale } from "./config";
export { format, plural } from "./messages";
export type { Messages, Plural } from "./messages";
export function getMessages(locale: Locale): Messages {
  return (
    published("messages", messageSeeds).find((item) => item.id === locale) ??
    original(locale)
  );
}
