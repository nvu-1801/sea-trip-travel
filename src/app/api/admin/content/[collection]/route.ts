import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import {
  list,
  purgeExpiredTrash,
  save,
  schemas,
  type Collection,
} from "@/server/cms/store";
import { handle, jsonBody, reply } from "@/server/cms/http";
import { defaultSettings } from "@/server/cms/settings";
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
    purgeExpiredTrash();
    const kind = collection((await params).collection);
    const rows = list(kind);
    if (kind !== "settings") return reply(rows);
    // Settings rows created before a field existed still have to render every
    // editor field. Merge defaults under the saved record; the saved value wins.
    return reply(
      rows.map((row) => ({
        ...row,
        data: {
          ...defaultSettings,
          ...row.data,
          contact: {
            ...defaultSettings.contact,
            ...(row.data.contact as object | undefined),
          },
          seo: {
            ...defaultSettings.seo,
            ...(row.data.seo as object | undefined),
          },
        },
      })),
    );
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
