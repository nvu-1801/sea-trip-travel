import { NextResponse } from "next/server";
import { connection } from "next/server";
import { readLocalSnapshot } from "@/lib/data/snapshot";
import { contentSourceKind } from "@/server/db/connection";

/**
 * `GET /api/public/content` — the whole published content snapshot.
 *
 * This is the read surface a Vercel-hosted front end consumes when the database
 * lives on the VPS (`CONTENT_SOURCE=remote`). Only published, non-deleted
 * records are ever present in the snapshot.
 *
 * In `remote` mode this app has no database, so the endpoint is disabled rather
 * than returning an empty shell that would look like "no content".
 */
export async function GET(request: Request): Promise<Response> {
  // Request time, not build time. Reading a request header is what guarantees
  // Next treats this handler as dynamic; `connection()` alone was still letting
  // the response be served from a build-time cache.
  await connection();
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  if (contentSourceKind() === "remote") {
    return NextResponse.json(
      { error: "Endpoint chỉ khả dụng trên backend có cơ sở dữ liệu." },
      { status: 404 },
    );
  }

  try {
    // Read straight from the database rather than through the page snapshot
    // cache: a consumer of this endpoint (the Vercel front end) must never be
    // handed a stale snapshot after a publish.
    const snapshot = readLocalSnapshot();
    return NextResponse.json(snapshot, {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "x-content-request": requestId,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error(`[public-content] failed: ${detail}`);
    // Never leak drafts or a half-built snapshot as if it were fresh.
    return NextResponse.json({ error: "Không đọc được nội dung." }, { status: 503 });
  }
}
