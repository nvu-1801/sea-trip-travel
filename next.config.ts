import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.3.15", "127.0.0.1"],
  /* config options here */
  output: "standalone",
  poweredByHeader: false,
  images: {
    qualities: [75, 90],
    // Unversioned local images keep working; only the six replaced customer
    // covers may carry the cache-busting revision. Keep the query in sync with
    // CUSTOMER_VIDEO_COVER_REVISION in src/lib/customer-carousel.ts.
    localPatterns: [
      { pathname: "/**", search: "" },
      {
        pathname: "/images/customers/videos/**",
        search: "?v=2026-11-01",
      },
    ],
  },
  outputFileTracingExcludes: {
    "/*": ["./data/**/*", "./.env*", "./verify-screenshots/**/*", "./*.log"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://www.google.com/maps/embed https://www.google.com/maps/embed/; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`,
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
