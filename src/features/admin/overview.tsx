"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminIcon, type AdminIconName } from "./admin-icons";

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

const PALETTE = [
  "#e0005a",
  "#2fbf9b",
  "#f59e0b",
  "#8b5cf6",
  "#2e90fa",
  "#ff7a3d",
  "#98a2b3",
];
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
const LOCALE_VI: Record<string, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

function pct(part: number, total: number): string {
  if (total <= 0) return "0%";
  const v = (part / total) * 100;
  return `${v >= 99.5 ? Math.round(v) : v.toFixed(1)}%`;
}

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return fmt.format(value);
}

function niceMax(value: number): number {
  if (value <= 5) return 5;
  const power = 10 ** Math.floor(Math.log10(value));
  const scale = value / power;
  const step = scale <= 1 ? 1 : scale <= 2 ? 2 : scale <= 5 ? 5 : 10;
  return step * power;
}

/* -------------------------------------------------------------------------- */
/* Charts                                                                     */
/* -------------------------------------------------------------------------- */

/** Biểu đồ vùng + đường: lượt xem và người vào web theo ngày. */
function AreaChart({ data }: { data: Stats["trend"] }) {
  if (data.length === 0) return <p className="adm-empty">Chưa có lượt truy cập.</p>;
  const W = 660;
  const H = 236;
  const pad = { top: 16, right: 16, bottom: 30, left: 42 };
  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.views, d.visitors))));
  const x = (index: number) =>
    pad.left + (index * (W - pad.left - pad.right)) / Math.max(1, data.length - 1);
  const y = (value: number) =>
    H - pad.bottom - (value / max) * (H - pad.top - pad.bottom);
  const points = (get: (d: Stats["trend"][number]) => number) =>
    data.map((entry, index) => `${x(index)},${y(get(entry))}`).join(" ");
  const viewPoints = points((d) => d.views);
  const visitorPoints = points((d) => d.visitors);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const step = Math.max(1, Math.ceil(data.length / 7));
  const labels = data.filter((_, index) => index % step === 0);
  const lastIndex = data.length - 1;
  if (
    labels.length > 0 &&
    lastIndex - data.indexOf(labels[labels.length - 1]) < step
  )
    labels.pop();
  labels.push(data[lastIndex]);
  const last = data[data.length - 1];

  return (
    <div className="adm-chart-wrap">
      <div className="adm-chart-legend">
        <span>
          <i style={{ background: "#e0005a" }} />
          Lượt xem
        </span>
        <span>
          <i style={{ background: "#0e7a5f" }} />
          Người vào web
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="adm-chart"
        role="img"
        aria-label="Xu hướng lượt xem và người vào web theo ngày"
      >
        <defs>
          <linearGradient id="admArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0005a" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#e0005a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((fraction) => {
          const value = max * fraction;
          return (
            <g key={fraction}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={y(value)}
                y2={y(value)}
                stroke="#f4e3ec"
                strokeDasharray={fraction === 0 ? undefined : "3 5"}
              />
              <text
                x={pad.left - 8}
                y={y(value) + 4}
                textAnchor="end"
                className="adm-chart-axis"
              >
                {compact(Math.round(value))}
              </text>
            </g>
          );
        })}
        <polygon
          points={`${pad.left},${H - pad.bottom} ${viewPoints} ${W - pad.right},${H - pad.bottom}`}
          fill="url(#admArea)"
        />
        <polyline
          points={visitorPoints}
          fill="none"
          stroke="#0e7a5f"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.92"
        />
        <polyline
          points={viewPoints}
          fill="none"
          stroke="#e0005a"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.length <= 32
          ? data.map((entry, index) => (
              <circle
                key={entry.day}
                cx={x(index)}
                cy={y(entry.views)}
                r="3.2"
                fill="#fff"
                stroke="#e0005a"
                strokeWidth="2"
              />
            ))
          : null}
        <circle
          cx={x(data.length - 1)}
          cy={y(last.views)}
          r="5"
          fill="#e0005a"
          stroke="#fff"
          strokeWidth="2.5"
        />
        {labels.map((entry) => {
          const index = data.indexOf(entry);
          return (
            <text
              key={entry.day}
              x={x(index)}
              y={H - 8}
              textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}
              className="adm-chart-axis"
            >
              {entry.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/** Sparkline nhỏ trong thẻ KPI. */
function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  if (values.length < 2)
    return <span className="adm-spark adm-spark-empty" aria-hidden="true" />;
  const W = 148;
  const H = 40;
  const P = 4;
  const max = Math.max(1, ...values);
  const points = values
    .map(
      (value, index) =>
        `${P + (index * (W - P * 2)) / (values.length - 1)},${H - P - (value / max) * (H - P * 2)}`,
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="adm-spark" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Donut({
  data,
  labelOf,
  totalLabel = "tổng",
}: {
  data: { name: string; value: number }[];
  labelOf?: (name: string) => string;
  totalLabel?: string;
}) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const fractions = data.map((entry) => (total > 0 ? entry.value / total : 0));
  const starts = fractions.map((_, index) =>
    fractions.slice(0, index).reduce((sum, value) => sum + value, 0),
  );
  const segments = data.map((entry, index) => ({
    ...entry,
    dash: fractions[index] * circumference,
    offset: starts[index] * circumference,
    color: PALETTE[index % PALETTE.length],
  }));

  return (
    <div className="adm-donut-wrap">
      <svg viewBox="0 0 140 140" className="adm-donut" role="img" aria-label="Biểu đồ tròn">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#fdf0f5" strokeWidth="16" />
        {segments.map((segment) => (
          <circle
            key={segment.name}
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="16"
            strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
            strokeDashoffset={-segment.offset + circumference * 0.25}
            strokeLinecap="butt"
          />
        ))}
        <text x="70" y="67" textAnchor="middle" className="adm-donut-total">
          {compact(total)}
        </text>
        <text x="70" y="85" textAnchor="middle" className="adm-donut-sub">
          {totalLabel}
        </text>
      </svg>
      <ul className="adm-donut-legend">
        {segments.map((segment) => (
          <li key={segment.name}>
            <i style={{ background: segment.color }} />
            <span>{labelOf ? labelOf(segment.name) : segment.name}</span>
            <strong>{fmt.format(segment.value)}</strong>
            <small>{pct(segment.value, total)}</small>
          </li>
        ))}
        {segments.length === 0 && <li>Chưa có dữ liệu.</li>}
      </ul>
    </div>
  );
}

function Bars({ data }: { data: { name: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...data.map((entry) => entry.value));
  return (
    <div className="adm-bars">
      {data.map((entry) => (
        <div key={entry.name} className="adm-bar-row">
          <span>{entry.name}</span>
          <div className="adm-bar-track">
            <div
              className="adm-bar-fill"
              style={{
                width: `${Math.max(3, (entry.value / max) * 100)}%`,
                background: entry.color
                  ? `linear-gradient(90deg, ${entry.color}, ${entry.color}cc)`
                  : undefined,
              }}
            />
          </div>
          <strong>{fmt.format(entry.value)}</strong>
        </div>
      ))}
      {!data.length && <p className="adm-empty">Chưa có dữ liệu.</p>}
    </div>
  );
}

/** Top trang dạng bảng xếp hạng. */
function RankedPages({ data, total }: { data: { path: string; views: number }[]; total: number }) {
  const max = Math.max(1, ...data.map((entry) => entry.views));
  return (
    <ol className="adm-rank">
      {data.slice(0, 8).map((entry, index) => (
        <li key={entry.path}>
          <span className="adm-rank-num" data-top={index < 3}>
            {index + 1}
          </span>
          <span className="adm-rank-path" title={entry.path}>
            {entry.path}
          </span>
          <span className="adm-rank-track">
            <span style={{ width: `${Math.max(4, (entry.views / max) * 100)}%` }} />
          </span>
          <strong>{fmt.format(entry.views)}</strong>
          <small>{pct(entry.views, total)}</small>
        </li>
      ))}
      {data.length === 0 && <li className="adm-rank-empty">Chưa có dữ liệu.</li>}
    </ol>
  );
}

/** Phễu chuyển đổi tổng: xem → người → leads → chốt. */
function FunnelDiagram({
  stages,
}: {
  stages: { label: string; value: number; hint: string }[];
}) {
  const max = Math.max(1, ...stages.map((stage) => stage.value));
  return (
    <div className="adm-funnel-diagram">
      {stages.map((stage, index) => {
        const previous = index === 0 ? null : stages[index - 1];
        const conversion =
          previous && previous.value > 0 ? pct(stage.value, previous.value) : null;
        return (
          <div key={stage.label}>
            <div className="adm-funnel-stage" data-stage={index}>
              <span className="adm-funnel-label">
                <i aria-hidden="true">{index + 1}</i>
                {stage.label}
              </span>
              <span className="adm-funnel-track">
                <span style={{ width: `${Math.max(6, (stage.value / max) * 100)}%` }} />
              </span>
              <strong>{fmt.format(stage.value)}</strong>
            </div>
            <div className="adm-funnel-meta">
              <span className="adm-funnel-hint">{stage.hint}</span>
              {conversion ? (
                <span className="adm-funnel-conv">▼ {conversion} chuyển tiếp</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Thanh stacked tỉ lệ trạng thái leads. */
function StatusStack({
  byStatus,
  compact = false,
}: {
  byStatus: Record<string, number>;
  compact?: boolean;
}) {
  const order = ["new", "contacted", "qualified", "won", "lost"];
  const total = order.reduce((sum, key) => sum + (byStatus[key] ?? 0), 0);
  return (
    <div>
      <div className="adm-stack" role="img" aria-label="Tỉ lệ trạng thái yêu cầu">
        {order.map((key) => {
          const value = byStatus[key] ?? 0;
          if (value <= 0 || total <= 0) return null;
          return (
            <span
              key={key}
              style={{
                width: `${(value / total) * 100}%`,
                background: STATUS_COLORS[key],
              }}
              title={`${STATUS_VI[key]}: ${value}`}
            />
          );
        })}
        {total <= 0 && <span className="adm-stack-empty">Chưa có yêu cầu</span>}
      </div>
      {compact ? null : (
        <ul className="adm-stack-legend">
          {order.map((key) => (
            <li key={key}>
              <i style={{ background: STATUS_COLORS[key] }} />
              <span>{STATUS_VI[key]}</span>
              <strong>{fmt.format(byStatus[key] ?? 0)}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="adm-panel-head">
      <div>
        {eyebrow ? <p className="adm-panel-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {aside ? <div className="adm-panel-aside">{aside}</div> : null}
    </header>
  );
}

function Kpi({
  icon,
  tone,
  label,
  value,
  foot,
  children,
}: {
  icon: AdminIconName;
  tone: "rose" | "teal" | "violet" | "amber";
  label: string;
  value: string;
  foot: string;
  children?: ReactNode;
}) {
  return (
    <article className="adm-kpi" data-tone={tone}>
      <div className="adm-kpi-head">
        <span className="adm-kpi-icon" aria-hidden="true">
          <AdminIcon name={icon} size={16} />
        </span>
        <span className="adm-kpi-label">{label}</span>
      </div>
      <strong>{value}</strong>
      {children}
      <small>{foot}</small>
    </article>
  );
}

export function Overview({ csrf }: { csrf: string }) {
  const [days, setDays] = useState(14);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/stats?days=${days}`, { headers: { "x-csrf-token": csrf } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được thống kê");
        return response.json();
      })
      .then((json: Stats) => {
        if (!alive) return;
        setStats(json);
        setError("");
        setUpdatedAt(new Date());
      })
      .catch((exception) => {
        if (alive) setError(String(exception?.message ?? exception));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [days, csrf]);

  function changeDays(next: number) {
    if (next === days) return;
    setLoading(true);
    setDays(next);
  }

  function refresh() {
    setLoading(true);
    fetch(`/api/admin/stats?days=${days}`, { headers: { "x-csrf-token": csrf } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được thống kê");
        return response.json();
      })
      .then((json: Stats) => {
        setStats(json);
        setError("");
        setUpdatedAt(new Date());
      })
      .catch((exception) => setError(String(exception?.message ?? exception)))
      .finally(() => setLoading(false));
  }

  const trend = stats?.trend ?? [];
  const byStatus = stats?.totals.byStatus ?? {};
  const totalViews = stats?.totals.views ?? 0;
  const recentLeads = stats?.recentLeads ?? [];

  return (
    <div className="adm-overview" aria-busy={loading}>
      <div className="adm-overview-bar">
        <div className="adm-overview-bar-lead">
          <p className="adm-overview-eyebrow">Hiệu suất website</p>
          <strong>{days} ngày gần nhất</strong>
          <small>
            {loading && !stats
              ? "Đang tải số liệu…"
              : updatedAt
                ? `Cập nhật ${updatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
                : "Chưa có dữ liệu"}
          </small>
        </div>
        <div className="adm-overview-bar-actions">
          <div className="adm-period" role="group" aria-label="Khoảng thời gian">
            {[7, 14, 30].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={days === value}
                data-active={days === value}
                onClick={() => changeDays(value)}
              >
                {value} ngày
              </button>
            ))}
          </div>
          <button
            type="button"
            className="adm-overview-refresh"
            disabled={loading}
            onClick={refresh}
          >
            <AdminIcon name="refresh" size={15} />
            {loading ? "Đang tải…" : "Làm mới"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="adm-notice" role="alert">
          {error}
        </div>
      ) : null}

      <div className="adm-kpis">
        <Kpi
          icon="eye"
          tone="rose"
          label="Lượt xem hôm nay"
          value={loading && !stats ? "—" : fmt.format(stats?.today.views ?? 0)}
          foot={`Tổng ${days} ngày: ${fmt.format(totalViews)}`}
        >
          <Sparkline values={trend.map((entry) => entry.views)} stroke="#e0005a" />
        </Kpi>
        <Kpi
          icon="globe"
          tone="teal"
          label="Người vào web hôm nay"
          value={loading && !stats ? "—" : fmt.format(stats?.today.visitors ?? 0)}
          foot={`Tổng khách: ${fmt.format(stats?.totals.visitors ?? 0)}`}
        >
          <Sparkline values={trend.map((entry) => entry.visitors)} stroke="#0e7a5f" />
        </Kpi>
        <Kpi
          icon="leads"
          tone="violet"
          label="Leads hôm nay"
          value={loading && !stats ? "—" : fmt.format(stats?.today.leads ?? 0)}
          foot={`Tổng: ${fmt.format(stats?.totals.leads ?? 0)} · Đã chốt: ${fmt.format(byStatus.won ?? 0)}`}
        >
          <div className="adm-kpi-stack">
            <StatusStack byStatus={byStatus} compact />
          </div>
        </Kpi>
        <Kpi
          icon="trophy"
          tone="amber"
          label="Tỉ lệ chốt"
          value={`${stats?.totals.conversion ?? 0}%`}
          foot={`${fmt.format(byStatus.won ?? 0)}/${fmt.format(stats?.totals.leads ?? 0)} leads · Pipeline ${fmtVND.format(stats?.totals.pipeline ?? 0)} ₫`}
        >
          <div
            className="adm-gauge"
            role="img"
            aria-label={`Tỉ lệ chốt ${stats?.totals.conversion ?? 0} phần trăm`}
          >
            <span
              style={{
                width: `${Math.min(100, Math.max(0, stats?.totals.conversion ?? 0))}%`,
              }}
            />
          </div>
        </Kpi>
      </div>

      <div className="adm-overview-main">
        <section className="adm-panel adm-panel--chart">
          <PanelHeader
            eyebrow="Lưu lượng"
            title="Xu hướng truy cập"
            description={`Số lượt xem và người vào web mỗi ngày trong ${days} ngày (giờ Việt Nam).`}
            aside={
              stats ? (
                <span className="adm-panel-pill">
                  {compact(totalViews)} lượt xem
                </span>
              ) : null
            }
          />
          {stats ? <AreaChart data={stats.trend} /> : <p className="adm-empty">Đang tải…</p>}
        </section>
        <section className="adm-panel adm-panel--funnel">
          <PanelHeader
            eyebrow="Chuyển đổi"
            title="Phễu chuyển đổi"
            description={`Từ lượt xem đến chốt đơn trong ${days} ngày.`}
          />
          {stats ? (
            <FunnelDiagram
              stages={[
                {
                  label: "Lượt xem",
                  value: stats.totals.views,
                  hint: "Đã lọc bot",
                },
                {
                  label: "Người vào web",
                  value: stats.totals.visitors,
                  hint: "Theo thiết bị",
                },
                {
                  label: "Yêu cầu tư vấn",
                  value: stats.totals.leads,
                  hint: "Form thành công",
                },
                {
                  label: "Đã chốt",
                  value: byStatus.won ?? 0,
                  hint: "Đã thành đơn",
                },
              ]}
            />
          ) : (
            <p className="adm-empty">Đang tải…</p>
          )}
        </section>
      </div>

      <div className="adm-grid-2">
        <section className="adm-panel">
          <PanelHeader
            eyebrow="Nội dung"
            title="Trang được xem nhiều"
            description={`Top đường dẫn trong ${days} ngày.`}
            aside={
              stats?.topPages.length ? (
                <span className="adm-panel-pill">{stats.topPages.length} trang</span>
              ) : null
            }
          />
          {stats ? (
            <RankedPages data={stats.topPages} total={totalViews} />
          ) : (
            <p className="adm-empty">Đang tải…</p>
          )}
        </section>
        <section className="adm-panel">
          <PanelHeader
            eyebrow="Khách hàng"
            title="Yêu cầu mới nhất"
            description="6 yêu cầu gần đây theo thời gian."
            aside={
              recentLeads.length ? (
                <span className="adm-panel-pill">{recentLeads.length} yêu cầu</span>
              ) : null
            }
          />
          {recentLeads.length ? (
            <ol className="adm-timeline">
              {recentLeads.map((lead, index) => (
                <li key={`${lead.created_at}-${index}`}>
                  <i style={{ background: STATUS_COLORS[lead.status] ?? "#98a2b3" }} />
                  <span className="adm-timeline-status">
                    {STATUS_VI[lead.status] ?? lead.status}
                  </span>
                  <time>{new Date(lead.created_at).toLocaleString("vi-VN")}</time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="adm-empty">Chưa có yêu cầu nào.</p>
          )}
        </section>
      </div>

      <div className="adm-grid-3">
        <section className="adm-panel">
          <PanelHeader eyebrow="Nguồn" title="Kênh đến" description="Khách biết tới web từ đâu." />
          {stats ? (
            <Donut data={stats.sources} labelOf={(name) => SOURCE_VI[name] ?? name} />
          ) : (
            <p className="adm-empty">Đang tải…</p>
          )}
        </section>
        <section className="adm-panel">
          <PanelHeader eyebrow="Thiết bị" title="Thiết bị" description="Tỉ lệ điện thoại / máy tính." />
          {stats ? (
            <Donut
              data={stats.devices.map((entry) => ({
                name:
                  entry.name === "mobile"
                    ? "Điện thoại"
                    : entry.name === "tablet"
                      ? "Máy tính bảng"
                      : "Máy tính",
                value: entry.value,
              }))}
            />
          ) : (
            <p className="adm-empty">Đang tải…</p>
          )}
        </section>
        <section className="adm-panel">
          <PanelHeader eyebrow="Ngôn ngữ" title="Ngôn ngữ" description="Tỉ lệ khách Việt / Anh." />
          {stats ? (
            <Donut data={stats.locales} labelOf={(name) => LOCALE_VI[name] ?? name} />
          ) : (
            <p className="adm-empty">Đang tải…</p>
          )}
        </section>
      </div>

      <section className="adm-panel adm-overview-pipeline">
        <PanelHeader
          eyebrow="Kinh doanh"
          title="Pipeline chăm sóc"
          description="Số yêu cầu theo trạng thái và giá trị ước tính từ 500 yêu cầu gần nhất."
          aside={
            <div className="adm-pipeline-summary">
              <span>
                Ước tính
                <strong>{fmtVND.format(stats?.totals.pipeline ?? 0)} ₫</strong>
              </span>
              <span>
                Tỉ lệ chốt
                <strong>{stats?.totals.conversion ?? 0}%</strong>
              </span>
            </div>
          }
        />
        <div className="adm-pipeline-grid">
          {stats ? (
            <Bars
              data={["new", "contacted", "qualified", "won", "lost"].map((key) => ({
                name: STATUS_VI[key],
                value: byStatus[key] ?? 0,
                color: STATUS_COLORS[key],
              }))}
            />
          ) : (
            <p className="adm-empty">Đang tải…</p>
          )}
          <div className="adm-pipeline-side">
            {stats ? <StatusStack byStatus={byStatus} /> : null}
            <p className="adm-pipeline-note">
              Pipeline ước tính từ giá tour của leads Tiềm năng + Đã chốt. Số liệu
              không thay đổi lịch sử khi lead đổi trạng thái.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
