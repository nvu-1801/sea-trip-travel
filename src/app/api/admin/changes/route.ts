import { requireSession } from "@/server/cms/auth";
import { handle } from "@/server/cms/http";
import { versionResponse } from "@/server/cms/version-response";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    return versionResponse(request, "admin");
  });
}
