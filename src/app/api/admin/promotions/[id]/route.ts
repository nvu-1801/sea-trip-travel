import { requireSession } from "@/server/cms/auth";
import { auditContext } from "@/server/cms/audit";
import { handle, jsonBody, reply } from "@/server/cms/http";
import { z } from "zod";
import { promotionAction, promotionEntries, reconcileLegacyPromotion, updatePromotionEntries } from "@/server/cms/promotion-entries";

type Context = { params: Promise<{ id: string }> };

export function GET(request: Request, { params }: Context) {
  return handle(async () => {
    await requireSession(request);
    return reply(promotionEntries((await params).id));
  });
}

export function POST(request: Request, { params }: Context) {
  return handle(async () => {
    await requireSession(request);
    return reply(updatePromotionEntries((await params).id, promotionAction.parse(await jsonBody(request, 8192)), auditContext(request)));
  });
}

export function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    await requireSession(request);
    const { apply } = z.object({ apply: z.boolean() }).parse(await jsonBody(request, 1024));
    return reply(reconcileLegacyPromotion((await params).id, apply, auditContext(request)));
  });
}
