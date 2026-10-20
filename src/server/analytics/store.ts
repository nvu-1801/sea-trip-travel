import "server-only";
import { db } from "@/server/cms/db";
import { decrypt } from "@/server/cms/leads";

const BOT = /bot|crawl|spider|slurp|headless|python-requests|curl|wget|monitor|uptime|facebookexternalhit|whatsapp|semrush|ahrefs|petalbot/i;

export function isBot(ua: string): boolean {
  return BOT.test(ua);
}

export function normalizePath(raw: string): { path: string; locale: string } {
  const clean = raw.split("?")[0].split("#")[0] || "/";
  const parts = clean.split("/").filter(Boolean);
  let locale = "vi";
  let rest = parts;
  if (parts[0] === "vi" || parts[0] === "en") {
    locale = parts[0];
    rest = parts.slice(1);
  }
  const path = `/${rest.join("/")}`.replace(/\/+$/, "") || "/";
  return { path, locale };
}

export function classifySource(referrer: string): string {
  const host = referrer.toLowerCase();
  if (!host) return "direct";
  if (host.includes("google")) return "google";
  if (host.includes("facebook") || host.includes("fb.")) return "facebook";
  if (host.includes("zalo")) return "zalo";
  if (host.includes("tiktok")) return "tiktok";
  if (host.includes("youtube")) return "youtube";
  if (host.includes("bing") || host.includes("coccoc") || host.includes("duckduckgo"))
    return "search";
  return "referral";
}

export function normalizeReferrer(raw: string): string {
  try {
    if (!raw) return "";
    const url = new URL(raw);
    return url.hostname.toLowerCase().slice(0, 255);
  } catch {
    return raw.toLowerCase().slice(0, 255);
  }
}

export function recordView(input: {
  path: string;
  referrer: string;
  device: string;
  sessionId: string;
  visitorId: string;
  userAgent: string;
}): boolean {
  if (!input.path || input.path.startsWith("/admin")) return false;
  if (isBot(input.userAgent)) return false;
  const { path, locale } = normalizePath(input.path);
  const refHost = normalizeReferrer(input.referrer);
  const source = classifySource(refHost);
  const device = ["mobile", "tablet", "desktop"].includes(input.device)
    ? input.device
    : "desktop";
  db()
    .prepare(
      "INSERT INTO page_views(path,locale,referrer,source,device,session_id,visitor_id,created_at) VALUES(?,?,?,?,?,?,?,?)",
    )
    .run(
      path.slice(0, 300),
      locale,
      refHost,
      source,
      device,
      input.sessionId.slice(0, 80),
      input.visitorId.slice(0, 80),
      new Date().toISOString(),
    );
  return true;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getStats(days = 14) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  const startIso = start.toISOString().slice(0, 10);

  const rows = db()
    .prepare(
      "SELECT path,locale,source,device,session_id,visitor_id,created_at FROM page_views WHERE substr(created_at,1,10)>=? ORDER BY created_at DESC LIMIT 20000",
    )
    .all(startIso) as {
    path: string;
    locale: string;
    source: string;
    device: string;
    session_id: string;
    visitor_id: string;
    created_at: string;
  }[];

  const byDay = new Map<string, { views: number; visitors: Set<string> }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    byDay.set(dayKey(d), { views: 0, visitors: new Set() });
  }
  const top = new Map<string, number>();
  const sources = new Map<string, number>();
  const devices = new Map<string, number>();
  const locales = new Map<string, number>();
  const allVisitors = new Set<string>();
  let todayViews = 0;
  const todayKey = dayKey(now);

  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    const bucket = byDay.get(key);
    const vid = r.visitor_id || r.session_id || `${r.path}-${r.created_at}`;
    if (bucket) {
      bucket.views += 1;
      bucket.visitors.add(vid);
    }
    allVisitors.add(vid);
    if (key === todayKey) todayViews += 1;
    top.set(r.path, (top.get(r.path) ?? 0) + 1);
    sources.set(r.source, (sources.get(r.source) ?? 0) + 1);
    devices.set(r.device, (devices.get(r.device) ?? 0) + 1);
    locales.set(r.locale, (locales.get(r.locale) ?? 0) + 1);
  }

  const trend = [...byDay.entries()].map(([day, v]) => ({
    day,
    label: `${day.slice(8, 10)}/${day.slice(5, 7)}`,
    views: v.views,
    visitors: v.visitors.size,
  }));

  const leads = db()
    .prepare("SELECT status,data,created_at FROM leads ORDER BY created_at DESC LIMIT 500")
    .all() as { status: string; data: string; created_at: string }[];

  const byStatus: Record<string, number> = { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 };
  let pipeline = 0;
  let todayLeads = 0;
  // Ước tính pipeline: nếu lead có interest khớp tour slug thì cộng priceFrom.
  let tours: { slug: string; price: number }[] = [];
  try {
    const recs = db()
      .prepare("SELECT published FROM records WHERE collection='tours' AND published IS NOT NULL AND state!='deleted'")
      .all() as { published: string }[];
    tours = recs.map((r) => {
      try {
        const t = JSON.parse(r.published) as { slug?: string; priceFrom?: { amount?: number } | null };
        return { slug: String(t.slug ?? ""), price: Number(t.priceFrom?.amount ?? 0) };
      } catch {
        return { slug: "", price: 0 };
      }
    });
  } catch {
    tours = [];
  }
  const priceBySlug = new Map(tours.map((t) => [t.slug, t.price]));

  for (const l of leads) {
    if (l.status in byStatus) byStatus[l.status] += 1;
    else byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
    if (l.created_at.slice(0, 10) === todayKey) todayLeads += 1;
    if (l.status === "won" || l.status === "qualified") {
      try {
        // leads.data mã hoá AES-GCM — giải mã để lấy tourSlug/interest.
        const data = decrypt(l.data) as { tourSlug?: string; interest?: string };
        const key = String(data.tourSlug ?? data.interest ?? "");
        pipeline += priceBySlug.get(key) ?? 0;
      } catch {
        // thiếu key mã hoá ở môi trường dev hoặc dữ liệu lạ — bỏ qua.
      }
    }
  }

  const totalViews = rows.length;
  const totalVisitors = allVisitors.size;
  const conversion = totalVisitors > 0 ? Number(((leads.length / totalVisitors) * 100).toFixed(2)) : 0;

  return {
    today: {
      views: todayViews,
      visitors: byDay.get(todayKey)?.visitors.size ?? 0,
      leads: todayLeads,
    },
    totals: {
      views: totalViews,
      visitors: totalVisitors,
      leads: leads.length,
      conversion,
      pipeline,
      byStatus,
    },
    trend,
    topPages: [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, views]) => ({ path, views })),
    sources: [...sources.entries()].map(([name, value]) => ({ name, value })),
    devices: [...devices.entries()].map(([name, value]) => ({ name, value })),
    locales: [...locales.entries()].map(([name, value]) => ({ name, value })),
    recentLeads: leads.slice(0, 6).map((l) => ({ status: l.status, created_at: l.created_at })),
  };
}
