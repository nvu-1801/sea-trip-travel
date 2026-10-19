import { versionResponse } from "@/server/cms/version-response";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return versionResponse(request, "public");
}
