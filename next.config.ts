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
  // Ship the SQLite database (and the static media index it references) with the
  // server output. On a machine without a database the build creates and seeds
  // `./data`, and the deployed functions must be able to read it back.
  outputFileTracingIncludes: {
    "/**": ["./data/**"],
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
