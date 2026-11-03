import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { auditContext } from "@/server/cms/audit";
import { handle, jsonBody, reply } from "@/server/cms/http";
import { listTourLinks, saveTourLinks } from "@/server/hotels/store";
import { tourRelationSchema } from "@/domain/hotel-pricing";

/**
 * `GET/POST /api/admin/hotels/[id]/tour-links`
 *
 * A relation is an explicit decision: `included` means the tour already pays
 * for the room, so the website must not add it again. Unknown tours and rooms
 * from another hotel are rejected server-side.
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    const { id } = await params;
    return reply({ hotelId: id, links: listTourLinks(id) });
  });
}

const inputSchema = z.object({
  links: z
    .array(
      z.object({
        roomId: z.string().max(60).default(""),
        tourSlug: z.string().min(1).max(120),
        relation: tourRelationSchema,
        condition: z.string().max(300).default(""),
      }),
    )
    .max(40),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    const { id } = await params;
    const input = inputSchema.parse(await jsonBody(request, 40_000));
    return reply(
      saveTourLinks(
        id,
        input.links.map((link) => ({ ...link, hotelId: id })),
        auditContext(request),
      ),
    );
  });
}
