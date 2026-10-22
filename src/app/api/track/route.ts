import { z } from "zod";
import { consumeLimit } from "@/server/cms/store";
import { recordView } from "@/server/analytics/store";

const schema = z.object({
  path: z.string().max(300).default("/"),
  referrer: z.string().max(500).default(""),
  device: z.enum(["mobile", "tablet", "desktop"]).default("desktop"),
  sessionId: z.string().max(80).default(""),
  visitorId: z.string().max(80).default(""),
});

export async function POST(request: Request) {
  /**
   * Dev guard.
   *
   * The CMS SQLite file (and its WAL) lives in `data/`, inside the project
   * tree. Turbopack watches that tree, so writing a page view on every load
   * restarts the entry chunk; the HMR restart reloads the page, which writes
   * another view — an endless reload loop. Page views only matter in
   * production, so keep the dev database read-only here.
   */
  if (process.env.NODE_ENV !== "production") {
    return Response.json({ ok: true }, { status: 202 });
  }

  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!consumeLimit(`track:${ip}`, 120, 60_000)) {
      return Response.json({ ok: false }, { status: 202 });
    }
    const body = await request.json().catch(() => ({}));
    const input = schema.safeParse(body);
    if (!input.success) return Response.json({ ok: false }, { status: 202 });
    recordView({
      ...input.data,
      userAgent: request.headers.get("user-agent") ?? "",
    });
    return Response.json({ ok: true }, { status: 202 });
  } catch {
    return Response.json({ ok: false }, { status: 202 });
  }
}
