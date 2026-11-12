import { HttpError } from "@/server/cms/auth";
import { handle, jsonBody, reply } from "@/server/cms/http";
import { entrySchema, registerPromotion } from "@/server/cms/promotion-entries";
import { consumeLimit } from "@/server/cms/store";

export function POST(request: Request) {
  return handle(async () => {
    const input = entrySchema.parse(await jsonBody(request, 4096));
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!consumeLimit(`promotion-entry:${ip}`, 12, 15 * 60_000))
      throw new HttpError(429, "Bạn đã gửi nhiều lượt. Vui lòng thử lại sau.");
    return reply(registerPromotion(input));
  });
}
