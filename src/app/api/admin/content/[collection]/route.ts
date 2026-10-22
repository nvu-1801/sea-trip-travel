import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import {
  list,
  purgeExpiredTrash,
  save,
  schemas,
  type Collection,
} from "@/server/cms/store";
import { auditContext, auditFailure } from "@/server/cms/audit";
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
    const name = collection((await params).collection);
    const record =
      input.data && typeof input.data === "object"
        ? (input.data as Record<string, unknown>)
        : null;
    const recordId = record ? String(record.id ?? "") : "";
    const recordTitle = record
      ? String(record.title ?? record.name ?? "").trim().slice(0, 160)
      : "";
    try {
      return reply(
        save(name, input.data, input.revision, input.action, auditContext(request)),
      );
    } catch (error) {
      // Keep validation paths in the server log, not in the owner-facing audit
      // detail. The audit entry records the outcome without technical jargon.
      console.warn(
        `[cms] content save rejected (${name}): ${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
      auditFailure(
        request,
        "content-save-failed",
        recordId ? `${name}/${recordId}` : name,
        "Nội dung chưa được lưu vì không vượt qua kiểm tra dữ liệu.",
        {
          action: input.action,
          ...(recordTitle ? { record: { title: recordTitle } } : {}),
        },
      );
      throw error;
    }
  });
}
