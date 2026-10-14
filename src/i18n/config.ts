import { CONTENT_LOCALES, type ContentLocale } from "@/domain/common";

/**
 * Locale configuration — the single source of truth for routing, formatting and
 * SEO. The set of supported languages lives in the domain (`CONTENT_LOCALES`),
 * so a new language is one union entry + one message catalog.
 */

export const locales = CONTENT_LOCALES;
export const defaultLocale: ContentLocale = "vi";

export type Locale = ContentLocale;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "vi" || value === "en";
}

/** Human-facing language names, each written in that language. */
export const localeLabels: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

/** Short uppercase codes for the compact header switch. */
export const localeShortLabels: Record<Locale, string> = {
  vi: "VI",
  en: "EN",
};

export const localeMeta: Record<
  Locale,
  { htmlLang: string; intlTag: string; ogLocale: string }
> = {
  vi: { htmlLang: "vi", intlTag: "vi-VN", ogLocale: "vi_VN" },
  en: { htmlLang: "en", intlTag: "en-US", ogLocale: "en_US" },
};

export function intlTag(locale: Locale): string {
  return localeMeta[locale].intlTag;
}
