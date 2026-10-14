import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * Read the `[locale]` param and narrow it to a supported locale.
 * Small enough to inline, but shared so every route file does it identically.
 */
export async function resolveLocaleFromParams(
  params: Promise<{ locale: string }>,
): Promise<Locale> {
  const { locale } = await params;
  return isLocale(locale) ? locale : defaultLocale;
}
