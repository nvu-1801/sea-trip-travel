import "server-only";
import { contentVersion } from "./db";

export function versionResponse(request: Request, scope: "public" | "admin") {
  const version = process.env.CMS_ENABLED === "1" ? contentVersion(scope) : "0";
  const etag = `"${scope}-${version}"`;
  const headers = {
    "cache-control": "private, no-cache, must-revalidate",
    "x-content-type-options": "nosniff",
    etag,
  };
  if (request.headers.get("if-none-match") === etag)
    return new Response(null, { status: 304, headers });
  // No content, record IDs, timestamps, draft details or customer data.
  return Response.json({ version }, { headers });
}
