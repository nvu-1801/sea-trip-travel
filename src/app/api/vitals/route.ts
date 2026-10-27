import { z } from "zod";
import { consumeLimit } from "@/server/cms/store";
import { recordVitals } from "@/server/health/vitals";

/**
 * Anonymous Core Web Vitals beacon.
 *
 * Deliberately tiny and forgiving: analytics must never break a page, so bad
 * payloads and rate-limited clients get the same empty 202 and nothing is
 * logged about the visitor.
 */
export const dynamic = "force-dynamic";

const schema = z.object({
  path: z.string().min(1).max(200),
  device: z.enum(["mobile", "tablet", "desktop"]).catch("desktop"),
  navigationType: z.string().max(24).default(""),
  metrics: z
    .array(
      z.object({
        name: z.enum(["TTFB", "FCP", "LCP", "INP", "CLS"]),
        value: z.number().finite().min(0).max(600_000),
      }),
    )
    .min(1)
    .max(5),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "production")
    return new Response(null, { status: 202 });
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!consumeLimit(`vitals:${ip}`, 30, 60_000))
      return new Response(null, { status: 202 });
    if (Number(request.headers.get("content-length") ?? 0) > 2_000)
      return new Response(null, { status: 202 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return new Response(null, { status: 202 });
    recordVitals({
      ...parsed.data,
      userAgent: request.headers.get("user-agent") ?? "",
    });
  } catch {
    /* A dropped beacon is not a page error. */
  }
  return new Response(null, { status: 202 });
}
