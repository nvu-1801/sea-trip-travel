import { z } from "zod";
import { requireSession, verifyAdminPassword } from "@/server/cms/auth";
import { consumeLimit } from "@/server/cms/store";
import { auditFailure, auditRequest } from "@/server/cms/audit";
import { handle, jsonBody, reply } from "@/server/cms/http";
import {
  activeManualRun,
  adminUsername,
  backupConfigured,
  listBackupRuns,
  listBackups,
  queueManualBackup,
  readBackupInstallState,
  readBackupState,
} from "@/server/cms/backup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    return reply({
      configured: backupConfigured(),
      install: readBackupInstallState(),
      state: readBackupState(),
      backups: listBackups(30),
      runs: listBackupRuns(30),
      activeRun: activeManualRun(),
      serverTime: new Date().toISOString(),
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    await requireSession(request);
    if (!consumeLimit("backup-reauth", 10, 15 * 60 * 1000)) {
      auditFailure(
        request,
        "backup-create",
        "rate-limit",
        "Quá nhiều lần xác thực lại",
      );
      return reply(
        { error: "Quá nhiều lần xác thực. Thử lại sau 15 phút." },
        429,
      );
    }
    const { password } = z
      .object({ password: z.string().min(1).max(200) })
      .parse(await jsonBody(request, 4096));
    if (!verifyAdminPassword(password)) {
      auditFailure(
        request,
        "backup-create",
        "reauth",
        "Mật khẩu xác thực lại không đúng",
      );
      return reply({ error: "Mật khẩu không đúng" }, 400);
    }
    if (!consumeLimit("backup-create", 3, 60 * 60 * 1000)) {
      auditFailure(
        request,
        "backup-create",
        "rate-limit",
        "Đã đạt giới hạn tạo backup trong giờ",
      );
      return reply(
        { error: "Đã đạt giới hạn 3 bản backup mỗi giờ" },
        429,
      );
    }
    if (!backupConfigured()) {
      return reply(
        {
          error:
            "Chưa cài đặt sao lưu trên máy chủ. Chạy manage.sh install trước.",
          code: "BACKUP_NOT_INSTALLED",
        },
        503,
      );
    }
    const active = activeManualRun();
    if (active) {
      return reply(
        {
          error:
            active.status === "running"
              ? "Một bản backup đang chạy. Đợi hoàn tất rồi thử lại."
              : "Đã có yêu cầu backup đang chờ xử lý.",
          code: "BACKUP_BUSY",
          id: active.id,
        },
        409,
      );
    }
    const { id } = queueManualBackup(adminUsername());
    auditRequest(request, "backup-create", id, {
      details: { kind: "manual" },
    });
    return reply({ id, status: "queued" }, 202);
  });
}
