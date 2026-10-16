import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Uploaded media is served by a route handler under `/media`; Next's image
    // optimiser must be told that path is local and allowed.
    localPatterns: [{ pathname: "/images/**" }, { pathname: "/media/**" }, { pathname: "/brand/**" }],
  },
  // `sharp` is a native module: it must be required at runtime, never bundled.
  // (It also avoids Turbopack trying to link it into `.next/node_modules`.)
  serverExternalPackages: ["sharp"],
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
