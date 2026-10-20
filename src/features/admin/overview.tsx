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
};

const fmt = new Intl.NumberFormat("vi-VN");
const fmtVND = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

function AreaChart({ data }: { data: Stats["trend"] }) {
  const max = Math.max(1, ...data.map((d) => d.views));
  const W = 560, H = 150, P = 8;
  const pts = data.map((d, i) => {
    const x = P + (i * (W - P * 2)) / Math.max(1, data.length - 1);
    const y = H - P - (d.views / max) * (H - P * 2);
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="adm-chart" role="img" aria-label="Xu hướng lượt xem">
      <defs>
        <linearGradient id="admArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0005a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#e0005a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={P} x2={W - P} y1={H * f} y2={H * f} stroke="#f2dde7" strokeDasharray="4 4" />
      ))}
      <polygon points={`${P},${H - P} ${pts.join(" ")} ${W - P},${H - P}`} fill="url(#admArea)" />
      <polyline points={pts.join(" ")} fill="none" stroke="#e0005a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => {
        const x = P + (i * (W - P * 2)) / Math.max(1, data.length - 1);
        const y = H - P - (d.views / max) * (H - P * 2);
        return <circle key={d.day} cx={x} cy={y} r="3" fill="#e0005a" stroke="#fff" strokeWidth="1.5" />;
      })}
    </svg>
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

  const statusVi: Record<string, string> = { new: "Mới", contacted: "Đã liên hệ", qualified: "Tiềm năng", won: "Đã chốt", lost: "Chưa phù hợp" };

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
          {loading ? "Đang tải…" : "↻ Làm mới"}
        </button>
      </div>

      {error && <div className="adm-notice" role="alert">{error}</div>}

      <div className="adm-kpis">
        {[
          { label: "Lượt xem hôm nay", value: stats?.today.views ?? 0, sub: `Tổng ${days} ngày: ${fmt.format(stats?.totals.views ?? 0)}` },
          { label: "Người vào web hôm nay", value: stats?.today.visitors ?? 0, sub: `Tổng khách: ${fmt.format(stats?.totals.visitors ?? 0)}` },
          { label: "Leads hôm nay", value: stats?.today.leads ?? 0, sub: `Tổng: ${fmt.format(stats?.totals.leads ?? 0)} · Chốt: ${fmt.format(stats?.totals.byStatus.won ?? 0)}` },
          { label: "Tỉ lệ chốt", value: `${stats?.totals.conversion ?? 0}%`, sub: `Pipeline: ${fmtVND.format(stats?.totals.pipeline ?? 0)} ₫`, raw: true },
        ].map((k) => (
          <div key={k.label} className="adm-kpi">
            <span>{k.label}</span>
            <strong>{typeof k.value === "number" ? (loading && !stats ? "—" : fmt.format(k.value)) : k.value}</strong>
            <small>{k.sub}</small>
          </div>
        ))}
      </div>

      <div className="adm-grid-2">
        <section className="adm-panel">
          <h2>Xu hướng truy cập</h2>
          <p>Số lượt xem mỗi ngày (giờ Việt Nam).</p>
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
          <h2>Trang được xem nhiều</h2>
          <p>Top đường dẫn trong {days} ngày.</p>
          {stats ? <Bars data={stats.topPages.map((t) => ({ name: t.path, value: t.views }))} /> : <p className="adm-empty">Đang tải…</p>}
        </section>
      </div>

      <div className="adm-grid-3">
        <section className="adm-panel">
          <h2>Kênh đến</h2>
          {stats ? <Bars data={stats.sources} /> : <p className="adm-empty">Đang tải…</p>}
        </section>
        <section className="adm-panel">
          <h2>Thiết bị</h2>
          {stats ? <Bars data={stats.devices.map((d) => ({ name: d.name === "mobile" ? "Điện thoại" : d.name === "tablet" ? "Máy tính bảng" : "Máy tính", value: d.value }))} /> : <p className="adm-empty">Đang tải…</p>}
        </section>
        <section className="adm-panel">
          <h2>Kinh doanh</h2>
          <ul className="adm-funnel">
            {Object.entries(stats?.totals.byStatus ?? {}).map(([k, v]) => (
              <li key={k}><span>{statusVi[k] ?? k}</span><strong>{fmt.format(v)}</strong></li>
            ))}
          </ul>
          <p><small>Pipeline ước tính từ giá tour của leads Tiềm năng + Đã chốt.</small></p>
        </section>
      </div>
    </div>
  );
}
