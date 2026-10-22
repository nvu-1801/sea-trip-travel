"use client";

import { useEffect, useState } from "react";

type Stats = {
  today: { views: number; visitors: number; leads: number };
  totals: {
    views: number;
    visitors: number;
    leads: number;
    conversion: number;
    pipeline: number;
    byStatus: Record<string, number>;
  };
  trend: { day: string; label: string; views: number; visitors: number }[];
  topPages: { path: string; views: number }[];
  sources: { name: string; value: number }[];
  devices: { name: string; value: number }[];
  locales: { name: string; value: number }[];
  recentLeads?: { status: string; created_at: string }[];
};

const fmt = new Intl.NumberFormat("vi-VN");
const fmtVND = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

const PALETTE = ["#e0005a", "#2fbf9b", "#f59e0b", "#8b5cf6", "#2e90fa", "#ff7a3d", "#98a2b3"];
const STATUS_COLORS: Record<string, string> = {
  new: "#2e90fa",
  contacted: "#e8a13d",
  qualified: "#9b5cf6",
  won: "#12a56b",
  lost: "#98a2b3",
};
const STATUS_VI: Record<string, string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  qualified: "Tiềm năng",
  won: "Đã chốt",
  lost: "Chưa phù hợp",
};
const SOURCE_VI: Record<string, string> = {
  direct: "Trực tiếp",
  google: "Google",
  facebook: "Facebook",
  zalo: "Zalo",
  tiktok: "TikTok",
  youtube: "YouTube",
  search: "Tìm kiếm khác",
  referral: "Giới thiệu",
};
const LOCALE_VI: Record<string, string> = { vi: "Tiếng Việt", en: "English" };

function pct(part: number, total: number): string {
  if (total <= 0) return "0%";
  const v = (part / total) * 100;
  return `${v >= 99.5 ? Math.round(v) : v.toFixed(1)}%`;
}

/** Biểu đồ đường kép: lượt xem + người vào web theo ngày. */
function AreaChart({ data }: { data: Stats["trend"] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.views, d.visitors)));
  const W = 560, H = 170, P = 10;
  const x = (i: number) => P + (i * (W - P * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - P * 2);
  const pts = (get: (d: Stats["trend"][number]) => number) =>
    data.map((d, i) => `${x(i)},${y(get(d))}`).join(" ");
  return (
    <div>
      <div className="adm-chart-legend">
        <span><i style={{ background: "#e0005a" }} />Lượt xem</span>
        <span><i style={{ background: "#0e7a5f" }} />Người vào web</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="adm-chart" role="img" aria-label="Xu hướng lượt xem và người vào web">
        <defs>
          <linearGradient id="admArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0005a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#e0005a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={P} x2={W - P} y1={H * f} y2={H * f} stroke="#f2dde7" strokeDasharray="4 4" />
        ))}
        <polygon points={`${P},${H - P} ${pts((d) => d.views)} ${W - P},${H - P}`} fill="url(#admArea)" />
        <polyline points={pts((d) => d.visitors)} fill="none" stroke="#0e7a5f" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1 0" opacity="0.9" />
        <polyline points={pts((d) => d.views)} fill="none" stroke="#e0005a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={d.day} cx={x(i)} cy={y(d.views)} r="3" fill="#e0005a" stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

/** Sparkline nhỏ trong thẻ KPI. */
function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  const W = 140, H = 36, P = 3;
  const max = Math.max(1, ...values);
  const pts = values
    .map((v, i) => `${P + (i * (W - P * 2)) / Math.max(1, values.length - 1)},${H - P - (v / max) * (H - P * 2)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="adm-spark" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Biểu đồ tròn donut + chú thích tỉ lệ. */
function Donut({
  data,
  labelOf,
  colorOf,
}: {
  data: { name: string; value: number }[];
  labelOf?: (name: string) => string;
  colorOf?: (name: string, i: number) => string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 54;
  const C = 2 * Math.PI * R;
  const fracs = data.map((d) => (total > 0 ? d.value / total : 0));
  const starts = fracs.map((_, i) => fracs.slice(0, i).reduce((s, f) => s + f, 0));
  const segs = data.map((d, i) => ({
    ...d,
    dash: fracs[i] * C,
    offset: starts[i] * C,
    color: colorOf ? colorOf(d.name, i) : PALETTE[i % PALETTE.length],
  }));
  return (
    <div className="adm-donut-wrap">
      <svg viewBox="0 0 140 140" className="adm-donut" role="img" aria-label="Biểu đồ tròn">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#fdf0f5" strokeWidth="18" />
        {segs.map((s) => (
          <circle
            key={s.name}
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="18"
            strokeDasharray={`${s.dash} ${C - s.dash}`}
            strokeDashoffset={-s.offset + C * 0.25}
            strokeLinecap="butt"
          />
        ))}
        <text x="70" y="66" textAnchor="middle" className="adm-donut-total">{total > 999 ? `${(total / 1000).toFixed(1)}k` : fmt.format(total)}</text>
        <text x="70" y="84" textAnchor="middle" className="adm-donut-sub">tổng</text>
      </svg>
      <ul className="adm-donut-legend">
        {segs.map((s) => (
          <li key={s.name}>
            <i style={{ background: s.color }} />
            <span>{labelOf ? labelOf(s.name) : s.name}</span>
            <strong>{fmt.format(s.value)}</strong>
            <small>{pct(s.value, total)}</small>
          </li>
        ))}
        {segs.length === 0 && <li>Chưa có dữ liệu.</li>}
      </ul>
    </div>
  );
}

function Bars({ data }: { data: { name: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="adm-bars">
      {data.map((d) => (
        <div key={d.name} className="adm-bar-row">
          <span>{d.name}</span>
          <div className="adm-bar-track">
            <div className="adm-bar-fill" style={{ width: `${Math.max(4, (d.value / max) * 100)}%` }} />
          </div>
          <strong>{fmt.format(d.value)}</strong>
        </div>
      ))}
      {!data.length && <p className="adm-empty">Chưa có dữ liệu.</p>}
    </div>
  );
}

/** Top trang dạng bảng xếp hạng. */
function RankedPages({ data }: { data: { path: string; views: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.views));
  return (
    <ol className="adm-rank">
      {data.map((d, i) => (
        <li key={d.path}>
          <span className="adm-rank-num" data-top={i < 3}>{i + 1}</span>
          <span className="adm-rank-path">{d.path}</span>
          <span className="adm-rank-track">
            <span style={{ width: `${Math.max(5, (d.views / max) * 100)}%` }} />
          </span>
          <strong>{fmt.format(d.views)}</strong>
        </li>
      ))}
      {data.length === 0 && <li>Chưa có dữ liệu.</li>}
    </ol>
  );
}

/** Phễu chuyển đổi tổng: xem → người → leads → chốt. */
function FunnelDiagram({ stages }: { stages: { label: string; value: number; hint: string }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <div className="adm-funnel-diagram">
      {stages.map((s, i) => {
        const prev = i === 0 ? null : stages[i - 1];
        const conv = prev && prev.value > 0 ? pct(s.value, prev.value) : null;
        return (
          <div key={s.label}>
            {conv && <p className="adm-funnel-conv">▼ {conv} chuyển tiếp</p>}
            <div className="adm-funnel-stage">
              <span className="adm-funnel-label">{s.label}</span>
              <span className="adm-funnel-track">
                <span style={{ width: `${Math.max(8, (s.value / max) * 100)}%` }} />
              </span>
              <strong>{fmt.format(s.value)}</strong>
            </div>
            <p className="adm-funnel-hint">{s.hint}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Thanh stacked tỉ lệ trạng thái leads. */
function StatusStack({ byStatus }: { byStatus: Record<string, number> }) {
  const order = ["new", "contacted", "qualified", "won", "lost"];
  const total = order.reduce((s, k) => s + (byStatus[k] ?? 0), 0);
  return (
    <div>
      <div className="adm-stack" role="img" aria-label="Tỉ lệ trạng thái yêu cầu">
        {order.map((k) => {
          const v = byStatus[k] ?? 0;
          if (v <= 0 || total <= 0) return null;
          return <span key={k} style={{ width: `${(v / total) * 100}%`, background: STATUS_COLORS[k] }} title={`${STATUS_VI[k]}: ${v}`} />;
        })}
        {total <= 0 && <span className="adm-stack-empty">Chưa có yêu cầu</span>}
      </div>
      <ul className="adm-stack-legend">
        {order.map((k) => (
          <li key={k}>
            <i style={{ background: STATUS_COLORS[k] }} />
            <span>{STATUS_VI[k]}</span>
            <strong>{fmt.format(byStatus[k] ?? 0)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Overview({ csrf }: { csrf: string }) {
  const [days, setDays] = useState(14);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/stats?days=${days}`, { headers: { "x-csrf-token": csrf } })
      .then(async (r) => {
        if (!r.ok) throw new Error("Không tải được thống kê");
        return r.json();
      })
      .then((json) => { if (alive) { setStats(json); setError(""); } })
      .catch((e) => { if (alive) setError(String(e.message ?? e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days, csrf]);

  function changeDays(next: number) {
    if (next === days) return;
    setLoading(true);
    setDays(next);
  }

  const trend = stats?.trend ?? [];
  const byStatus = stats?.totals.byStatus ?? {};

  return (
    <div className="adm-overview">
      <div className="adm-toolbar">
        <div className="adm-period" role="group" aria-label="Khoảng thời gian">
          {[7, 14, 30].map((d) => (
            <button key={d} type="button" aria-pressed={days === d} data-active={days === d} onClick={() => changeDays(d)}>
              {d} ngày
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            fetch(`/api/admin/stats?days=${days}`, { headers: { "x-csrf-token": csrf } })
              .then((r) => r.json())
              .then(setStats)
              .finally(() => setLoading(false));
          }}
        >
          {loading ? "Đang tải…" : "Làm mới"}
        </button>
      </div>

      {error && <div className="adm-notice" role="alert">{error}</div>}

      <div className="adm-kpis">
        <div className="adm-kpi">
          <span>Lượt xem hôm nay</span>
          <strong>{loading && !stats ? "—" : fmt.format(stats?.today.views ?? 0)}</strong>
          <Sparkline values={trend.map((t) => t.views)} stroke="#e0005a" />
          <small>Tổng {days} ngày: {fmt.format(stats?.totals.views ?? 0)}</small>
        </div>
        <div className="adm-kpi">
          <span>Người vào web hôm nay</span>
          <strong>{loading && !stats ? "—" : fmt.format(stats?.today.visitors ?? 0)}</strong>
          <Sparkline values={trend.map((t) => t.visitors)} stroke="#0e7a5f" />
          <small>Tổng khách: {fmt.format(stats?.totals.visitors ?? 0)}</small>
        </div>
        <div className="adm-kpi">
          <span>Leads hôm nay</span>
          <strong>{loading && !stats ? "—" : fmt.format(stats?.today.leads ?? 0)}</strong>
          <StatusStack byStatus={byStatus} />
          <small>Tổng: {fmt.format(stats?.totals.leads ?? 0)} · Chốt: {fmt.format(byStatus.won ?? 0)}</small>
        </div>
        <div className="adm-kpi">
          <span>Tỉ lệ chốt</span>
          <strong>{`${stats?.totals.conversion ?? 0}%`}</strong>
          <div className="adm-gauge" role="img" aria-label={`Tỉ lệ chốt ${stats?.totals.conversion ?? 0} phần trăm`}>
            <span style={{ width: `${Math.min(100, (stats?.totals.conversion ?? 0) * 10)}%` }} />
          </div>
          <small>Pipeline: {fmtVND.format(stats?.totals.pipeline ?? 0)} ₫</small>
        </div>
      </div>

      <div className="adm-grid-2">
        <section className="adm-panel">
          <h2>Xu hướng truy cập</h2>
          <p>Số lượt xem và người vào web mỗi ngày (giờ Việt Nam).</p>
          {stats ? <AreaChart data={stats.trend} /> : <p className="adm-empty">Đang tải…</p>}
          {stats && (
            <div className="adm-trend-labels">
              {stats.trend.filter((_, i, a) => i % Math.ceil(a.length / 7) === 0).map((d) => (
                <span key={d.day}>{d.label}</span>
              ))}
            </div>
          )}
        </section>
        <section className="adm-panel">
          <h2>Phễu chuyển đổi</h2>
          <p>Từ lượt xem đến chốt đơn trong {days} ngày.</p>
          {stats ? (
            <FunnelDiagram
              stages={[
                { label: "Lượt xem", value: stats.totals.views, hint: "Mọi lượt tải trang (đã lọc bot)" },
                { label: "Người vào web", value: stats.totals.visitors, hint: "Khách khác nhau theo thiết bị" },
                { label: "Yêu cầu tư vấn", value: stats.totals.leads, hint: "Form gửi thành công" },
                { label: "Đã chốt", value: byStatus.won ?? 0, hint: "Leads chuyển thành đơn" },
              ]}
            />
          ) : <p className="adm-empty">Đang tải…</p>}
        </section>
      </div>

      <div className="adm-grid-2">
        <section className="adm-panel">
          <h2>Trang được xem nhiều</h2>
          <p>Top đường dẫn trong {days} ngày.</p>
          {stats ? <RankedPages data={stats.topPages} /> : <p className="adm-empty">Đang tải…</p>}
        </section>
        <section className="adm-panel">
          <h2>Yêu cầu mới nhất</h2>
          <p>6 yêu cầu gần đây theo thời gian.</p>
          {stats?.recentLeads?.length ? (
            <ol className="adm-timeline">
              {stats.recentLeads.map((l, i) => (
                <li key={`${l.created_at}-${i}`}>
                  <i style={{ background: STATUS_COLORS[l.status] ?? "#98a2b3" }} />
                  <span className="adm-timeline-status">{STATUS_VI[l.status] ?? l.status}</span>
                  <time>{new Date(l.created_at).toLocaleString("vi-VN")}</time>
                </li>
              ))}
            </ol>
          ) : <p className="adm-empty">Chưa có yêu cầu nào.</p>}
        </section>
      </div>

      <div className="adm-grid-3">
        <section className="adm-panel">
          <h2>Kênh đến</h2>
          <p>Khách biết tới web từ đâu.</p>
          {stats ? <Donut data={stats.sources} labelOf={(n) => SOURCE_VI[n] ?? n} /> : <p className="adm-empty">Đang tải…</p>}
        </section>
        <section className="adm-panel">
          <h2>Thiết bị</h2>
          <p>Tỉ lệ điện thoại / máy tính.</p>
          {stats ? (
            <Donut
              data={stats.devices.map((d) => ({
                name: d.name === "mobile" ? "Điện thoại" : d.name === "tablet" ? "Máy tính bảng" : "Máy tính",
                value: d.value,
              }))}
            />
          ) : <p className="adm-empty">Đang tải…</p>}
        </section>
        <section className="adm-panel">
          <h2>Ngôn ngữ</h2>
          <p>Tỉ lệ khách Việt / Anh.</p>
          {stats ? <Donut data={stats.locales} labelOf={(n) => LOCALE_VI[n] ?? n} /> : <p className="adm-empty">Đang tải…</p>}
        </section>
      </div>

      <div className="adm-grid-2">
        <section className="adm-panel">
          <h2>Pipeline chăm sóc</h2>
          <p>Số yêu cầu theo từng trạng thái (500 yêu cầu gần nhất).</p>
          {stats ? <Bars data={["new", "contacted", "qualified", "won", "lost"].map((k) => ({ name: STATUS_VI[k], value: byStatus[k] ?? 0 }))} /> : <p className="adm-empty">Đang tải…</p>}
        </section>
        <section className="adm-panel">
          <h2>Kinh doanh</h2>
          <ul className="adm-funnel">
            {Object.entries(byStatus).map(([k, v]) => (
              <li key={k}><span><i className="adm-dot" style={{ background: STATUS_COLORS[k] ?? "#98a2b3" }} />{STATUS_VI[k] ?? k}</span><strong>{fmt.format(v)}</strong></li>
            ))}
          </ul>
          <p><small>Pipeline ước tính từ giá tour của leads Tiềm năng + Đã chốt.</small></p>
        </section>
      </div>
    </div>
  );
}
