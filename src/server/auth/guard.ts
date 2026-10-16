import "server-only";

/**
 * CSRF defence for state-changing route handlers.
 *
 * The admin session lives in a cookie, so a mutating request must prove it came
 * from our own origin. `SameSite=Lax` already blocks cross-site POSTs in modern
 * browsers; this is the server-side belt to that braces — it also covers
 * non-browser clients that ignore SameSite. Server Actions have their own
 * built-in origin check and do not need this.
 */

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!host) return false;

  // `Sec-Fetch-Site` is the strongest signal when present.
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;

  if (!origin) {
    // No Origin header: allow only when the fetch metadata says same-origin/none.
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
