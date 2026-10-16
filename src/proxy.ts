import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale } from "@/i18n/config";
import { SESSION_COOKIE } from "@/server/auth/cookie-name";

/**
 * Locale routing + the admin gate.
 *
 * Next.js 16 renamed `middleware` to `proxy`. This is the only place the two URL
 * shapes are reconciled:
 *
 *   - `/vi`, `/vi/...`  → pass through (metadata points to unprefixed canonical)
 *   - `/en`, `/en/...`  → passed straight through to the `[locale]` route tree
 *   - anything else     → internal rewrite to `/vi/...` (the URL never changes)
 *
 * Vietnamese keeps the URLs it already had, so nothing indexed moves. The
 * language is never chosen from the browser or IP — only from the URL.
 *
 * `/admin` is not localized and is gated here first: a request without a session
 * cookie is redirected to the login screen before any admin code runs. Middleware
 * only sees that a cookie exists — not whether it is valid — so the layout and
 * every admin page re-verify the session server-side.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never touch API routes, served media or framework internals.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/media")
  ) {
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") return NextResponse.next();
    if (!request.cookies.has(SESSION_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url, 307);
    }
    return NextResponse.next();
  }

  // An internal rewrite can re-enter the proxy at `/vi/...`. Redirecting that
  // path back to `/...` creates a production redirect loop. Accept both forms;
  // page metadata consistently selects the unprefixed Vietnamese canonical.
  if (pathname === `/${defaultLocale}` || pathname.startsWith(`/${defaultLocale}/`)) {
    return NextResponse.next();
  }

  // Already localized (English).
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return NextResponse.next();
  }

  // Vietnamese page requested without a prefix: rewrite into the `[locale]` tree.
  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Run on everything except:
     *  - api                (route handlers are not localized)
     *  - media              (served uploads are not localized)
     *  - _next              (static/image/data)
     *  - metadata + assets  (favicon, sitemap, robots, generated icons, public files)
     *
     * `/admin` is intentionally NOT excluded: the proxy gates it on the session
     * cookie. It is still excluded from the locale rewrite by the branch above.
     */
    "/((?!api|media|_next|favicon.ico|icon.png|apple-icon.png|opengraph-image.png|sitemap.xml|robots.txt|brand/|.*\\..*).*)",
  ],
};
