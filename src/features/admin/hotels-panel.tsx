"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LODGING_LABELS, type LodgingType } from "@/domain/hotel";
import { HotelEditor, type HotelRoomRow, type HotelRow } from "./hotel-editor";
import { text } from "./hotel-form";
import { AdminIcon } from "./admin-icons";
import { ConfirmModal, type ToastKind } from "./notify";
import "./hotels-panel.css";

/**
 * Studio → Khách sạn.
 *
 * One panel for the catalogue, the module switches and the editor. Public
 * state is controlled by the published `settings.hotels` block, so a toggle
 * saved as a draft never opens the catalogue by accident.
 */

type MediaItem = { id: string; name: string; src: string; alt: string };

type HotelSettings = {
  enabled: boolean;
  homeVisible: boolean;
  featured: string[];
};

const DEFAULT_HOTEL_SETTINGS: HotelSettings = {
  enabled: false,
  homeVisible: false,
  featured: [],
};
const MAX_FEATURED = 6;

const STATE_LABEL: Record<string, string> = {
  published: "Đang hiển thị",
  draft: "Bản nháp",
  deleted: "Đã lưu trữ",
};

export function HotelsPanel({ csrf, notify }: { csrf: string; notify: (kind: ToastKind, message: string) => void }) {
  const [hotels, setHotels] = useState<HotelRow[]>([]);
  const [rooms, setRooms] = useState<HotelRoomRow[]>([]);
  const [settingsRow, setSettingsRow] = useState<HotelRow | null>(null);
  const [flags, setFlags] = useState<HotelSettings>(DEFAULT_HOTEL_SETTINGS);
  const [media, setMedia] = useState<{ value: string; label: string }[]>([]);
  const [destinations, setDestinations] = useState<{ value: string; label: string }[]>([]);
  const [tours, setTours] = useState<{ value: string; label: string }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [purging, setPurging] = useState<HotelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(
    null,
  );
  const [filter, setFilter] = useState({
    q: "",
    province: "",
    state: "",
    mode: "",
  });

  const api = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const response = await fetch(url, {
        ...init,
        headers: {
          ...(init.body ? { "content-type": "application/json" } : {}),
          "x-csrf-token": csrf,
          ...(init.headers ?? {}),
        },
      });
      const body = (await response.json().catch(() => ({}))) as unknown;
      if (!response.ok)
        throw new Error(
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : "Không tải được dữ liệu",
        );
      return body;
    },
    [csrf],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hotelRows, roomRows, settingsRows, mediaRows, options] =
        await Promise.all([
          api("/api/admin/content/hotels"),
          api("/api/admin/content/hotelRooms"),
          api("/api/admin/content/settings"),
          api("/api/admin/media"),
          api("/api/admin/options"),
        ]);
      setHotels(hotelRows as HotelRow[]);
      setRooms(
        (
          roomRows as {
            revision: number;
            state: string;
            data: Record<string, unknown>;
          }[]
        ).map((row) => ({
          ...(row.data as HotelRoomRow),
          revision: row.revision,
          state: row.state,
        })),
      );
      const settings = (settingsRows as HotelRow[])[0] ?? null;
      setSettingsRow(settings);
      const stored = settings?.data.hotels as HotelSettings | undefined;
      setFlags(stored ? { ...DEFAULT_HOTEL_SETTINGS, ...stored } : DEFAULT_HOTEL_SETTINGS);
      setMedia(
        (mediaRows as MediaItem[]).map((item) => ({
          value: item.src,
          label: item.alt || item.name,
        })),
      );
      const optionsMap = options as Record<
        string,
        { value: string; label: string }[]
      >;
      setDestinations(optionsMap.destinations ?? []);
      setTours(optionsMap.tours ?? []);
    } catch (cause) {
      setStatus({
        kind: "error",
        message: cause instanceof Error ? cause.message : "Không tải được dữ liệu",
      });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const upload = useCallback(
    async (file: File) => {
      const response = await fetch("/api/admin/media", {
        method: "POST",
        headers: {
          "content-type": file.type,
          "x-csrf-token": csrf,
          "x-image-alt": encodeURIComponent(file.name.slice(0, 200)),
        },
        body: file,
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        src?: string;
        alt?: string;
      };
      if (!response.ok || !body.src)
        throw new Error(body.error ?? "Không tải được ảnh");
      return { src: body.src, alt: body.alt ?? file.name };
    },
    [csrf],
  );

  async function saveFlags(next: HotelSettings) {
    if (!settingsRow) return;
    setBusy(true);
    try {
      const result = (await api("/api/admin/content/settings", {
        method: "POST",
        body: JSON.stringify({
          data: { ...settingsRow.data, hotels: next },
          revision: settingsRow.revision,
          action: "publish",
        }),
      })) as { revision?: number };
      setSettingsRow((current) =>
        current ? { ...current, data: { ...current.data, hotels: next } } : current,
      );
      if (typeof result.revision === "number")
        setSettingsRow((current) =>
          current ? { ...current, revision: result.revision as number } : current,
        );
      setFlags(next);
      setStatus({
        kind: "ok",
        message: next.enabled
          ? next.homeVisible
            ? "Đã bật module và section khách sạn trên trang chủ."
            : "Đã bật module; section trang chủ đang tắt."
          : "Đã tắt module. Public route/API và yêu cầu khách sạn mới bị chặn; dữ liệu và admin vẫn giữ.",
      });
    } catch (cause) {
      setStatus({
        kind: "error",
        message: cause instanceof Error ? cause.message : "Không lưu được cấu hình",
      });
    } finally {
      setBusy(false);
    }
  }

  async function createHotel() {
    setBusy(true);
    try {
      const suffix = Date.now().toString(36).slice(-6);
      const data = {
        id: `hotel_${suffix}`,
        slug: `noi-dung-${suffix}`,
        name: "Khách sạn mới",
        province: "",
        address: "",
        lodgingType: "hotel",
        starRating: null,
        summary: "",
        description: [],
        highlights: [],
        amenities: [],
        images: [],
        policies: [],
        roomMode: "on_request",
        order: hotels.length,
        contentStatus: "demo",
        updatedAt: new Date().toISOString(),
      };
      await api("/api/admin/content/hotels", {
        method: "POST",
        body: JSON.stringify({ data, revision: 0, action: "save" }),
      });
      await load();
      setEditing(`hotel_${suffix}`);
      setStatus({ kind: "ok", message: "Đã tạo bản nháp. Điền thông tin rồi lưu." });
    } catch (cause) {
      setStatus({
        kind: "error",
        message: cause instanceof Error ? cause.message : "Không tạo được khách sạn",
      });
    } finally {
      setBusy(false);
    }
  }

  async function changeState(row: HotelRow, action: "publish" | "unpublish" | "delete" | "restore") {
    setBusy(true);
    try {
      await api("/api/admin/content/hotels", {
        method: "POST",
        body: JSON.stringify({ data: row.data, revision: row.revision, action }),
      });
      await load();
      setStatus({
        kind: "ok",
        message:
          action === "publish"
            ? "Đã xuất bản khách sạn."
            : action === "unpublish"
              ? "Đã ẩn khách sạn khỏi website."
              : action === "delete"
                ? "Đã lưu trữ khách sạn."
                : "Đã khôi phục khách sạn về bản nháp.",
      });
    } catch (cause) {
      setStatus({
        kind: "error",
        message: cause instanceof Error ? cause.message : "Không đổi được trạng thái",
      });
    } finally {
      setBusy(false);
    }
  }

  const roomsOf = useCallback(
    (hotelId: string) =>
      rooms.filter(
        (room) => room.hotelId === hotelId && room.state !== "deleted",
      ),
    [rooms],
  );

  const provinces = useMemo(
    () =>
      [...new Set(hotels.map((row) => text(row.data.province)).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "vi"),
      ),
    [hotels],
  );

  const filtered = useMemo(() => {
    const needle = filter.q.trim().toLocaleLowerCase("vi");
    return hotels.filter((row) => {
      if (row.state === "deleted") return false;
      const name = text(row.data.name).toLocaleLowerCase("vi");
      const province = text(row.data.province);
      const mode = text(row.data.roomMode);
      if (needle && !name.includes(needle)) return false;
      if (filter.province && province !== filter.province) return false;
      if (filter.state && row.state !== filter.state) return false;
      if (filter.mode && mode !== filter.mode) return false;
      return true;
    });
  }, [filter, hotels]);

  const summary = useMemo(() => {
    const counts = { total: hotels.length, published: 0, draft: 0, deleted: 0 };
    for (const row of hotels) {
      if (row.state === "published") counts.published += 1;
      else if (row.state === "deleted") counts.deleted += 1;
      else counts.draft += 1;
    }
    return counts;
  }, [hotels]);

  const activeFilterCount = [filter.q, filter.province, filter.state, filter.mode].filter(
    Boolean,
  ).length;
  const clearFilters = () =>
    setFilter({ q: "", province: "", state: "", mode: "" });

  const hotelKey = (row: HotelRow) => text(row.data.slug) || row.id;
  const featuredOrderOf = (row: HotelRow) => {
    const key = hotelKey(row);
    return flags.featured.findIndex((item) => item === key || item === row.id) + 1;
  };
  // Archived hotels stay visible only when they are already featured, so the
  // editor can always remove a stale selection.
  const featureCandidates = hotels.filter(
    (row) => row.state !== "deleted" || featuredOrderOf(row) > 0,
  );

  const archived = hotels.filter((row) => row.state === "deleted");
  const editingRow = hotels.find((row) => row.id === editing && row.state !== "deleted") ?? null;

  async function emptyTrash() {
    setBusy(true);
    try {
      await api("/api/admin/content/hotels", {
        method: "DELETE",
        body: JSON.stringify(purging.map(({ id, revision }) => ({ id, revision }))),
      });
      await load();
      setStatus({ kind: "ok", message: `Đã xóa vĩnh viễn ${purging.length} khách sạn.` });
    } catch (cause) {
      await load();
      setStatus({
        kind: "error",
        message: cause instanceof Error ? cause.message : "Không dọn được thùng rác",
      });
    } finally {
      setPurging([]);
      setBusy(false);
    }
  }

  if (trashOpen)
    return (
      <section className="stt-hotel-panel" aria-label="Thùng rác khách sạn">
        <div className="stt-hotel-actions">
          <button type="button" className="stt-hotel-action" disabled={busy} onClick={() => setTrashOpen(false)}>
            Về danh sách khách sạn
          </button>
          <button type="button" className="stt-hotel-action stt-hotel-action--danger" disabled={busy || loading || !archived.length} onClick={() => setPurging(archived)}>
            <AdminIcon name="trash" size={14} /> Dọn sạch thùng rác
          </button>
        </div>
        <h2>Thùng rác khách sạn</h2>
        <p>Khách sạn sẽ tự động bị xóa vĩnh viễn sau 60 ngày kể từ khi lưu trữ.</p>
        {status && <p role="status" className={status.kind === "error" ? "adm-field-error" : "adm-notice adm-notice--ok"}>{status.message}</p>}
        {loading ? <p>Đang tải thùng rác…</p> : !archived.length ? <p>Thùng rác đang trống.</p> : (
          <ul className="stt-hotel-trash-list">
            {archived.map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{text(row.data.name)}</strong>
                  {row.updated_at && <small>Lưu trữ ngày {new Date(row.updated_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</small>}
                </div>
                <div className="stt-hotel-actions">
                  <button type="button" className="stt-hotel-action" disabled={busy} onClick={() => void changeState(row, "restore")}>
                    <AdminIcon name="restore" size={14} /> Khôi phục
                  </button>
                  <button type="button" className="stt-hotel-action stt-hotel-action--danger" disabled={busy} onClick={() => setPurging([row])}>
                    Xóa vĩnh viễn
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <ConfirmModal
          request={purging.length ? {
            title: purging.length === 1 ? `Xóa vĩnh viễn ${text(purging[0].data.name)}?` : `Xóa vĩnh viễn ${purging.length} khách sạn?`,
            body: "Hạng phòng, giá, lịch phòng và liên kết tour của khách sạn cũng sẽ bị xóa. Thao tác này không thể hoàn tác.",
            confirmLabel: "Xóa vĩnh viễn",
            danger: true,
          } : null}
          busy={busy}
          onCancel={() => { if (!busy) setPurging([]); }}
          onConfirm={() => void emptyTrash()}
        />
      </section>
    );

  if (editingRow)
    return (
      <HotelEditor
        key={editingRow.id}
        csrf={csrf}
        hotel={editingRow}
        rooms={roomsOf(editingRow.id)}
        destinationOptions={destinations}
        tourOptions={tours}
        media={media}
        upload={upload}
        onSaved={load}
        onClose={() => setEditing(null)}
        onStatus={(kind, message) => {
          if (kind === "error") notify("error", message);
          setStatus({ kind, message });
        }}
      />
    );

  return (
    <div className="stt-hotel-panel">
      <div className="stt-hotel-actions">
        <button type="button" className="stt-hotel-action" disabled={busy || loading} onClick={() => {
          setStatus(null);
          setTrashOpen(true);
          void load();
        }}>
          <AdminIcon name="trash" size={14} /> Thùng rác ({archived.length})
        </button>
      </div>
      {status ? (
        <p
          className={
            status.kind === "ok" ? "adm-notice adm-notice--ok" : "adm-field-error"
          }
          role="status"
        >
          {status.message}
        </p>
      ) : null}

      <section className="stt-hotel-summary" aria-label="Tổng quan danh mục khách sạn">
        <div className="stt-hotel-kpi" data-tone="total">
          <span className="stt-hotel-kpi-icon" aria-hidden="true">
            <AdminIcon name="home" size={16} />
          </span>
          <span className="stt-hotel-kpi-copy">
            <span>Tổng khách sạn</span>
            <strong>{summary.total}</strong>
          </span>
        </div>
        <div className="stt-hotel-kpi" data-tone="published">
          <span className="stt-hotel-kpi-icon" aria-hidden="true">
            <AdminIcon name="eye" size={16} />
          </span>
          <span className="stt-hotel-kpi-copy">
            <span>Đang hiển thị</span>
            <strong>{summary.published}</strong>
          </span>
        </div>
        <div className="stt-hotel-kpi" data-tone="draft">
          <span className="stt-hotel-kpi-icon" aria-hidden="true">
            <AdminIcon name="edit" size={16} />
          </span>
          <span className="stt-hotel-kpi-copy">
            <span>Bản nháp</span>
            <strong>{summary.draft}</strong>
          </span>
        </div>
        <div className="stt-hotel-kpi" data-tone="deleted">
          <span className="stt-hotel-kpi-icon" aria-hidden="true">
            <AdminIcon name="trash" size={16} />
          </span>
          <span className="stt-hotel-kpi-copy">
            <span>Đã lưu trữ</span>
            <strong>{summary.deleted}</strong>
          </span>
        </div>
      </section>

      <section className="stt-hotel-admin-card" aria-labelledby="hotel-flags-title">
        <div className="stt-hotel-admin-card-head">
          <div>
            <p className="stt-hotel-eyebrow">Cấu hình hiển thị</p>
            <h3 id="hotel-flags-title">Module &amp; trang chủ</h3>
            <p className="stt-hotel-sub">
              Bật module để mở menu, danh sách, chi tiết và form yêu cầu trên
              website.
            </p>
          </div>
          <span className="stt-hotel-pill" data-on={flags.enabled ? "true" : "false"}>
            {flags.enabled ? "Đang bật" : "Đang tắt"}
          </span>
        </div>

        <div className="stt-hotel-switch-grid">
          <label
            className="stt-hotel-switch"
            data-disabled={busy || !settingsRow ? "true" : undefined}
          >
            <span className="stt-hotel-switch-icon" aria-hidden="true">
              <AdminIcon name="eye" size={16} />
            </span>
            <span className="stt-hotel-switch-copy">
              <strong>Module Khách sạn</strong>
              <small>Menu, danh sách, chi tiết và form yêu cầu.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={flags.enabled}
              disabled={busy || !settingsRow}
              onChange={(event) =>
                void saveFlags({
                  ...flags,
                  enabled: event.target.checked,
                  homeVisible: event.target.checked ? flags.homeVisible : false,
                })
              }
            />
            <span className="stt-hotel-switch-track" aria-hidden="true" />
          </label>
          <label
            className="stt-hotel-switch"
            data-disabled={busy || !flags.enabled ? "true" : undefined}
          >
            <span className="stt-hotel-switch-icon" aria-hidden="true">
              <AdminIcon name="home" size={16} />
            </span>
            <span className="stt-hotel-switch-copy">
              <strong>Section trên trang chủ</strong>
              <small>Hiện khối khách sạn nổi bật ngay dưới hero.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={flags.homeVisible}
              disabled={busy || !flags.enabled}
              onChange={(event) =>
                void saveFlags({ ...flags, homeVisible: event.target.checked })
              }
            />
            <span className="stt-hotel-switch-track" aria-hidden="true" />
          </label>
        </div>

        <div className="stt-hotel-featured">
          <div className="stt-hotel-featured-head">
            <div>
              <h4>Khách sạn nổi bật trên trang chủ</h4>
              <p>Chọn tối đa {MAX_FEATURED}. Thứ tự chọn là thứ tự hiển thị.</p>
            </div>
            <span className="stt-hotel-count">
              {flags.featured.length}/{MAX_FEATURED}
            </span>
          </div>

          <div className="stt-hotel-featured-grid">
            {featureCandidates.map((row) => {
              const key = hotelKey(row);
              const order = featuredOrderOf(row);
              const active = order > 0;
              const disabled =
                busy || (!active && flags.featured.length >= MAX_FEATURED);
              const name = text(row.data.name, row.id);
              const image = Array.isArray(row.data.images)
                ? (row.data.images[0] as { src?: string } | undefined)
                : undefined;
              const lodging =
                LODGING_LABELS[
                  text(row.data.lodgingType, "hotel") as LodgingType
                ] ?? text(row.data.lodgingType);

              return (
                <label
                  key={row.id}
                  className="stt-hotel-feature-card"
                  data-selected={active ? "true" : undefined}
                  data-disabled={disabled ? "true" : undefined}
                  title={name}
                >
                  {image?.src ? (
                    <Image
                      className="stt-hotel-feature-thumb"
                      src={image.src}
                      alt=""
                      width={40}
                      height={40}
                    />
                  ) : (
                    <span
                      className="stt-hotel-feature-thumb stt-hotel-feature-thumb--empty"
                      aria-hidden="true"
                    >
                      <AdminIcon name="image" size={15} />
                    </span>
                  )}
                  <span className="stt-hotel-feature-copy">
                    <strong>{name}</strong>
                    <small>
                      {text(row.data.province, "Chưa có điểm đến")} · {lodging}
                    </small>
                  </span>
                  {active ? (
                    <span
                      className="stt-hotel-feature-order"
                      aria-label={`Thứ tự ${order}`}
                    >
                      {order}
                    </span>
                  ) : null}
                  <input
                    type="checkbox"
                    checked={active}
                    disabled={disabled}
                    aria-label={`Chọn ${name} làm khách sạn nổi bật`}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...flags.featured, key]
                        : flags.featured.filter(
                            (item) => item !== key && item !== row.id,
                          );
                      void saveFlags({ ...flags, featured: next });
                    }}
                  />
                </label>
              );
            })}
            {featureCandidates.length === 0 ? (
              <p className="adm-empty-note">Chưa có khách sạn để chọn.</p>
            ) : null}
          </div>

          <p className="stt-hotel-hint">
            Không chọn gì thì trang chủ dùng thứ tự đề xuất trong danh sách.
          </p>
        </div>

        <p className="stt-hotel-hint stt-hotel-hint--muted">
          Tắt module không xoá nội dung hay yêu cầu cũ. Public route trả 404 và
          form mới bị từ chối; lead tour vẫn hoạt động bình thường. Công tắc chỉ
          có hiệu lực sau khi lưu &amp; xuất bản.
        </p>
      </section>

      <section className="stt-hotel-admin-card" aria-labelledby="hotel-list-title">
        <div className="stt-hotel-list-head">
          <div>
            <p className="stt-hotel-eyebrow">Danh mục</p>
            <h3 id="hotel-list-title">Danh sách khách sạn</h3>
            <p className="stt-hotel-sub">
              {filtered.length === hotels.length
                ? `${hotels.length} khách sạn`
                : `${filtered.length} / ${hotels.length} khách sạn`}
            </p>
          </div>
          <button
            type="button"
            className="adm-primary stt-hotel-add"
            disabled={busy}
            onClick={() => void createHotel()}
          >
            <AdminIcon name="plus" size={14} /> Thêm khách sạn
          </button>
        </div>

        <div className="stt-hotel-filters">
          <label className="stt-hotel-filter stt-hotel-filter--search">
            <span>Tìm tên</span>
            <span className="stt-hotel-search">
              <AdminIcon name="search" size={15} />
              <input
                value={filter.q}
                placeholder="Tên khách sạn…"
                onChange={(event) =>
                  setFilter({ ...filter, q: event.target.value })
                }
              />
            </span>
          </label>
          <label className="stt-hotel-filter">
            <span>Điểm đến</span>
            <select
              value={filter.province}
              onChange={(event) =>
                setFilter({ ...filter, province: event.target.value })
              }
            >
              <option value="">Tất cả điểm đến</option>
              {provinces.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </label>
          <label className="stt-hotel-filter">
            <span>Trạng thái</span>
            <select
              value={filter.state}
              onChange={(event) =>
                setFilter({ ...filter, state: event.target.value })
              }
            >
              <option value="">Tất cả trạng thái</option>
              <option value="published">Đang hiển thị</option>
              <option value="draft">Bản nháp</option>
            </select>
          </label>
          <label className="stt-hotel-filter">
            <span>Chế độ phòng</span>
            <select
              value={filter.mode}
              onChange={(event) =>
                setFilter({ ...filter, mode: event.target.value })
              }
            >
              <option value="">Tất cả chế độ</option>
              <option value="on_request">Cần kiểm tra</option>
              <option value="manual_daily">Số phòng theo ngày</option>
            </select>
          </label>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              className="stt-hotel-filter-reset"
              onClick={clearFilters}
            >
              Xoá lọc ({activeFilterCount})
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="stt-hotel-empty" role="status">
            <span className="stt-hotel-empty-icon" aria-hidden="true">
              <AdminIcon name="refresh" size={20} />
            </span>
            <p>Đang tải khách sạn…</p>
          </div>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <div className="stt-hotel-empty">
            <span className="stt-hotel-empty-icon" aria-hidden="true">
              <AdminIcon name="home" size={20} />
            </span>
            <h4>{hotels.length === 0 ? "Chưa có khách sạn" : "Không có kết quả"}</h4>
            <p>
              {hotels.length === 0
                ? "Tạo bản nháp đầu tiên để bắt đầu xây danh mục lưu trú."
                : "Thử đổi từ khoá hoặc xoá bộ lọc để xem lại toàn bộ danh mục."}
            </p>
            {hotels.length === 0 ? (
              <button
                type="button"
                className="adm-primary"
                disabled={busy}
                onClick={() => void createHotel()}
              >
                <AdminIcon name="plus" size={14} /> Thêm khách sạn
              </button>
            ) : (
              <button type="button" className="stt-hotel-action" onClick={clearFilters}>
                Xoá bộ lọc
              </button>
            )}
          </div>
        ) : null}

        {filtered.length > 0 ? (
          <div className="stt-hotel-table-wrap">
            <table className="stt-hotel-table">
              <thead>
                <tr>
                  <th scope="col">Khách sạn</th>
                  <th scope="col">Điểm đến</th>
                  <th scope="col">Loại phòng</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Cập nhật</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const image = Array.isArray(row.data.images)
                    ? (row.data.images[0] as { src?: string } | undefined)
                    : undefined;
                  const name = text(row.data.name, row.id);
                  const slug = text(row.data.slug);
                  const roomCount = roomsOf(row.id).length;
                  const lodging =
                    LODGING_LABELS[
                      text(row.data.lodgingType, "hotel") as LodgingType
                    ] ?? text(row.data.lodgingType);
                  const star = row.data.starRating
                    ? ` · ${row.data.starRating} sao`
                    : "";
                  const mode =
                    text(row.data.roomMode) === "manual_daily"
                      ? "Số phòng theo ngày"
                      : "Cần kiểm tra";

                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="stt-hotel-identity">
                          {image?.src ? (
                            <Image
                              className="stt-hotel-thumb"
                              src={image.src}
                              alt=""
                              width={64}
                              height={48}
                            />
                          ) : (
                            <span
                              className="stt-hotel-thumb stt-hotel-thumb--empty"
                              aria-hidden="true"
                            >
                              <AdminIcon name="image" size={17} />
                            </span>
                          )}
                          <span className="stt-hotel-identity-copy">
                            <strong>{name}</strong>
                            <small>
                              {lodging}
                              {star}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td data-label="Điểm đến">
                        <span className="stt-hotel-place">
                          <AdminIcon name="map" size={13} />
                          {text(row.data.province, "—")}
                        </span>
                      </td>
                      <td data-label="Loại phòng">
                        <span className="stt-hotel-roomcount">
                          <strong>
                            {roomCount > 0 ? `${roomCount} loại` : "Chưa có"}
                          </strong>
                          <small>{mode}</small>
                        </span>
                      </td>
                      <td data-label="Trạng thái">
                        <span className="stt-hotel-state" data-state={row.state}>
                          {STATE_LABEL[row.state] ?? row.state}
                        </span>
                      </td>
                      <td data-label="Cập nhật">
                        {text(row.data.updatedAt).slice(0, 10) || "—"}
                      </td>
                      <td>
                        <div className="stt-hotel-actions">
                          <button
                            type="button"
                            className="stt-hotel-action stt-hotel-action--primary"
                            onClick={() => setEditing(row.id)}
                          >
                            <AdminIcon name="edit" size={13} /> Sửa
                          </button>
                          {row.state === "published" && slug ? (
                            <Link
                              className="stt-hotel-action"
                              href={`/khach-san/${slug}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <AdminIcon name="eye" size={13} /> Xem
                            </Link>
                          ) : row.state === "draft" ? (
                            <Link
                              className="stt-hotel-action"
                              href={`/admin/preview/hotels/${row.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <AdminIcon name="eye" size={13} /> Xem trước
                            </Link>
                          ) : null}
                          {row.state === "published" ? (
                            <button
                              type="button"
                              className="stt-hotel-action"
                              disabled={busy}
                              onClick={() => void changeState(row, "unpublish")}
                            >
                              Ẩn
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="stt-hotel-action"
                              disabled={busy}
                              onClick={() => void changeState(row, "publish")}
                            >
                              Xuất bản
                            </button>
                          )}
                          <button
                            type="button"
                            className="stt-hotel-action stt-hotel-action--danger"
                            disabled={busy}
                            onClick={() => void changeState(row, "delete")}
                          >
                            <AdminIcon name="trash" size={13} /> Lưu trữ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
