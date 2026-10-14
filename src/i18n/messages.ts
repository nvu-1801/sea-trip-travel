import vi from "@/messages/vi.json";
import en from "@/messages/en.json";
import type { Locale } from "./config";

/**
 * UI message catalogs.
 *
 * `vi.json` is the source of truth for the key shape: `en.json` is checked
 * against it by `satisfies`, so a missing or misspelled key fails at build time.
 * Both are imported on the server only — components receive a narrow slice as
 * props when they are Client Components, so the catalog never reaches the browser
 * wholesale.
 */

export type Messages = typeof vi;
export type Plural = { one: string; other: string };

const catalogs = { vi, en } satisfies Record<Locale, Messages>;

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}

/** Replace `{name}` placeholders. Unknown keys are left intact (never `undefined`). */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}

/** Choose the correct plural form, then interpolate. English has 2 forms, Vietnamese 1. */
export function plural(
  value: Plural,
  count: number,
  vars: Record<string, string | number> = {},
): string {
  const form = count === 1 ? value.one : value.other;
  return format(form, { count, ...vars });
}
