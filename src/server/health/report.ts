import "server-only";
import { db } from "@/server/cms/db";
import {
  VITAL_HINTS,
  VITAL_LABELS,
  VITAL_ORDER,
  VITAL_THRESHOLDS,
  type HealthBackup,
  type HealthPayload,
  type HealthSeo,
  type HealthSpeed,
  type HealthStorage,
} from "@/lib/health";
import { measureStorage } from "./disk";
import { mediaUsage } from "@/server/media/usage";
import { auditSeo } from "./seo";
import { getSpeed } from "./vitals";
import { backupHealth } from "./backup";

const CACHE_MS = 60_000;
const cache = new Map<
  number,
  { at: number; value: HealthPayload }
>();

const emptyStorage: HealthStorage = {
  available: false,
  note: "Không đọc được dung lượng lúc này.",
  dataBytes: 0,
  databaseBytes: 0,
  walBytes: 0,
  uploadsBytes: 0,
  uploadFiles: 0,
  otherBytes: 0,
  volumeTotalBytes: null,
  volumeFreeBytes: null,
  volumeUsedPercent: null,
  unusedMedia: null,
};

function emptyBackup(note: string): HealthBackup {
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

function emptySpeed(days: number): HealthSpeed {
  return {
    days,
    samples: 0,
    hasData: false,
    metrics: VITAL_ORDER.map((key) => ({
      key,
      label: VITAL_LABELS[key],
      hint: VITAL_HINTS[key],
      unit: VITAL_THRESHOLDS[key].unit,
      value: null,
      samples: 0,
      status: "unknown",
    })),
    worstPages: [],
  };
}

function failedSeo(): HealthSeo {
  return {
    score: 0,
    status: "bad",
    pages: 0,
    indexablePages: 0,
    sitemapUrls: null,
    translation: { reviewed: 0, total: 0 },
    issues: [
      {
        id: "audit-failed",
        area: "technical",
        severity: "high",
        title: "Không chạy được kiểm tra SEO",
        detail: "Nội dung published chưa đọc được. Thử làm mới sau ít phút.",
        count: 1,
        href: null,
        items: [],
        hidden: 0,
      },
    ],
  };
}

function dbLatency(): number | null {
  if (process.env.CMS_ENABLED !== "1") return null;
  try {
    const started = performance.now();
    db().prepare("SELECT 1").get();
    return Math.round((performance.now() - started) * 10) / 10;
  } catch {
    return null;
  }
}

async function safe<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch {
    return fallback;
  }
}

function safeSync<T>(operation: () => T, fallback: T): T {
  try {
    return operation();
  } catch {
    return fallback;
  }
}

/** One payload for the Studio health page; cached briefly to spare the disk scan. */
export async function healthReport(days = 7): Promise<HealthPayload> {
  const cached = cache.get(days);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const [storage, speed, backup, media] = await Promise.all([
    safe(() => measureStorage(), emptyStorage),
    safe(async () => getSpeed(days), emptySpeed(days)),
    safe(
      () => backupHealth(),
      emptyBackup("Không đọc được trạng thái sao lưu."),
    ),
    safe(() => mediaUsage(), null),
  ]);
  const seo = safeSync(() => auditSeo(), failedSeo());
  const memory = process.memoryUsage();

  const value: HealthPayload = {
    generatedAt: new Date().toISOString(),
    server: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      dbLatencyMs: dbLatency(),
    },
    storage: media
      ? {
          ...storage,
          unusedMedia: {
            count: media.unusedNames.length + media.orphanNames.length,
            bytes: media.unusedBytes,
            orphanCount: media.orphanNames.length,
          },
        }
      : storage,
    speed,
    seo,
    backup,
  };
  cache.set(days, { at: Date.now(), value });
  return value;
}
