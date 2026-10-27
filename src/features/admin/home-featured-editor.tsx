"use client";

import { AdmMultiSelect } from "./ui-select";

/**
 * Editor for the home "Tour Quy Nhơn – Phú Yên nổi bật" block.
 *
 * The public section reads `landing.featured.tourIds` in order, so this editor
 * makes that order explicit and gives each pinned tour a direct "Sửa tour"
 * action. Empty means "automatic": the site falls back to the focus route.
 */
export function HomeFeaturedEditor({
  value,
  options,
  autoTours = [],
  meta = {},
  onChange,
  onEditTour,
}: {
  value: Record<string, unknown>;
  options: { value: string; label: string }[];
  /** Published tours the home page picks automatically when nothing is pinned. */
  autoTours?: {
    key: string;
    label: string;
    duration: string | null;
    price: string | null;
  }[];
  /** Price/duration/publication read from the tour list. */
  meta?: Record<
    string,
    {
      price?: string | null;
      duration?: string | null;
      state?: string;
    }
  >;
  onChange: (next: Record<string, unknown>) => void;
  onEditTour: (key: string) => void;
}) {
  const raw = value.tourIds;
  const tourIds = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string")
    : [];
  const labels = new Map(options.map((option) => [option.value, option.label]));
  const selected = tourIds.map((key) => ({
    key,
    label: labels.get(key) ?? key,
  }));

  const commit = (next: string[]) =>
    onChange({ ...value, tourIds: next.slice(0, 6) });

  const move = (index: number, direction: -1 | 1) => {
    const next = [...tourIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  return (
    <div className="adm-home-featured">
      <p className="adm-home-featured-lead">
        Chọn tour hiển thị trong khối <strong>“Tour Quy Nhơn – Phú Yên nổi
        bật”</strong>. Thứ tự ở đây là thứ tự thẻ trên trang chủ, tối đa 6 tour.
      </p>

      <AdmMultiSelect
        label="Thêm tour vào khối nổi bật"
        values={tourIds}
        options={options}
        placeholder="Tìm tour theo tên…"
        onChange={commit}
      />

      {selected.length > 0 ? (
        <ol className="adm-home-featured-list">
          {selected.map((item, index) => (
            <li key={item.key}>
              <span className="adm-home-featured-num">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="adm-home-featured-copy">
                <strong>{item.label}</strong>
                <small>
                  {[
                    index === 0 ? "Thẻ lớn trên cùng" : `Thẻ ${index + 1}`,
                    meta[item.key]?.duration,
                    meta[item.key]?.price,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
                {meta[item.key]?.state &&
                meta[item.key]?.state !== "published" ? (
                  <small className="adm-home-featured-draft">
                    {meta[item.key]?.state === "deleted"
                      ? "Đang ở Thùng rác — chưa lên website"
                      : "Bản nháp — chưa lên website"}
                  </small>
                ) : null}
              </div>
              <div className="adm-home-featured-actions">
                <button
                  type="button"
                  aria-label={`Đưa ${item.label} lên`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Đưa ${item.label} xuống`}
                  disabled={index === selected.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="adm-ghost-link"
                  onClick={() => onEditTour(item.key)}
                >
                  Sửa tour ↗
                </button>
                <button
                  type="button"
                  className="adm-home-featured-remove"
                  onClick={() => commit(tourIds.filter((key) => key !== item.key))}
                >
                  Bỏ
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <p className="adm-home-featured-empty">
            Đang để <strong>tự động</strong>: trang chủ chọn 6 tour theo tuyến
            Quy Nhơn – Phú Yên. Thêm tour bên trên nếu muốn ghim thủ công.
          </p>
          {autoTours.length > 0 ? (
            <div className="adm-home-featured-auto">
              <p className="adm-home-featured-auto-head">
                {autoTours.length} tour đang hiển thị tự động
              </p>
              <ol className="adm-home-featured-list">
                {autoTours.map((item, index) => (
                  <li key={item.key}>
                    <span className="adm-home-featured-num">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="adm-home-featured-copy">
                      <strong>{item.label}</strong>
                      <small>
                        {[item.duration, item.price].filter(Boolean).join(" · ")}
                      </small>
                    </div>
                    <div className="adm-home-featured-actions">
                      <button
                        type="button"
                        className="adm-ghost-link"
                        onClick={() => onEditTour(item.key)}
                      >
                        Sửa tour ↗
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      )}

      <p className="adm-hint">
        Ảnh, lịch trình và mô tả nằm trong form tour. Bấm{" "}
        <strong>Sửa tour ↗</strong> để mở đúng tour đó, rồi sửa{" "}
        <strong>Giá từ / Bảng giá</strong> hoặc chọn{" "}
        <strong>Liên hệ tư vấn</strong> nếu chưa có giá.
      </p>
    </div>
  );
}
