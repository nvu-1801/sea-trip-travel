"use client";

import { useMemo, useState } from "react";
import {
  FEATURED_CATEGORY_FALLBACK,
  FEATURED_LIMIT,
  activateFeaturedScope,
  descendantCategoryIds,
  featuredConfigOf,
  featuredScopeOf,
  pickAutomaticFeatured,
  setFeaturedScope,
  type FeaturedConfig,
  type FeaturedMode,
  type FeaturedScopeConfig,
} from "@/lib/featured";
import { searchKey } from "@/lib/search";

export type FeaturedEditorCategory = {
  id: string;
  /** Full trail shown in the picker, e.g. “Tour Trong Nước › Miền Bắc”. */
  label: string;
  name: string;
  parentId: string | null;
  path: string;
  tourCount: number;
};

export type FeaturedEditorTour = {
  slug: string;
  title: string;
  categoryIds: string[];
  duration: { days: number; nights: number };
  durationLabel: string | null;
  priceLabel: string | null;
  state: string;
  image: string | null;
};

/**
 * “Tour nổi bật” is one block on the homepage. The editor leads with the list
 * that will actually render, lets the owner pick the route/region, and keeps
 * every route's pins in `featured.scopes` so switching back never loses work.
 */
export function HomeFeaturedEditor({
  value,
  categories,
  tours,
  onChange,
  onEditTour,
}: {
  value: Record<string, unknown>;
  categories: FeaturedEditorCategory[];
  tours: FeaturedEditorTour[];
  onChange: (next: Record<string, unknown>) => void;
  onEditTour: (key: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [titlesOpen, setTitlesOpen] = useState(false);

  const config = useMemo(() => featuredConfigOf(value), [value]);
  const scope = featuredScopeOf(config, config.categoryId);
  const category = categories.find((item) => item.id === config.categoryId);
  const focus = config.categoryId === FEATURED_CATEGORY_FALLBACK;

  const scopeOptions = useMemo(() => {
    if (category) return categories;
    return [
      {
        id: config.categoryId,
        label: `${config.categoryId} (không còn tồn tại)`,
        name: config.categoryId,
        parentId: null,
        path: "/",
        tourCount: 0,
      },
      ...categories,
    ];
  }, [categories, category, config.categoryId]);

  const scopeIds = useMemo(
    () => new Set(descendantCategoryIds(categories, config.categoryId)),
    [categories, config.categoryId],
  );
  const bySlug = useMemo(
    () => new Map(tours.map((tour) => [tour.slug, tour])),
    [tours],
  );
  const automatic = useMemo(
    () =>
      pickAutomaticFeatured(
        tours.filter((tour) => tour.state === "published"),
        scopeIds,
        FEATURED_LIMIT,
      ),
    [tours, scopeIds],
  );

  const manual = scope.tourIds.flatMap((key) => {
    const tour = bySlug.get(key);
    return tour ? [tour] : [];
  });
  const missing = scope.tourIds.filter((key) => !bySlug.has(key));
  const visible = scope.mode === "manual" ? manual : automatic;
  const full = scope.tourIds.length >= FEATURED_LIMIT;
  const overLimit =
    scope.mode === "manual"
      ? Math.max(0, manual.length - FEATURED_LIMIT)
      : 0;
  const shownCount =
    scope.mode === "manual"
      ? Math.min(manual.length, FEATURED_LIMIT)
      : automatic.length;
  const categoryName = category?.name ?? "tuyến này";

  const autoTitle = scope.title?.trim() || `${categoryName} nổi bật`;
  const previewTours =
    scope.mode === "manual" && manual.length > 0 ? manual : automatic;
  const previewTitle = autoTitle || "Tour nổi bật";

  const commit = (next: FeaturedConfig) =>
    onChange(next as unknown as Record<string, unknown>);

  /** Keep empty fields out of the payload so the schema stays clean. */
  const cleanScope = (next: FeaturedScopeConfig): FeaturedScopeConfig => {
    const out: FeaturedScopeConfig = {
      mode: next.mode,
      tourIds: next.tourIds,
    };
    if (next.title?.trim()) out.title = next.title.trim();
    if (next.titleEn?.trim()) out.titleEn = next.titleEn.trim();
    if (next.eyebrow?.trim()) out.eyebrow = next.eyebrow.trim();
    if (next.eyebrowEn?.trim()) out.eyebrowEn = next.eyebrowEn.trim();
    return out;
  };

  const patchScope = (patch: Partial<FeaturedScopeConfig>) =>
    commit(
      setFeaturedScope(config, config.categoryId, cleanScope({ ...scope, ...patch })),
    );

  const switchCategory = (categoryId: string) => {
    if (categoryId === config.categoryId) return;
    setPicking(false);
    setSearch("");
    commit(activateFeaturedScope(config, categoryId));
  };

  const setMode = (mode: FeaturedMode) => {
    if (mode === scope.mode) return;
    setPicking(false);
    setSearch("");
    if (mode === "manual" && scope.mode === "auto") {
      // Seed the manual list with exactly the tours the site shows right now.
      patchScope({
        mode,
        tourIds: automatic.slice(0, FEATURED_LIMIT).map((tour) => tour.slug),
      });
      return;
    }
    patchScope({ mode });
  };

  const move = (slug: string, direction: -1 | 1) => {
    const next = [...scope.tourIds];
    const index = next.indexOf(slug);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patchScope({ tourIds: next });
  };

  const addTour = (slug: string) => {
    if (scope.mode !== "manual" || full || scope.tourIds.includes(slug)) return;
    patchScope({ tourIds: [...scope.tourIds, slug] });
  };

  const needle = searchKey(search.trim());
  const available = tours
    .filter((tour) => tour.state !== "deleted")
    .filter((tour) => tour.categoryIds.some((id) => scopeIds.has(id)))
    .filter((tour) => !scope.tourIds.includes(tour.slug))
    .filter((tour) => !needle || searchKey(tour.title).includes(needle))
    .slice(0, 40);

  return (
    <div className="adm-home-featured">
      <p className="adm-home-featured-lead">
        Chọn tuyến/vùng và danh sách tour hiện trên trang chủ. Mỗi tuyến có cấu
        hình riêng, nên đổi tuyến rồi quay lại vẫn giữ nguyên danh sách cũ.
      </p>

      <div className="adm-featured-setup">
        <label className="adm-featured-field">
          <span>Tuyến / vùng đang cấu hình</span>
          <select
            value={config.categoryId}
            onChange={(event) => switchCategory(event.target.value)}
          >
            {scopeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} · {option.tourCount} tour
              </option>
            ))}
          </select>
          <small>
            {category
              ? `${category.tourCount} tour trong tuyến này (gồm danh mục con).`
              : "Tuyến này không còn trong danh mục — trang chủ sẽ dùng tuyến mặc định."}
          </small>
        </label>

        <div className="adm-featured-field">
          <span>Cách lấy tour</span>
          <div className="adm-featured-modes" role="group" aria-label="Cách lấy tour">
            <button
              type="button"
              aria-pressed={scope.mode === "auto"}
              data-active={scope.mode === "auto"}
              onClick={() => setMode("auto")}
            >
              Tự động
            </button>
            <button
              type="button"
              aria-pressed={scope.mode === "manual"}
              data-active={scope.mode === "manual"}
              onClick={() => setMode("manual")}
            >
              Ghim thủ công
            </button>
          </div>
          <small>
            {scope.mode === "auto"
              ? "Hệ thống chọn tour của tuyến: nửa tour trong ngày, nửa tour dài ngày."
              : `Danh sách và thứ tự do bạn quyết định, tối đa ${FEATURED_LIMIT} tour.`}
          </small>
        </div>
      </div>

      <details
        className="adm-featured-title"
        open={titlesOpen}
        onToggle={(event) => setTitlesOpen(event.currentTarget.open)}
      >
        <summary>
          Tiêu đề khối <small>Tự động: {previewTitle}</small>
        </summary>
        <div className="adm-featured-title-grid">
          <label>
            <span>Tiêu đề (VI)</span>
            <input
              value={scope.title ?? ""}
              placeholder={autoTitle}
              maxLength={160}
              onChange={(event) => patchScope({ title: event.target.value })}
            />
          </label>
          <label>
            <span>Dòng nhỏ phía trên (VI)</span>
            <input
              value={scope.eyebrow ?? ""}
              placeholder={focus ? "Tuyến trọng tâm" : "Vùng miền"}
              maxLength={80}
              onChange={(event) => patchScope({ eyebrow: event.target.value })}
            />
          </label>
          <label>
            <span>Title (EN)</span>
            <input
              value={scope.titleEn ?? ""}
              placeholder={`Featured ${categoryName}`}
              maxLength={160}
              onChange={(event) => patchScope({ titleEn: event.target.value })}
            />
          </label>
          <label>
            <span>Eyebrow (EN)</span>
            <input
              value={scope.eyebrowEn ?? ""}
              placeholder={focus ? "Focus route" : "Regions"}
              maxLength={80}
              onChange={(event) => patchScope({ eyebrowEn: event.target.value })}
            />
          </label>
        </div>
      </details>

      <section className="adm-featured-current" aria-label="Tour đang hiển thị">
        <header className="adm-featured-list-head">
          <div>
            <strong>{shownCount} tour sẽ hiển thị</strong>
            <small>
              {scope.mode === "auto"
                ? "Tự động theo tuyến đang chọn — bấm “Ghim danh sách này” để chỉnh thứ tự."
                : `Thứ tự thẻ trên trang chủ · tối đa ${FEATURED_LIMIT} tour.`}
            </small>
          </div>
          {scope.mode === "auto" ? (
            <button
              type="button"
              className="adm-featured-switch"
              onClick={() => setMode("manual")}
              disabled={automatic.length === 0}
            >
              Ghim danh sách này
            </button>
          ) : null}
        </header>

        {visible.length > 0 ? (
          <ol className="adm-home-featured-list">
            {visible.map((tour, index) => (
              <li key={tour.slug}>
                <span className="adm-home-featured-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {tour.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="adm-featured-thumb" src={tour.image} alt="" />
                ) : null}
                <div className="adm-home-featured-copy">
                  <strong>{tour.title}</strong>
                  <small>
                    {[
                      index === 0 ? "Thẻ lớn trên cùng" : `Thẻ ${index + 1}`,
                      tour.durationLabel,
                      tour.priceLabel,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                  {tour.state !== "published" ? (
                    <small className="adm-home-featured-draft">
                      {tour.state === "deleted"
                        ? "Đang ở Thùng rác — chưa lên website"
                        : "Bản nháp — chưa lên website"}
                    </small>
                  ) : null}
                  {scope.mode === "manual" && index >= FEATURED_LIMIT ? (
                    <small className="adm-home-featured-draft">
                      Ngoài giới hạn — không lên website
                    </small>
                  ) : null}
                </div>
                <div className="adm-home-featured-actions">
                  {scope.mode === "manual" ? (
                    <>
                      <button
                        type="button"
                        aria-label={`Đưa ${tour.title} lên`}
                        disabled={index === 0}
                        onClick={() => move(tour.slug, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Đưa ${tour.title} xuống`}
                        disabled={index === visible.length - 1}
                        onClick={() => move(tour.slug, 1)}
                      >
                        ↓
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="adm-ghost-link"
                    onClick={() => onEditTour(tour.slug)}
                  >
                    Sửa tour ↗
                  </button>
                  {scope.mode === "manual" ? (
                    <button
                      type="button"
                      className="adm-home-featured-remove"
                      onClick={() =>
                        patchScope({
                          tourIds: scope.tourIds.filter(
                            (key) => key !== tour.slug,
                          ),
                        })
                      }
                    >
                      Bỏ
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="adm-home-featured-empty">
            {scope.mode === "auto" ? (
              <>
                Tuyến này chưa có tour đã xuất bản để tự động chọn. Chọn tuyến
                khác hoặc thêm tour cho danh mục này.
              </>
            ) : (
              <>Chưa ghim tour nào. Bấm “Thêm tour” bên dưới để bắt đầu.</>
            )}
          </p>
        )}

        {scope.mode === "manual" && manual.length === 0 && automatic.length > 0 ? (
          <p className="adm-hint">
            Danh sách ghim đang trống nên website tạm dùng danh sách tự động (
            {automatic.length} tour). Thêm tour bên dưới để tự quyết định danh
            sách.
          </p>
        ) : null}

        {overLimit > 0 ? (
          <div className="adm-featured-missing">
            <small>
              {overLimit} tour cuối không lên website vì khối chỉ hiển thị tối
              đa {FEATURED_LIMIT} tour.
            </small>
            <button
              type="button"
              onClick={() =>
                patchScope({ tourIds: scope.tourIds.slice(0, FEATURED_LIMIT) })
              }
            >
              Giữ {FEATURED_LIMIT} tour đầu
            </button>
          </div>
        ) : null}

        {scope.mode === "manual" && missing.length > 0 ? (
          <div className="adm-featured-missing">
            <small>
              {missing.length} tour đã lưu không còn tồn tại nên sẽ không hiển
              thị trên website.
            </small>
            <button
              type="button"
              onClick={() =>
                patchScope({
                  tourIds: scope.tourIds.filter((key) => bySlug.has(key)),
                })
              }
            >
              Dọn mục không còn
            </button>
          </div>
        ) : null}
      </section>

      {scope.mode === "manual" ? (
        <section className="adm-featured-add" aria-label="Thêm tour vào khối">
          <div className="adm-featured-add-head">
            <div>
              <strong>Thêm tour đã có</strong>
              <small>
                Chỉ hiện tour thuộc {categoryName}; thêm vào cuối danh sách,
                không tạo tour mới.
              </small>
            </div>
            <button
              type="button"
              className={picking ? "adm-ghost-link" : "adm-primary"}
              onClick={() => setPicking((open) => !open)}
              disabled={!picking && full}
            >
              {picking ? "Đóng" : full ? "Đã đủ" : "+ Thêm tour"}
            </button>
          </div>

          {full ? (
            <p className="adm-featured-limit" role="status">
              Đã đủ {FEATURED_LIMIT} tour. Bỏ bớt một tour để thêm tour khác.
            </p>
          ) : null}

          {picking && !full ? (
            <div className="adm-featured-picker">
              <input
                type="search"
                value={search}
                autoFocus
                placeholder="Tìm tour theo tên…"
                aria-label="Tìm tour để thêm vào khối nổi bật"
                onChange={(event) => setSearch(event.target.value)}
              />
              {available.length > 0 ? (
                <ul>
                  {available.map((tour) => (
                    <li key={tour.slug}>
                      {tour.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={tour.image} alt="" />
                      ) : (
                        <span className="adm-featured-thumb adm-featured-thumb--empty" />
                      )}
                      <div>
                        <strong>{tour.title}</strong>
                        <small>
                          {[tour.durationLabel, tour.priceLabel]
                            .filter(Boolean)
                            .join(" · ") || "Chưa có giá"}
                          {tour.state === "draft" ? " · Bản nháp" : ""}
                        </small>
                      </div>
                      <button
                        type="button"
                        onClick={() => addTour(tour.slug)}
                        disabled={scope.tourIds.length >= FEATURED_LIMIT}
                      >
                        Thêm
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="adm-featured-picker-empty">
                  {search.trim()
                    ? `Không tìm thấy tour “${search.trim()}” trong ${categoryName}.`
                    : `Không còn tour phù hợp trong ${categoryName}. Tất cả tour của tuyến đã có trong danh sách hoặc tuyến chưa có tour khác.`}
                </p>
              )}
            </div>
          ) : null}
        </section>
      ) : (
        <p className="adm-hint">
          Muốn thêm/bớt hoặc đổi thứ tự? Bấm <strong>Ghim danh sách này</strong>{" "}
          để chuyển sang chế độ thủ công — danh sách được điền sẵn đúng những
          tour đang hiển thị.
        </p>
      )}

      <details className="adm-featured-preview">
        <summary>Xem trước khối trên trang chủ</summary>
        <div className="adm-featured-preview-card">
          <p className="adm-featured-preview-eyebrow">
            {scope.eyebrow?.trim() || (focus ? "Tuyến trọng tâm" : "Vùng miền")}
          </p>
          <h4>{previewTitle}</h4>
          <p>
            {focus
              ? "Từ tour trong ngày tới hành trình nhiều ngày của tuyến trọng tâm."
              : (category?.name ?? "") + " — những tour được chọn cho tuyến này."}
          </p>
          <ol>
            {previewTours.map((tour, index) => (
              <li key={tour.slug}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {tour.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tour.image} alt="" />
                ) : null}
                <div>
                  <strong>{tour.title}</strong>
                  <small>
                    {[tour.durationLabel, tour.priceLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </div>
              </li>
            ))}
          </ol>
          <p className="adm-featured-preview-foot">
            Nút “Xem toàn bộ tuyến” → <code>{category?.path ?? "/"}</code> ·{" "}
            {scope.mode === "manual" ? "Ghim thủ công" : "Tự động theo tuyến"}
          </p>
        </div>
      </details>
    </div>
  );
}
