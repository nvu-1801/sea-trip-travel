import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale } from "@/i18n/config";

/**
 * Locale routing.
 *
 * Next.js 16 renamed `middleware` to `proxy`. This is the only place the two URL
 * shapes are reconciled:
 *
 *   - `/vi`, `/vi/...`  → 308 redirect to the canonical Vietnamese URL (`/`, `/...`)
 *   - `/en`, `/en/...`  → passed straight through to the `[locale]` route tree
 *   - anything else     → internal rewrite to `/vi/...` (the URL never changes)
 *
 * Vietnamese keeps the URLs it already had, so nothing indexed moves. The
 * language is never chosen from the browser or IP — only from the URL.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never touch API routes or framework internals (defence in depth on top of
  // the matcher below).
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // `/vi/...` is not a canonical URL: strip it and redirect.
  if (pathname === `/${defaultLocale}` || pathname.startsWith(`/${defaultLocale}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(defaultLocale.length + 1) || "/";
    return NextResponse.redirect(url, 308);
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
     *  - _next              (static/image/data)
     *  - metadata + assets  (favicon, sitemap, robots, generated icons, public files)
     */
    "/((?!api|_next|favicon.ico|icon.png|apple-icon.png|opengraph-image.png|sitemap.xml|robots.txt|brand/|.*\\..*).*)",
  ],
};
