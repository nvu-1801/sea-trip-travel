import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { getStats } from "@/server/analytics/store";
import { getFinanceSummary } from "@/server/cms/finance";
import { financeMonthRange } from "@/domain/tour-finance";
import { handle, reply } from "@/server/cms/http";

export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const url = new URL(request.url);
    const days = z.coerce.number().int().min(7).max(30).catch(14).parse(url.searchParams.get("days"));
    const now = new Date();
    const month = financeMonthRange(
      now.getFullYear(),
      now.getMonth() + 1,
    );
    return reply({
      ...getStats(days),
      finance: getFinanceSummary(month.from, month.to),
    });
  });
}
