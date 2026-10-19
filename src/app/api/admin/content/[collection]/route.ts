import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { list, save, schemas, type Collection } from "@/server/cms/store";
import { handle, jsonBody, reply } from "@/server/cms/http";
function collection(value: string): Collection {
  if (!Object.hasOwn(schemas, value))
    throw new Error("Nhóm nội dung không tồn tại");
  return value as Collection;
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    return reply(list(collection((await params).collection)));
  });
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    const input = z
      .object({
        data: z.unknown(),
        revision: z.number().int().nonnegative(),
        action: z.enum(["save", "publish", "unpublish", "delete", "restore"]),
      })
      .parse(await jsonBody(request));
    return reply(
      save(
        collection((await params).collection),
        input.data,
        input.revision,
        input.action,
      ),
    );
  });
}
