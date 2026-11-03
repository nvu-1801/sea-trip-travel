import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { auditContext } from "@/server/cms/audit";
import { handle, jsonBody, reply } from "@/server/cms/http";
import { availabilityByRoom, saveAvailability } from "@/server/hotels/store";
import { isoDateSchema } from "@/domain/common";

/**
 * `GET/POST /api/admin/hotels/[id]/availability`
 *
 * One row per room per night. Clearing a date removes the row, which is how
 * "chưa nhập" stays different from "0 phòng".
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    const { id } = await params;
    const query = new URL(request.url).searchParams;
    const from = query.get("from");
    const to = query.get("to");
    const rooms = query.get("rooms");
    const roomIds = (rooms ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^room_[a-z0-9_]+$/.test(value));
    if (roomIds.length === 0) return reply({ hotelId: id, rows: {} });
    const grouped = availabilityByRoom(
      roomIds,
      from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : null,
      to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : null,
    );
    return reply({ hotelId: id, rows: Object.fromEntries(grouped) });
  });
}

const inputSchema = z.object({
  entries: z
    .array(
      z.object({
        roomId: z.string().regex(/^room_[a-z0-9_]+$/),
        date: isoDateSchema,
        rooms: z.number().int().min(0).max(999).nullable(),
        closed: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(4000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    const { id } = await params;
    const input = inputSchema.parse(await jsonBody(request, 400_000));
    return reply(saveAvailability({ hotelId: id, entries: input.entries }, auditContext(request)));
  });
}
