import { requireSession } from "@/server/cms/auth";
import { handle, reply } from "@/server/cms/http";
import { measureStorage } from "@/server/health/disk";
import type { HealthStorage } from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * Storage figures for the media library, without the SEO audit the health page
 * runs. The bounded disk scan is cached briefly so switching tabs does not
 * rescan the uploads folder every time.
 */
const CACHE_MS = 30_000;
let cached: { at: number; value: HealthStorage } | null = null;

export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const fresh = new URL(request.url).searchParams.get("fresh") === "1";
    if (!fresh && cached && Date.now() - cached.at < CACHE_MS)
      return reply(cached.value);
    const value = await measureStorage();
    cached = { at: Date.now(), value };
    return reply(value);
  });
}
