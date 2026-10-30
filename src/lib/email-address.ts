/**
 * Minimal email-address validation shared by server and browser code.
 *
 * Kept free of any `siteConfig`/`server-only` import so client components can
 * validate an address without pulling the runtime site configuration (and the
 * CMS) into the browser bundle.
 *
 * One address, no whitespace, no second header, no scheme break-out.
 */
export function isValidEmailAddress(
  email: string | undefined | null,
): email is string {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email);
}
