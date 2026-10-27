/**
 * Shared shapes for the Studio “Sức khỏe website” page.
 *
 * Kept free of server imports so the client component can format the same
 * payload the API returns. Thresholds follow the Core Web Vitals bands.
 */

export type HealthStatus = "good" | "warn" | "bad" | "unknown";

export type VitalKey = "ttfb" | "fcp" | "lcp" | "inp" | "cls";

export const VITAL_ORDER: readonly VitalKey[] = [
  "ttfb",
  "fcp",
  "lcp",
  "inp",
  "cls",
];

export const VITAL_LABELS: Record<VitalKey, string> = {
  ttfb: "TTFB",
  fcp: "FCP",
  lcp: "LCP",
  inp: "INP",
  cls: "CLS",
};

export const VITAL_HINTS: Record<VitalKey, string> = {
  ttfb: "Máy chủ trả byte đầu tiên",
  fcp: "Nội dung đầu tiên hiện ra",
  lcp: "Khối nội dung lớn nhất hiện ra",
  inp: "Độ trễ khi bấm/chạm",
  cls: "Mức xê dịch bố cục",
};

/** `good` = at or below the first number, `warn` = at or below the second. */
export const VITAL_THRESHOLDS: Record<
  VitalKey,
  { good: number; warn: number; unit: "ms" | "score" }
> = {
  ttfb: { good: 800, warn: 1800, unit: "ms" },
  fcp: { good: 1800, warn: 3000, unit: "ms" },
  lcp: { good: 2500, warn: 4000, unit: "ms" },
  inp: { good: 200, warn: 500, unit: "ms" },
  cls: { good: 0.1, warn: 0.25, unit: "score" },
};

export const STORAGE_WARN_PERCENT = 88;
export const STORAGE_BAD_PERCENT = 95;
export const VITALS_RETENTION_DAYS = 90;

/**
 * Budget the Studio reports against instead of the host volume. The VPS disk
 * is far larger than the project needs, so "39% of 96 GB" told the owner
 * nothing useful; 5 GB is the number the site is allowed to grow into.
 */
export const PROJECT_STORAGE_LIMIT_BYTES = 5 * 1024 ** 3;
/** Same 5 GB ceiling for the Node process before the memory card warns. */
export const PROJECT_MEMORY_LIMIT_BYTES = 5 * 1024 ** 3;

/** Unused uploads start showing as a cleanup task after 10 MB. */
export const UNUSED_MEDIA_WARN_BYTES = 10 * 1024 ** 2;

/** Share of a budget already used, clamped to 0–100 for bars and labels. */
export function percentUsed(usedBytes: number, limitBytes: number): number {
  if (!Number.isFinite(usedBytes) || !Number.isFinite(limitBytes) || limitBytes <= 0)
    return 0;
  return Math.max(0, Math.min(100, (usedBytes / limitBytes) * 100));
}

/** Same 88/95 bands as storage, applied to any percentage of a budget. */
export function budgetStatus(percent: number): HealthStatus {
  if (percent >= STORAGE_BAD_PERCENT) return "bad";
  if (percent >= STORAGE_WARN_PERCENT) return "warn";
  return "good";
}

export type HealthStorage = {
  available: boolean;
  note: string | null;
  dataBytes: number;
  databaseBytes: number;
  walBytes: number;
  uploadsBytes: number;
  uploadFiles: number;
  otherBytes: number;
  volumeTotalBytes: number | null;
  volumeFreeBytes: number | null;
  volumeUsedPercent: number | null;
  /**
   * Uploaded files no record references. `null` when the check could not run
   * (the disk scan itself can still be available).
   */
  unusedMedia: {
    count: number;
    bytes: number;
    orphanCount: number;
  } | null;
};

export type HealthSpeedMetric = {
  key: VitalKey;
  label: string;
  hint: string;
  unit: "ms" | "score";
  value: number | null;
  samples: number;
  status: HealthStatus;
};

export type HealthSpeed = {
  days: number;
  samples: number;
  hasData: boolean;
  metrics: HealthSpeedMetric[];
  worstPages: { path: string; value: number; samples: number }[];
};

/** Where the fix lives, so the Studio can group and label findings. */
export type HealthSeoArea = "metadata" | "content" | "technical" | "translation";

export const HEALTH_SEO_AREA_LABELS: Record<HealthSeoArea, string> = {
  metadata: "Thẻ meta",
  content: "Nội dung & liên kết",
  technical: "Kỹ thuật",
  translation: "Bản dịch EN",
};

/** One affected page (or file) behind an issue count. */
export type HealthSeoIssueItem = {
  label: string;
  detail: string | null;
  href: string | null;
  /** Public URL opened in a new tab instead of an in-Studio editor. */
  external?: boolean;
};

export type HealthSeoIssue = {
  id: string;
  area: HealthSeoArea;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  count: number;
  href: string | null;
  /** Affected pages, capped by the audit so the payload stays small. */
  items: HealthSeoIssueItem[];
  /** How many affected pages are not listed in `items`. */
  hidden: number;
};

export type HealthSeo = {
  score: number;
  status: HealthStatus;
  pages: number;
  indexablePages: number;
  sitemapUrls: number | null;
  translation: { reviewed: number; total: number };
  issues: HealthSeoIssue[];
};

export type HealthServer = {
  uptimeSeconds: number;
  nodeVersion: string;
  rssBytes: number;
  heapUsedBytes: number;
  dbLatencyMs: number | null;
};

export type HealthBackup = {
  configured: boolean;
  note: string | null;
  schedule: string | null;
  timezone: string | null;
  count: number;
  totalBytes: number;
  retentionKeep: number | null;
  lastSuccess: {
    id: string;
    kind: string;
    at: string;
    bytes: number | null;
  } | null;
  lastAttempt: {
    id: string;
    kind: string;
    status: string;
    at: string;
    error: string | null;
  } | null;
  lastVerify: { id: string; at: string; ok: boolean } | null;
  lastRestoreTest: {
    id: string;
    at: string;
    ok: boolean;
    durationMs: number | null;
    partial: boolean;
  } | null;
  offsite: { configured: boolean; status: string; at: string | null };
  encryption: boolean;
  freeBytes: number | null;
  ageDays: number | null;
  status: HealthStatus;
  warnings: string[];
};

export type HealthPayload = {
  generatedAt: string;
  server: HealthServer;
  storage: HealthStorage;
  speed: HealthSpeed;
  seo: HealthSeo;
  backup: HealthBackup;
};

const numberFormat = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

export function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0)
    return "—";
  if (value < 1024) return `${Math.round(value)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = value;
  let unit = "B";
  for (const next of units) {
    amount /= 1024;
    unit = next;
    if (amount < 1024) break;
  }
  return `${numberFormat.format(amount)} ${unit}`;
}

export function formatMetricValue(key: VitalKey, value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (VITAL_THRESHOLDS[key].unit === "score")
    return value.toFixed(3).replace(".", ",");
  return `${numberFormat.format(Math.round(value))} ms`;
}

export function ratingFor(key: VitalKey, value: number): HealthStatus {
  const band = VITAL_THRESHOLDS[key];
  if (value <= band.good) return "good";
  if (value <= band.warn) return "warn";
  return "bad";
}

export function statusLabel(status: HealthStatus): string {
  if (status === "good") return "Tốt";
  if (status === "warn") return "Cần cải thiện";
  if (status === "bad") return "Có vấn đề";
  return "Chưa đủ dữ liệu";
}

export function seoStatus(score: number): HealthStatus {
  if (score >= 80) return "good";
  if (score >= 55) return "warn";
  return "bad";
}

/** Nearest-rank 75th percentile, used for the Speed card. */
export function percentile75(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * 0.75) - 1),
  );
  return sorted[index];
}

/** Coarse device bucket, matching `page_views.device`. */
export function deviceOf(width: number): "mobile" | "tablet" | "desktop" {
  if (width <= 640) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}
