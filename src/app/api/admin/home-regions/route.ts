import { requireSession } from "@/server/cms/auth";
import { auditContext, auditFailure } from "@/server/cms/audit";
import { handle, jsonBody, reply } from "@/server/cms/http";
import { saveHomeRegions, list, published } from "@/server/cms/store";

export async function POST(request: Request) {
  return handle(async () => {
    await requireSession(request);
    try {
      return reply(
        saveHomeRegions(await jsonBody(request), auditContext(request)),
      );
    } catch (error) {
      auditFailure(
        request,
        "content-save-failed",
        "landing/regions",
        "Chưa lưu vùng miền. Không có thay đổi nào được áp dụng.",
      );
      throw error;
    }
  });
}

export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const liveIds = new Set(published<{ id: string }>("categories", []).map(row => row.id));
    return reply(list("categories").filter(row => row.state !== "deleted" && liveIds.has(row.id)));
  });
}
