import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { handle, reply } from "@/server/cms/http";
import { healthReport } from "@/server/health/report";

export const dynamic = "force-dynamic";

const daysSchema = z.coerce
  .number()
  .int()
  .refine((value) => value === 7 || value === 28, "Khoảng thời gian không hợp lệ")
  .catch(7);

export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const days = daysSchema.parse(new URL(request.url).searchParams.get("days"));
    return reply(await healthReport(days));
  });
}
