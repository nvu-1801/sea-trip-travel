import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { auditContext } from "@/server/cms/audit";
import { handle, jsonBody, reply } from "@/server/cms/http";
import {
  listRateRulesByRoom,
  rateRulesUpdatedAt,
  saveRateRules,
} from "@/server/hotels/store";

/**
 * `GET/POST /api/admin/hotels/[id]/rates`
 *
 * The whole rule set of a room is saved at once, inside one transaction. The
 * client sends back the `updatedAt` it loaded so a second editor cannot be
 * silently overwritten.
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    const { id } = await params;
    const rules = listRateRulesByRoom(id);
    const updatedAt: Record<string, string | null> = {};
    for (const roomId of Object.keys(rules)) updatedAt[roomId] = rateRulesUpdatedAt(roomId);
    return reply({ hotelId: id, rules, updatedAt });
  });
}

const inputRuleSchema = z.object({
  id: z.string().max(60).optional(),
  kind: z.enum(["base", "weekday", "date_range"]),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  startDate: z.string().max(10).optional(),
  endDate: z.string().max(10).optional(),
  amount: z.number(),
  includesBreakfast: z.boolean().optional(),
  includesTax: z.boolean().optional(),
  feesNote: z.string().max(300).optional(),
  label: z.string().max(80).optional(),
});

const inputSchema = z.object({
  rooms: z
    .array(
      z.object({
        roomId: z.string().regex(/^room_[a-z0-9_]+$/),
        expectedUpdatedAt: z.string().nullable(),
        rules: z.array(inputRuleSchema).max(200),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    const { id } = await params;
    const input = inputSchema.parse(await jsonBody(request, 200_000));
    return reply(
      saveRateRules(
        {
          hotelId: id,
          rooms: input.rooms.map((room) => ({
            roomId: room.roomId,
            expectedUpdatedAt: room.expectedUpdatedAt,
            rules: room.rules.map((rule) => ({
              ...rule,
              id: rule.id ?? "",
              hotelId: id,
              roomId: room.roomId,
              weekdays: rule.weekdays ?? [],
              includesBreakfast: rule.includesBreakfast ?? false,
              includesTax: rule.includesTax ?? false,
            })),
          })),
        },
        auditContext(request),
      ),
    );
  });
}
