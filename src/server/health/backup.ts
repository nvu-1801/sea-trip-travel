import "server-only";
import { statfs } from "node:fs/promises";
import type { HealthBackup } from "@/lib/health";
import {
  backupConfigured,
  backupRoot,
  listBackups,
  readBackupInstallState,
  readBackupState,
} from "@/server/cms/backup";

const DAY = 24 * 60 * 60 * 1000;

function empty(note: string | null): HealthBackup {
  return {
    configured: false,
    note,
    schedule: null,
    timezone: null,
    count: 0,
    totalBytes: 0,
    retentionKeep: null,
    lastSuccess: null,
    lastAttempt: null,
    lastVerify: null,
    lastRestoreTest: null,
    offsite: { configured: false, status: "not-configured", at: null },
    encryption: false,
    freeBytes: null,
    ageDays: null,
    status: "unknown",
    warnings: [],
  };
}

function ageDays(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  return Math.max(0, Math.round((Date.now() - at) / DAY));
}

/**
 * Backup health is derived from the sanitized state/manifests written by the
 * host tool. The web app never runs commands or reads the archive key.
 */
export async function backupHealth(): Promise<HealthBackup> {
  if (!backupConfigured()) {
    return empty(
      "Chưa cài đặt sao lưu trên máy chủ. Chạy manage.sh install bằng sudo.",
    );
  }
  const install = readBackupInstallState();
  const state = readBackupState();
  const backups = listBackups(200);
  const totalBytes = backups.reduce(
    (sum, entry) => sum + (entry.archive?.bytes ?? 0),
    0,
  );
  const lastSuccess = state?.lastSuccess
    ? {
        id: state.lastSuccess.id,
        kind: state.lastSuccess.kind,
        at: state.lastSuccess.at,
        bytes: state.lastSuccess.bytes ?? null,
      }
    : null;
  const lastAttempt = state?.lastAttempt
    ? {
        id: state.lastAttempt.id,
        kind: state.lastAttempt.kind,
        status: state.lastAttempt.status,
        at: state.lastAttempt.at,
        error: state.lastAttempt.error ?? null,
      }
    : null;
  const lastVerify = state?.lastVerify
    ? {
        id: state.lastVerify.id,
        at: state.lastVerify.at,
        ok: Boolean(state.lastVerify.ok),
      }
    : null;
  const lastRestoreTest = state?.lastRestoreTest
    ? {
        id: state.lastRestoreTest.id,
        at: state.lastRestoreTest.at,
        ok: Boolean(state.lastRestoreTest.ok),
        durationMs: state.lastRestoreTest.durationMs ?? null,
        partial: Boolean(state.lastRestoreTest.partial),
      }
    : null;
  const offsite = {
    configured: Boolean(
      state?.offsite?.configured ?? install?.offsiteConfigured,
    ),
    status: state?.offsite?.status ?? "not-configured",
    at: state?.offsite?.at ?? null,
  };
  const warnings: string[] = [];
  const days = ageDays(lastSuccess?.at);
  let status: HealthBackup["status"] = "good";

  if (!lastSuccess) {
    status = "warn";
    warnings.push("Chưa có bản backup thành công nào.");
  } else if (days !== null && days > 20) {
    status = "bad";
    warnings.push(`Bản thành công gần nhất đã ${days} ngày.`);
  } else if (days !== null && days > 17) {
    status = "warn";
    warnings.push(
      `Bản thành công gần nhất đã ${days} ngày — lịch dự kiến tối đa ~15,5 ngày.`,
    );
  }
  if (lastAttempt?.status === "failed") {
    status = status === "bad" ? "bad" : "warn";
    warnings.push(
      `Lần chạy gần nhất thất bại${lastAttempt.error ? `: ${lastAttempt.error}` : "."}`,
    );
  }
  if (lastVerify && !lastVerify.ok) {
    status = "warn";
    warnings.push("Lần kiểm tra backup gần nhất thất bại.");
  }
  if (lastRestoreTest && !lastRestoreTest.ok) {
    status = "warn";
    warnings.push("Lần thử phục hồi gần nhất thất bại.");
  }
  if (!lastRestoreTest) {
    warnings.push("Chưa chạy restore-test cho bản backup nào.");
  }
  if (!offsite.configured) {
    warnings.push(
      "Chưa cấu hình offsite — backup cùng VPS không bảo vệ khỏi mất ổ đĩa.",
    );
  } else if (offsite.status === "failed") {
    status = "warn";
    warnings.push("Lần sao chép offsite gần nhất thất bại.");
  }
  if (warnings.length > 0 && status === "good") status = "warn";

  const encryption = install?.encryption === "aes-256-gcm";
  const freeBytes = await backupFreeBytes();

  return {
    configured: true,
    note: null,
    schedule: install?.schedule ?? null,
    timezone: install?.timezone ?? null,
    count: backups.length,
    totalBytes,
    retentionKeep: install?.retentionAuto ?? null,
    lastSuccess,
    lastAttempt,
    lastVerify,
    lastRestoreTest,
    offsite,
    encryption,
    freeBytes,
    ageDays: days,
    status,
    warnings,
  };
}

/** Free space on the backup filesystem helps the health card show headroom. */
export async function backupFreeBytes(): Promise<number | null> {
  try {
    const info = await statfs(backupRoot());
    return Math.max(0, Number(info.bavail) * Number(info.bsize));
  } catch {
    return null;
  }
}
