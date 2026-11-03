"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { LODGING_LABELS, type LodgingType } from "@/domain/hotel";
import { HotelEditor, type HotelRoomRow, type HotelRow } from "./hotel-editor";
import { Field, text } from "./hotel-form";
import { AdminIcon } from "./admin-icons";
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

export function HotelsPanel({ csrf }: { csrf: string }) {
  const [hotels, setHotels] = useState<HotelRow[]>([]);
  const [rooms, setRooms] = useState<HotelRoomRow[]>([]);
  const [settingsRow, setSettingsRow] = useState<HotelRow | null>(null);
  const [flags, setFlags] = useState<HotelSettings>(DEFAULT_HOTEL_SETTINGS);
  const [media, setMedia] = useState<{ value: string; label: string }[]>([]);
  const [destinations, setDestinations] = useState<{ value: string; label: string }[]>([]);
  const [tours, setTours] = useState<{ value: string; label: string }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
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
          ? "Đã bật module khách sạn trên website."
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

  const editingRow = hotels.find((row) => row.id === editing) ?? null;

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
        onStatus={(kind, message) => setStatus({ kind, message })}
      />
    );

  return (
    <div className="stt-hotel-panel">
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

      <section className="stt-hotel-flags" aria-labelledby="hotel-flags-title">
        <h3 id="hotel-flags-title">Công tắc module trên website</h3>
        <label className="adm-toggle">
          <input
            type="checkbox"
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
          <span>
            Bật module Khách sạn (menu, danh sách, chi tiết, form yêu cầu)
          </span>
        </label>
        <label className="adm-toggle">
          <input
            type="checkbox"
            checked={flags.homeVisible}
            disabled={busy || !flags.enabled}
            onChange={(event) =>
              void saveFlags({ ...flags, homeVisible: event.target.checked })
            }
          />
          <span>Hiện section khách sạn trên trang chủ</span>
        </label>
        <p className="adm-hint">
          Tắt module không xoá nội dung hay yêu cầu cũ. Public route trả 404 và
          form mới bị từ chối; lead tour vẫn hoạt động bình thường. Công tắc chỉ
          có hiệu lực sau khi lưu &amp; xuất bản.
        </p>
        <div>
          <span className="adm-field-label">
            Khách sạn nổi bật trên trang chủ (tối đa {MAX_FEATURED}, theo thứ tự)
          </span>
          <div className="adm-chips">
            {hotels.map((row) => {
              const active = flags.featured.includes(row.id) ||
                flags.featured.includes(text(row.data.slug));
              return (
                <label key={row.id} className="stt-hotel-weekday">
                  <input
                    type="checkbox"
                    checked={active}
                    disabled={
                      busy ||
                      (!active && flags.featured.length >= MAX_FEATURED)
                    }
                    onChange={(event) => {
                      const key = text(row.data.slug) || row.id;
                      const next = event.target.checked
                        ? [...flags.featured, key]
                        : flags.featured.filter(
                            (item) => item !== key && item !== row.id,
                          );
                      void saveFlags({ ...flags, featured: next });
                    }}
                  />
                  <span>{text(row.data.name, row.id)}</span>
                </label>
              );
            })}
            {hotels.length === 0 ? (
              <span className="adm-empty-note">Chưa có khách sạn để chọn.</span>
            ) : null}
          </div>
          <p className="adm-hint">
            Không chọn gì thì trang chủ dùng thứ tự đề xuất trong danh sách.
          </p>
        </div>
      </section>

      <div className="stt-hotel-toolbar">
        <Field label="Tìm tên">
          <input
            value={filter.q}
            placeholder="Tên khách sạn"
            onChange={(event) => setFilter({ ...filter, q: event.target.value })}
          />
        </Field>
        <Field label="Điểm đến">
          <select
            value={filter.province}
            onChange={(event) => setFilter({ ...filter, province: event.target.value })}
          >
            <option value="">Tất cả</option>
            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Trạng thái">
          <select
            value={filter.state}
            onChange={(event) => setFilter({ ...filter, state: event.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="published">Đang hiển thị</option>
            <option value="draft">Bản nháp</option>
            <option value="deleted">Đã lưu trữ</option>
          </select>
        </Field>
        <Field label="Chế độ phòng">
          <select
            value={filter.mode}
            onChange={(event) => setFilter({ ...filter, mode: event.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="on_request">Cần kiểm tra</option>
            <option value="manual_daily">Số phòng theo ngày</option>
          </select>
        </Field>
        <button type="button" className="adm-primary" disabled={busy} onClick={() => void createHotel()}>
          <AdminIcon name="plus" size={14} /> Thêm khách sạn
        </button>
      </div>

      {loading ? <p className="adm-empty">Đang tải khách sạn…</p> : null}
      {!loading && filtered.length === 0 ? (
        <p className="adm-empty">
          {hotels.length === 0
            ? "Chưa có khách sạn nào. Bấm “Thêm khách sạn” để tạo bản nháp."
            : "Không có khách sạn khớp bộ lọc hiện tại."}
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <table className="stt-hotel-table">
          <thead>
            <tr>
              <th scope="col">Ảnh</th>
              <th scope="col">Tên</th>
              <th scope="col">Điểm đến</th>
              <th scope="col">Hạng phòng</th>
              <th scope="col">Xuất bản</th>
              <th scope="col">Cập nhật</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const image = Array.isArray(row.data.images)
                ? (row.data.images[0] as { src?: string } | undefined)
                : undefined;
              return (
                <tr key={row.id}>
                  <td>
                    {image?.src ? (
                      <Image
                        className="stt-hotel-thumb"
                        src={image.src}
                        alt=""
                        width={56}
                        height={40}
                      />
                    ) : (
                      <span className="stt-hotel-thumb" aria-hidden="true" />
                    )}
                  </td>
                  <td>
                    <strong>{text(row.data.name, row.id)}</strong>
                    <br />
                    <small className="adm-hint">
                      {LODGING_LABELS[text(row.data.lodgingType, "hotel") as LodgingType] ??
                        text(row.data.lodgingType)}
                      {row.data.starRating ? ` · ${row.data.starRating} sao` : ""}
                    </small>
                  </td>
                  <td>{text(row.data.province, "—")}</td>
                  <td>{roomsOf(row.id).length}</td>
                  <td>
                    <span className="stt-hotel-state" data-state={row.state}>
                      {STATE_LABEL[row.state] ?? row.state}
                    </span>
                  </td>
                  <td>{text(row.data.updatedAt).slice(0, 10)}</td>
                  <td>
                    <div className="stt-hotel-actions">
                      <button
                        type="button"
                        className="adm-ghost-link"
                        onClick={() => setEditing(row.id)}
                      >
                        Sửa
                      </button>
                      {row.state === "published" ? (
                        <button
                          type="button"
                          className="adm-ghost-link"
                          disabled={busy}
                          onClick={() => void changeState(row, "unpublish")}
                        >
                          Ẩn
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="adm-ghost-link"
                          disabled={busy}
                          onClick={() => void changeState(row, "publish")}
                        >
                          Xuất bản
                        </button>
                      )}
                      {row.state === "deleted" ? (
                        <button
                          type="button"
                          className="adm-ghost-link"
                          disabled={busy}
                          onClick={() => void changeState(row, "restore")}
                        >
                          Khôi phục
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="adm-danger"
                          disabled={busy}
                          onClick={() => void changeState(row, "delete")}
                        >
                          Lưu trữ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
