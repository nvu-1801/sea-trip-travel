"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatBytes,
  formatMetricValue,
  statusLabel,
  STORAGE_BAD_PERCENT,
  STORAGE_WARN_PERCENT,
  type HealthPayload,
  type HealthStatus,
  type HealthStorage,
} from "@/lib/health";

const numberFormat = new Intl.NumberFormat("vi-VN");

function duration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return "dưới 1 phút";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

function StatusPill({ status }: { status: HealthStatus }) {
  return (
    <span className="adm-health-pill" data-status={status}>
      <i aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}

function storageStatus(storage: HealthStorage): HealthStatus {
  if (!storage.available) return "unknown";
  if (
    storage.dataBytes >= 5 * 1024 ** 3 ||
    (storage.volumeUsedPercent !== null &&
      storage.volumeUsedPercent >= STORAGE_BAD_PERCENT)
  )
    return "bad";
  if (
    storage.dataBytes >= 1.5 * 1024 ** 3 ||
    (storage.volumeUsedPercent !== null &&
      storage.volumeUsedPercent >= STORAGE_WARN_PERCENT)
  )
    return "warn";
  return "good";
}

function speedStatus(data: HealthPayload): HealthStatus {
  // One or two page views are not a verdict; wait for a real p75 sample.
  if (data.speed.samples < 20) return "unknown";
  const known = data.speed.metrics.filter(
    (metric) => metric.status !== "unknown",
  );
  if (known.length === 0) return "unknown";
  if (known.some((metric) => metric.status === "bad")) return "bad";
  if (known.some((metric) => metric.status === "warn")) return "warn";
  return "good";
}

function ScoreRing({
  score,
  status,
}: {
  score: number;
  status: HealthStatus;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <svg
      viewBox="0 0 110 110"
      className="adm-health-ring"
      role="img"
      aria-label={`Điểm SEO ${score} trên 100`}
    >
      <circle
        cx="55"
        cy="55"
        r={radius}
        fill="none"
        stroke="#f6e4ec"
        strokeWidth="11"
      />
      <circle
        cx="55"
        cy="55"
        r={radius}
        fill="none"
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference * 0.25}
        data-status={status}
        className="adm-health-ring-value"
      />
      <text x="55" y="57" textAnchor="middle" className="adm-health-ring-no">
        {score}
      </text>
      <text x="55" y="72" textAnchor="middle" className="adm-health-ring-sub">
        / 100
      </text>
    </svg>
  );
}

function SpeedTile({
  label,
  value,
  status,
  unit,
  samples,
}: {
  label: string;
  value: string;
  status: HealthStatus;
  unit: "ms" | "score";
  samples: number;
}) {
  return (
    <div className="adm-health-vital" data-status={status}>
      <span className="adm-health-vital-label">{label}</span>
      <strong>{value}</strong>
      <small>
        {unit === "score" ? "điểm" : "p75"} ·{" "}
        {samples > 0 ? `${numberFormat.format(samples)} mẫu` : "chưa có mẫu"}
      </small>
    </div>
  );
}

export function HealthCheck({ csrf }: { csrf: string }) {
  const [days, setDays] = useState(7);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/health?days=${days}&r=${refresh}`, {
      headers: { "x-csrf-token": csrf },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được dữ liệu sức khỏe.");
        return response.json();
      })
      .then((payload: HealthPayload) => {
        if (!alive) return;
        setData(payload);
        setError("");
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
  }, [csrf, days, refresh]);

  const storage = data?.storage;
  const seo = data?.seo;
  const speed = data?.speed;

  const usedSegments = useMemo(() => {
    if (!storage) return [];
    return [
      {
        key: "db",
        label: "Database",
        bytes: storage.databaseBytes + storage.walBytes,
        color: "#e0005a",
      },
      {
        key: "uploads",
        label: "Ảnh & tệp",
        bytes: storage.uploadsBytes,
        color: "#2fbf9b",
      },
      {
        key: "other",
        label: "Khác",
        bytes: storage.otherBytes,
        color: "#f0b45c",
      },
    ].filter((segment) => segment.bytes > 0);
  }, [storage]);

  return (
    <div className="adm-health">
      <div className="adm-toolbar">
        <div className="adm-period" role="group" aria-label="Khoảng thời gian tốc độ">
          {[7, 28].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={days === value}
              data-active={days === value}
              onClick={() => {
                if (value === days) return;
                setLoading(true);
                setDays(value);
              }}
            >
              {value} ngày
            </button>
          ))}
        </div>
        <button
          type="button"
          className="adm-health-refresh"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setRefresh((value) => value + 1);
          }}
        >
          {loading ? "Đang đo…" : "Làm mới"}
        </button>
      </div>

      {error ? (
        <p className="adm-notice" role="alert">
          {error}
        </p>
      ) : null}

      {!data ? (
        <p className="adm-empty" aria-live="polite">
          {loading ? "Đang đo sức khỏe website…" : "Chưa có dữ liệu."}
        </p>
      ) : (
        <>
          <div className="adm-health-cards" aria-busy={loading}>
            <section className="adm-health-card" data-status={storageStatus(storage!)}>
              <header>
                <p className="adm-health-eyebrow">Dung lượng</p>
                <StatusPill status={storageStatus(storage!)} />
              </header>
              <strong className="adm-health-value">
                {storage!.available ? formatBytes(storage!.dataBytes) : "—"}
              </strong>
              <p className="adm-health-note">
                {storage!.available
                  ? `${numberFormat.format(storage!.uploadFiles)} ảnh/tệp · database ${formatBytes(storage!.databaseBytes + storage!.walBytes)}`
                  : storage!.note ?? "Không đọc được dung lượng."}
              </p>
              {storage!.available && usedSegments.length > 0 ? (
                <div className="adm-health-bar" role="img" aria-label="Tỷ trọng dung lượng">
                  {usedSegments.map((segment) => (
                    <span
                      key={segment.key}
                      style={{
                        width: `${(segment.bytes / Math.max(1, storage!.dataBytes)) * 100}%`,
                        background: segment.color,
                      }}
                    />
                  ))}
                </div>
              ) : null}
              <dl className="adm-health-facts">
                <div>
                  <dt>Database</dt>
                  <dd>{formatBytes(storage!.databaseBytes + storage!.walBytes)}</dd>
                </div>
                <div>
                  <dt>Ảnh &amp; tệp</dt>
                  <dd>{formatBytes(storage!.uploadsBytes)}</dd>
                </div>
                <div>
                  <dt>Volume còn trống</dt>
                  <dd>
                    {storage!.volumeFreeBytes === null
                      ? "Không xác định"
                      : `${formatBytes(storage!.volumeFreeBytes)} / ${formatBytes(storage!.volumeTotalBytes)}`}
                  </dd>
                </div>
              </dl>
              {storage!.volumeUsedPercent !== null ? (
                <p className="adm-health-note">
                  Volume đã dùng {storage!.volumeUsedPercent}% · ngưỡng cảnh báo{" "}
                  {STORAGE_WARN_PERCENT}%.
                </p>
              ) : null}
              {storage!.note ? (
                <p className="adm-health-note adm-health-note--muted">{storage!.note}</p>
              ) : null}
            </section>

            <section className="adm-health-card" data-status={speedStatus(data)}>
              <header>
                <p className="adm-health-eyebrow">Tốc độ tải</p>
                <StatusPill status={speedStatus(data)} />
              </header>
              <strong className="adm-health-value">
                {speed!.hasData
                  ? `${numberFormat.format(speed!.samples)} lượt đo`
                  : "Đang thu thập"}
              </strong>
              <p className="adm-health-note">
                {speed!.hasData
                  ? `p75 theo khách thật trong ${speed!.days} ngày gần nhất.`
                  : "Cần vài lượt truy cập thật sau khi phát hành để có p75."}
              </p>
              <div className="adm-health-vitals">
                {speed!.metrics.map((metric) => (
                  <SpeedTile
                    key={metric.key}
                    label={metric.label}
                    value={formatMetricValue(metric.key, metric.value)}
                    status={metric.status}
                    unit={metric.unit}
                    samples={metric.samples}
                  />
                ))}
              </div>
              {speed!.worstPages.length > 0 ? (
                <div className="adm-health-pages">
                  <p>Trang chậm nhất (LCP)</p>
                  <ul>
                    {speed!.worstPages.map((page) => (
                      <li key={page.path}>
                        <a href={page.path} target="_blank" rel="noreferrer">
                          {page.path}
                        </a>
                        <span>{formatMetricValue("lcp", page.value)}</span>
                        <small>{page.samples} mẫu</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            <section className="adm-health-card" data-status={seo!.status}>
              <header>
                <p className="adm-health-eyebrow">SEO</p>
                <StatusPill status={seo!.status} />
              </header>
              <div className="adm-health-seo-top">
                <ScoreRing score={seo!.score} status={seo!.status} />
                <div>
                  <strong className="adm-health-value">{seo!.issues.length} nhóm lỗi</strong>
                  <p className="adm-health-note">
                    {seo!.pages} trang · sitemap {seo!.sitemapUrls ?? "—"} URL
                  </p>
                  <p className="adm-health-note">
                    Bản dịch EN đã duyệt: {seo!.translation.reviewed}/
                    {seo!.translation.total}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className="adm-panel adm-health-panel">
            <header className="adm-health-panel-head">
              <div>
                <h2>Việc cần xử lý cho SEO</h2>
                <p>
                  {seo!.issues.length === 0
                    ? "Không phát hiện lỗi trong lần kiểm tra này."
                    : "Sắp theo mức ưu tiên. Bấm “Sửa” để mở đúng nội dung."}
                </p>
              </div>
              <span className="adm-health-panel-count">
                {seo!.issues.reduce((sum, issue) => sum + issue.count, 0)} mục
              </span>
            </header>
            <ul className="adm-health-issues">
              {seo!.issues.map((issue) => (
                <li key={issue.id} data-severity={issue.severity}>
                  <span className="adm-health-severity" aria-hidden="true" />
                  <div>
                    <strong>{issue.title}</strong>
                    <small>{issue.detail}</small>
                  </div>
                  <span className="adm-health-count">{issue.count}</span>
                  {issue.href ? (
                    <a href={issue.href} className="adm-health-fix">
                      Sửa
                    </a>
                  ) : null}
                </li>
              ))}
              {seo!.issues.length === 0 ? (
                <li data-severity="none">
                  <span className="adm-health-severity" aria-hidden="true" />
                  <div>
                    <strong>Mọi kiểm tra đều đạt</strong>
                    <small>
                      Tiếp tục giữ title/description riêng và cập nhật bản dịch EN
                      khi thêm nội dung mới.
                    </small>
                  </div>
                </li>
              ) : null}
            </ul>
          </section>

          <section className="adm-panel adm-health-machine">
            <div>
              <p className="adm-health-eyebrow">Máy chủ</p>
              <strong>{duration(data.server.uptimeSeconds)}</strong>
              <small>thời gian hoạt động</small>
            </div>
            <div>
              <p className="adm-health-eyebrow">Bộ nhớ</p>
              <strong>{formatBytes(data.server.rssBytes)}</strong>
              <small>RSS · heap {formatBytes(data.server.heapUsedBytes)}</small>
            </div>
            <div>
              <p className="adm-health-eyebrow">Database</p>
              <strong>
                {data.server.dbLatencyMs === null
                  ? "—"
                  : data.server.dbLatencyMs < 1
                    ? "<1 ms"
                    : `${data.server.dbLatencyMs} ms`}
              </strong>
              <small>truy vấn thử</small>
            </div>
            <div>
              <p className="adm-health-eyebrow">Node</p>
              <strong>{data.server.nodeVersion}</strong>
              <small>
                đo lúc{" "}
                {new Date(data.generatedAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
