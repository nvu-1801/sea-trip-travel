import { locale as localeParam } from "next/root-params";
import { defaultLocale, isLocale, type Locale } from "./config";
import { getMessages, type Messages } from "./messages";

/**
 * Server-side locale access.
 *
 * `next/root-params` reads the `[locale]` segment from the root layout, so any
 * Server Component or server-side utility can resolve the language without prop
 * drilling. Only importable from Server Components — the import itself fails at
 * build time inside a Client Component.
 */
export async function getLocale(): Promise<Locale> {
  const value = await localeParam();
  return isLocale(value) ? value : defaultLocale;
}

/** Locale + the resolved catalog, in one call. */
export async function getTranslations(): Promise<{ locale: Locale; m: Messages }> {
  const locale = await getLocale();
  return { locale, m: getMessages(locale) };
}
