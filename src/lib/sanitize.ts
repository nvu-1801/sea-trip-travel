import { siteConfig } from "@/config/runtime-site";
import { isValidEmailAddress } from "./email-address";

export { isValidEmailAddress };

/**
 * Output-safety helpers.
 *
 * Pure functions, deliberately kept out of `server/` so they can be unit tested
 * without a server-only guard and reused by any future channel (SMS, Zalo,
 * a CRM adapter) that needs the same rules.
 */

/** Escape a value for interpolation into HTML text or a quoted attribute. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build a `tel:` href from a phone number.
 * Strips everything except digits and `+`, then re-validates, so a hostile
 * string cannot smuggle a scheme (`javascript:`, `data:`…) into the attribute.
 */
export function safeTelHref(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (!/^\+?\d{8,15}$/.test(digits)) return null;
  return `tel:${digits}`;
}

/** `mailto:` href only when the address is strictly well formed. */
export function safeMailtoHref(
  email: string | undefined | null,
): string | null {
  if (!isValidEmailAddress(email)) return null;
  // encodeURIComponent leaves no room for a second header or a scheme break-out.
  return `mailto:${encodeURIComponent(email)}`;
}

/**
 * Resolve a site-relative path to an absolute URL on our own origin.
 *
 * Rejects protocol-relative (`//evil`) and any path carrying a scheme, so a
 * customer-supplied `sourcePage` cannot become a link to somewhere else.
 */
export function safeSiteUrl(path: string | undefined | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("\\") || /[\s]/.test(path)) return null;
  try {
    const url = new URL(path, siteConfig.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.origin !== new URL(siteConfig.url).origin) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** True when the value contains characters that would break out of HTML. */
export function containsHtmlMarkup(value: string): boolean {
  return /[<>]/.test(value);
}

/**
 * Defence-in-depth check for a value that is *already* expected to be an
 * absolute same-origin URL (e.g. a value produced earlier by `safeSiteUrl`).
 *
 * Requires an explicit `http(s)://` scheme — a bare relative path is rejected
 * rather than silently resolved, so the caller cannot accidentally treat
 * arbitrary text as a link.
 *
 * The email template re-runs this before emitting an `href`, so the template is
 * safe by construction even if a future caller forgets to validate.
 */
export function isSafeSiteHref(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.origin === new URL(siteConfig.url).origin;
  } catch {
    return false;
  }
}
