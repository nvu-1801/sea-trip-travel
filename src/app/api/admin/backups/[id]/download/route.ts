import { Readable } from "node:stream";
import { z } from "zod";
import { requireSession, verifyAdminPassword } from "@/server/cms/auth";
import { consumeLimit } from "@/server/cms/store";
import { auditFailure, auditRequest } from "@/server/cms/audit";
import { handle, jsonBody, reply } from "@/server/cms/http";
import { findBackup, openArchive } from "@/server/cms/backup";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireSession(request);
    const { id } = await params;
    const { password } = z
      .object({ password: z.string().min(1).max(200) })
      .parse(await jsonBody(request, 4096));
    if (!consumeLimit("backup-download-reauth", 10, 15 * 60 * 1000)) {
      auditFailure(
        request,
        "backup-download",
        id,
        "Quá nhiều lần xác thực tải backup",
      );
      return reply(
        { error: "Quá nhiều lần xác thực. Thử lại sau 15 phút." },
        429,
      );
    }
    if (!verifyAdminPassword(password)) {
      auditFailure(
        request,
        "backup-download",
        id,
        "Mật khẩu xác thực lại không đúng",
      );
      return reply({ error: "Mật khẩu không đúng" }, 400);
    }
    if (!consumeLimit("backup-download", 20, 60 * 60 * 1000)) {
      return reply({ error: "Đã đạt giới hạn tải backup trong giờ" }, 429);
    }
    const manifest = findBackup(id);
    if (!manifest) {
      auditFailure(request, "backup-download", id, "Không tìm thấy backup");
      return reply({ error: "Không tìm thấy bản backup" }, 404);
    }
    const archive = openArchive(id);
    if (!archive) {
      auditFailure(
        request,
        "backup-download",
        id,
        "Archive không đọc được hoặc không hợp lệ",
      );
      return reply({ error: "Không tìm thấy tệp backup" }, 404);
    }
    auditRequest(request, "backup-download", id, {
      details: { kind: manifest.kind, bytes: archive.size },
    });
    const body = Readable.toWeb(archive.stream) as ReadableStream<Uint8Array>;
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "content-length": String(archive.size),
        "content-disposition": `attachment; filename="${id}.seatar"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  });
}
