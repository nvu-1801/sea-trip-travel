import "server-only";
import { db } from "@/server/cms/db";
import { isBot, normalizePath } from "@/server/analytics/store";
import {
  VITAL_ORDER,
  VITAL_LABELS,
  VITAL_HINTS,
  VITAL_THRESHOLDS,
  VITALS_RETENTION_DAYS,
  percentile75,
  ratingFor,
  type HealthSpeed,
  type HealthSpeedMetric,
  type VitalKey,
} from "@/lib/health";

const METRIC_SET = new Set<string>(VITAL_ORDER);
const MAX_ROWS = 50_000;

export type VitalsInput = {
  path: string;
  device: string;
  navigationType: string;
  userAgent: string;
  metrics: { name: string; value: number }[];
};

/**
 * Anonymous real-user metrics. There is deliberately no visitor id, session id
 * or IP in this table: it only exists to answer “how fast is the site for
 * people”, not “who visited”.
 */
export function recordVitals(input: VitalsInput): number {
  if (isBot(input.userAgent)) return 0;
  const { path } = normalizePath(input.path);
  if (!path || path.startsWith("/admin")) return 0;

  const metrics = input.metrics
    .map((metric) => ({
      name: metric.name.toLowerCase() as VitalKey,
      value: metric.value,
    }))
    .filter(
      (metric) =>
        METRIC_SET.has(metric.name) &&
        Number.isFinite(metric.value) &&
        metric.value >= 0 &&
        metric.value <= 600_000,
    )
    .slice(0, VITAL_ORDER.length);
  if (metrics.length === 0) return 0;

  const now = new Date().toISOString();
  const insert = db().prepare(
    "INSERT INTO web_vitals(metric,value,rating,path,device,navigation_type,created_at) VALUES(?,?,?,?,?,?,?)",
  );
  const device = ["mobile", "tablet", "desktop"].includes(input.device)
    ? input.device
    : "desktop";
  for (const metric of metrics) {
    insert.run(
      metric.name,
      metric.value,
      ratingFor(metric.name, metric.value),
      path.slice(0, 200),
      device,
      input.navigationType.slice(0, 24),
      now,
    );
  }

  // Lazy retention: one in fifty writes trims old rows, so no cron is needed.
  if (Math.random() < 0.02) {
    const cutoff = new Date(
      Date.now() - VITALS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    db().prepare("DELETE FROM web_vitals WHERE created_at<?").run(cutoff);
  }
  return metrics.length;
}

function metricOf(
  key: VitalKey,
  values: number[],
  samples: number,
): HealthSpeedMetric {
  const value = percentile75(values);
  return {
    key,
    label: VITAL_LABELS[key],
    hint: VITAL_HINTS[key],
    unit: VITAL_THRESHOLDS[key].unit,
    value,
    samples,
    status:
      value === null || samples < 3 ? "unknown" : ratingFor(key, value),
  };
}

/** p75 per metric over the selected window plus the slowest LCP pages. */
export function getSpeed(days: number): HealthSpeed {
  const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const rows = db()
    .prepare(
      "SELECT metric,value,path FROM web_vitals WHERE substr(created_at,1,10)>=? ORDER BY id DESC LIMIT ?",
    )
    .all(start, MAX_ROWS) as {
    metric: string;
    value: number;
    path: string;
  }[];

  const byMetric = new Map<string, number[]>();
  const byPath = new Map<string, { values: number[]; samples: number }>();
  for (const row of rows) {
    if (!METRIC_SET.has(row.metric)) continue;
    const list = byMetric.get(row.metric) ?? [];
    list.push(row.value);
    byMetric.set(row.metric, list);
    if (row.metric === "lcp") {
      const entry = byPath.get(row.path) ?? { values: [], samples: 0 };
      entry.values.push(row.value);
      entry.samples += 1;
      byPath.set(row.path, entry);
    }
  }

  const metrics = VITAL_ORDER.map((key) =>
    metricOf(key, byMetric.get(key) ?? [], byMetric.get(key)?.length ?? 0),
  );
  const samples = byMetric.get("lcp")?.length ?? 0;
  const worstPages = [...byPath.entries()]
    .map(([path, entry]) => ({
      path,
      value: percentile75(entry.values) ?? 0,
      samples: entry.samples,
    }))
    .filter((page) => page.samples >= 3)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    days,
    samples,
    hasData: rows.length > 0,
    metrics,
    worstPages,
  };
}
