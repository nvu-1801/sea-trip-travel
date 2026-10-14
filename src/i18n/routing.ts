import { defaultLocale, locales, type Locale } from "./config";

/**
 * URL strategy (as-needed prefixing):
 *   - Vietnamese keeps the existing URLs: `/`, `/lien-he`, `/tour/...`
 *   - English lives under `/en`: `/en`, `/en/lien-he`, `/en/tour/...`
 *
 * `localizePath()` is the ONLY place the prefix is added, so every internal link
 * and every canonical/hreflang value goes through one function.
 */

/** Prefix a site-relative Vietnamese path for `locale`. */
export function localizePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  if (clean === "/") return `/${locale}`;
  return `/${locale}${clean}`;
}

/**
 * Split a pathname into its locale and the Vietnamese-canonical path that
 * follows it. `/en/tour/x` → `{ locale: "en", path: "/tour/x" }`.
 */
export function stripLocaleFromPath(pathname: string): { locale: Locale; path: string } {
  const segments = pathname.split("/");
  const first = segments[1];
  if (first && locales.includes(first as Locale)) {
    const rest = `/${segments.slice(2).join("/")}`;
    return { locale: first as Locale, path: rest === "/" ? "/" : rest.replace(/\/$/, "") || "/" };
  }
  return { locale: defaultLocale, path: pathname || "/" };
}

/**
 * Build the equivalent of the current page in another locale, preserving the
 * query string and (optionally) the hash. Used by the language switch.
 */
export function switchLocalePath(
  target: Locale,
  currentPathname: string,
  search = "",
  hash = "",
): string {
  const { path } = stripLocaleFromPath(currentPathname);
  return `${localizePath(target, path)}${search}${hash}`;
}
