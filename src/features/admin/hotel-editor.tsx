"use client";

import { useCallback, useMemo, useState } from "react";
import { MAX_ROOM_IMAGES, type HotelRoom } from "@/domain/hotel-room";
import { LODGING_TYPES, LODGING_LABELS } from "@/domain/hotel";
import type { TourLink } from "@/server/hotels/store";
import type { TourRelation } from "@/domain/hotel-pricing";
import { HotelCalendar } from "./hotel-calendar";
import {
  ChipsField,
  Field,
  GalleryField,
  LinesField,
  imagesOf,
  numberOf,
  text,
} from "./hotel-form";

/**
 * Hotel editor: content, gallery, rooms, price/availability and tour links.
 *
 * The draft in this component is only a form state. The server validates the
 * schema again, so a stale client can never publish an invalid hotel.
 */

export type HotelRow = {
  id: string;
  revision: number;
  state: string;
  data: Record<string, unknown>;
};

/** A room record plus the CMS bookkeeping the editor needs to save it. */
export type HotelRoomRow = HotelRoom & { revision?: number; state?: string };

type Props = {
  csrf: string;
  hotel: HotelRow;
  rooms: HotelRoomRow[];
  destinationOptions: { value: string; label: string }[];
  tourOptions: { value: string; label: string }[];
  media: { value: string; label: string }[];
  upload: (file: File) => Promise<{ src: string; alt: string }>;
  onSaved: () => Promise<void>;
  onClose: () => void;
  onStatus: (kind: "ok" | "error", message: string) => void;
};

const TABS = [
  ["info", "1 · Thông tin"],
  ["media", "2 · Ảnh & tiện ích"],
  ["rooms", "3 · Hạng phòng"],
  ["rates", "4 · Giá & tình trạng"],
  ["publish", "5 · Tour & xuất bản"],
] as const;
type TabKey = (typeof TABS)[number][0];

const RELATION_LABEL: Record<TourRelation, string> = {
  included: "Đã bao gồm trong tour",
  upgrade: "Nâng hạng — báo chênh lệch",
  additional: "Cộng thêm, báo giá riêng",
};

const STATE_LABEL: Record<string, string> = {
  published: "Đang hiển thị",
  draft: "Bản nháp",
  deleted: "Đã lưu trữ",
};

export function HotelEditor({
  csrf,
  hotel,
  rooms,
  destinationOptions,
  tourOptions,
  media,
  upload,
  onSaved,
  onClose,
  onStatus,
}: Props) {
  const [tab, setTab] = useState<TabKey>("info");
  const [draft, setDraft] = useState<Record<string, unknown>>(hotel.data);
  const [revision, setRevision] = useState(hotel.revision);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [roomEditing, setRoomEditing] = useState<string | null>(null);
  const [roomsDraft, setRoomsDraft] = useState<HotelRoomRow[]>([]);
  const [links, setLinks] = useState<TourLink[]>([]);
  const [linksLoaded, setLinksLoaded] = useState(false);

  // A room created here moves into the server list after its first save. This
  // is derived so the effect never has to reset local state.
  const pendingRooms = roomsDraft.filter(
    (room) => !rooms.some((item) => item.id === room.id),
  );

  const set = useCallback((key: string, value: unknown) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const report = useCallback(
    (kind: "ok" | "error", message: string) => {
      if (kind === "ok") {
        setNotice(message);
        setError("");
      } else {
        setError(message);
        setNotice("");
      }
      onStatus(kind, message);
    },
    [onStatus],
  );

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
      const body = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok)
        throw new Error(
          typeof body.error === "string" ? body.error : "Không lưu được dữ liệu",
        );
      return body;
    },
    [csrf],
  );

  async function saveContent(action: "save" | "publish") {
    setBusy(true);
    setError("");
    try {
      const clean = {
        ...draft,
        images: imagesOf(draft.images).filter((image) => image.src),
        _en: cleanTranslation(draft._en),
      };
      const result = await api("/api/admin/content/hotels", {
        method: "POST",
        body: JSON.stringify({ data: clean, revision, action }),
      });
      setRevision(Number(result.revision ?? revision + 1));
      report(
        "ok",
        action === "publish"
          ? "Đã xuất bản khách sạn. Website dùng ngay bản mới."
          : "Đã lưu nháp. Website chưa thay đổi.",
      );
      await onSaved();
    } catch (cause) {
      report(
        "error",
        cause instanceof Error ? cause.message : "Không lưu được",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeState(action: "unpublish" | "delete" | "restore") {
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/admin/content/hotels", {
        method: "POST",
        body: JSON.stringify({ data: draft, revision, action }),
      });
      setRevision(Number(result.revision ?? revision + 1));
      report(
        "ok",
        action === "unpublish"
          ? "Đã ẩn khách sạn khỏi website. Dữ liệu và yêu cầu cũ vẫn giữ."
          : action === "delete"
            ? "Đã lưu trữ khách sạn. Hồ sơ yêu cầu cũ không bị ảnh hưởng."
            : "Đã khôi phục về bản nháp.",
      );
      await onSaved();
    } catch (cause) {
      report(
        "error",
        cause instanceof Error ? cause.message : "Không đổi được trạng thái",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadLinks() {
    if (linksLoaded) return;
    try {
      const result = await api(`/api/admin/hotels/${hotel.id}/tour-links`);
      setLinks((result.links ?? []) as TourLink[]);
      setLinksLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được tour liên kết");
    }
  }

  async function saveLinks() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/hotels/${hotel.id}/tour-links`, {
        method: "POST",
        body: JSON.stringify({ links }),
      });
      report("ok", "Đã lưu quan hệ tour. Yêu cầu mới sẽ dùng quan hệ này.");
    } catch (cause) {
      report(
        "error",
        cause instanceof Error ? cause.message : "Không lưu được liên kết",
      );
    } finally {
      setBusy(false);
    }
  }

  const en = (draft._en ?? {}) as Record<string, unknown>;
  const setEn = (key: string, value: unknown) =>
    set("_en", { ...en, [key]: value });
  const seo = (draft.seo ?? {}) as Record<string, unknown>;
  const setSeo = (key: string, value: string) =>
    set("seo", { ...seo, [key]: value || undefined });

  const roomIds = useMemo(() => rooms.map((room) => room.id), [rooms]);

  return (
    <section className="adm-editor stt-hotel-editor" aria-label="Sửa khách sạn">
      <header className="adm-editor-header">
        <div>
          <p className="adm-eyebrow">
            {STATE_LABEL[hotel.state] ?? hotel.state} · revision {revision}
          </p>
          <h2 className="adm-editor-heading">{text(draft.name, hotel.id)}</h2>
          <p className="adm-hint">
            {hotel.state === "published"
              ? "Bản đã xuất bản đang chạy trên website; lưu nháp không đổi nội dung công khai."
              : "Bản nháp chỉ hiện ở Studio và preview."}
          </p>
        </div>
        <div className="stt-hotel-actions">
          <a
            className="adm-ghost-link"
            href={`/admin/preview/hotels/${hotel.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Xem trước
          </a>
          <button type="button" className="adm-ghost-link" onClick={onClose}>
            <span aria-hidden="true">←</span> Về danh sách
          </button>
        </div>
      </header>

      {error ? (
        <p className="adm-field-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="adm-notice adm-notice--ok" role="status">
          {notice}
        </p>
      ) : null}

      <div className="stt-hotel-tabs" role="tablist" aria-label="Phần nội dung khách sạn">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className="stt-hotel-tab"
            data-active={tab === key}
            onClick={() => {
              setTab(key);
              if (key === "publish") void loadLinks();
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "info" ? (
        <div className="stt-hotel-section">
          <div className="stt-hotel-grid2">
            <Field label="Tên khách sạn">
              <input
                value={text(draft.name)}
                maxLength={160}
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
            <Field
              label="Slug"
              hint={
                revision > 0
                  ? "Slug đã phát hành được giữ cố định để không phá liên kết."
                  : "Tự sinh từ tên nếu để trống."
              }
            >
              <input
                value={text(draft.slug)}
                maxLength={80}
                readOnly={revision > 0}
                onChange={(event) => set("slug", event.target.value)}
              />
            </Field>
            <Field label="Tỉnh / thành">
              <input
                value={text(draft.province)}
                maxLength={80}
                onChange={(event) => set("province", event.target.value)}
              />
            </Field>
            <Field label="Điểm đến liên kết" hint="Dùng cho bộ lọc điểm đến và thẻ trên trang chủ.">
              <select
                value={text(draft.destinationId)}
                onChange={(event) =>
                  set("destinationId", event.target.value || undefined)
                }
              >
                <option value="">Không gắn điểm đến</option>
                {destinationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Địa chỉ">
              <input
                value={text(draft.address)}
                maxLength={240}
                onChange={(event) => set("address", event.target.value)}
              />
            </Field>
            <Field label="Link bản đồ (https)" hint="Chỉ nhận liên kết https, không nhúng iframe.">
              <input
                value={text(draft.mapUrl)}
                maxLength={500}
                placeholder="https://maps.google.com/…"
                onChange={(event) => set("mapUrl", event.target.value || undefined)}
              />
            </Field>
            <Field label="Loại lưu trú">
              <select
                value={text(draft.lodgingType, "hotel")}
                onChange={(event) => set("lodgingType", event.target.value)}
              >
                {LODGING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {LODGING_LABELS[type]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hạng sao (1–5)" hint="Để trống nếu chưa có căn cứ công bố.">
              <select
                value={draft.starRating === null || draft.starRating === undefined ? "" : String(draft.starRating)}
                onChange={(event) =>
                  set(
                    "starRating",
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              >
                <option value="">Chưa xác định</option>
                {[1, 2, 3, 4, 5].map((star) => (
                  <option key={star} value={star}>
                    {star} sao
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Căn cứ hạng sao" hint="Bắt buộc khi chọn sao, ví dụ “theo công bố của khách sạn”.">
              <input
                value={text(draft.starBasis)}
                maxLength={160}
                onChange={(event) => set("starBasis", event.target.value || undefined)}
              />
            </Field>
            <Field label="Giờ nhận phòng">
              <input
                value={text(draft.checkInTime)}
                placeholder="14:00"
                maxLength={5}
                onChange={(event) => set("checkInTime", event.target.value || undefined)}
              />
            </Field>
            <Field label="Giờ trả phòng">
              <input
                value={text(draft.checkOutTime)}
                placeholder="12:00"
                maxLength={5}
                onChange={(event) => set("checkOutTime", event.target.value || undefined)}
              />
            </Field>
            <Field label="Thứ tự đề xuất" hint="Số nhỏ hiện trước trong danh sách.">
              <input
                inputMode="numeric"
                value={String(numberOf(draft.order, 0))}
                onChange={(event) =>
                  set("order", Number(event.target.value.replace(/[^\d]/g, "") || 0))
                }
              />
            </Field>
            <Field label="Chế độ tình trạng phòng">
              <select
                value={text(draft.roomMode, "on_request")}
                onChange={(event) => set("roomMode", event.target.value)}
              >
                <option value="on_request">Cần kiểm tra (mặc định)</option>
                <option value="manual_daily">Nhập số phòng tham khảo theo ngày</option>
              </select>
            </Field>
          </div>

          <Field label="Giới thiệu ngắn" hint="Tối đa 400 ký tự, hiện trên thẻ danh sách.">
            <textarea
              rows={3}
              value={text(draft.summary)}
              maxLength={400}
              onChange={(event) => set("summary", event.target.value)}
            />
          </Field>
          <LinesField
            label="Bài giới thiệu"
            hint="Mỗi dòng là một đoạn văn."
            value={Array.isArray(draft.description) ? (draft.description as string[]) : []}
            onChange={(value) => set("description", value)}
          />
          <LinesField
            label="Điểm nổi bật"
            hint="Mỗi dòng một ý, tối đa 10."
            value={Array.isArray(draft.highlights) ? (draft.highlights as string[]) : []}
            onChange={(value) => set("highlights", value)}
            rows={3}
          />
          <ChipsField
            label="Tiện ích"
            hint="Ngăn cách bằng dấu phẩy."
            value={Array.isArray(draft.amenities) ? (draft.amenities as string[]) : []}
            onChange={(value) => set("amenities", value)}
          />
          <LinesField
            label="Chính sách"
            hint="Mỗi dòng một chính sách đã xác nhận; không ghi chính sách chưa kiểm tra."
            value={Array.isArray(draft.policies) ? (draft.policies as string[]) : []}
            onChange={(value) => set("policies", value)}
            rows={3}
          />

          <details>
            <summary>Tiêu đề SEO và bản tiếng Anh</summary>
            <div className="stt-hotel-grid2">
              <Field label="SEO title">
                <input
                  value={text(seo.title)}
                  maxLength={90}
                  onChange={(event) => setSeo("title", event.target.value)}
                />
              </Field>
              <Field label="SEO description">
                <input
                  value={text(seo.description)}
                  maxLength={220}
                  onChange={(event) => setSeo("description", event.target.value)}
                />
              </Field>
              <Field label="Tên tiếng Anh">
                <input
                  value={text(en.name)}
                  maxLength={160}
                  onChange={(event) => setEn("name", event.target.value || undefined)}
                />
              </Field>
              <Field label="Giới thiệu tiếng Anh">
                <input
                  value={text(en.summary)}
                  maxLength={400}
                  onChange={(event) => setEn("summary", event.target.value || undefined)}
                />
              </Field>
              <Field label="Địa chỉ tiếng Anh">
                <input
                  value={text(en.address)}
                  maxLength={240}
                  onChange={(event) => setEn("address", event.target.value || undefined)}
                />
              </Field>
            </div>
            <label className="adm-toggle">
              <input
                type="checkbox"
                checked={draft._enReviewed === true}
                onChange={(event) => set("_enReviewed", event.target.checked)}
              />
              <span>Bản tiếng Anh đã được duyệt (chỉ khi duyệt mới được index)</span>
            </label>
          </details>

          <div className="stt-hotel-actions">
            <button
              type="button"
              className="adm-primary"
              disabled={busy}
              onClick={() => void saveContent("save")}
            >
              {busy ? "Đang lưu…" : "Lưu nháp"}
            </button>
            <button
              type="button"
              className="adm-ghost-link"
              disabled={busy}
              onClick={() => void saveContent("publish")}
            >
              Lưu và xuất bản
            </button>
          </div>
        </div>
      ) : null}

      {tab === "media" ? (
        <div className="stt-hotel-section">
          <GalleryField
            label="Ảnh khách sạn"
            hint="Ảnh đầu tiên là ảnh bìa. Alt bắt buộc để đạt accessibility."
            value={imagesOf(draft.images)}
            media={media}
            upload={upload}
            onChange={(value) => set("images", value)}
          />
          <ChipsField
            label="Tiện ích nổi bật"
            value={Array.isArray(draft.amenities) ? (draft.amenities as string[]) : []}
            onChange={(value) => set("amenities", value)}
          />
          <div className="stt-hotel-actions">
            <button
              type="button"
              className="adm-primary"
              disabled={busy}
              onClick={() => void saveContent("save")}
            >
              Lưu nháp
            </button>
          </div>
        </div>
      ) : null}

      {tab === "rooms" ? (
        <div className="stt-hotel-section">
          <div className="stt-hotel-section-head">
            <h3>Hạng phòng</h3>
            <p className="adm-hint">
              Mỗi hạng phòng lưu và xuất bản riêng. Lưu trữ không xoá hồ sơ yêu cầu
              cũ; ảnh và giá của phòng thuộc khách sạn này.
            </p>
          </div>
          {rooms.length === 0 ? (
            <p className="adm-empty-note">Chưa có hạng phòng nào.</p>
          ) : null}
          {rooms.map((room) => (
            <RoomRow
              key={`${room.id}-${room.revision ?? 0}`}
              csrf={csrf}
              hotelId={hotel.id}
              room={room}
              media={media}
              upload={upload}
              open={roomEditing === room.id}
              onToggle={() =>
                setRoomEditing(roomEditing === room.id ? null : room.id)
              }
              onSaved={onSaved}
              onStatus={report}
            />
          ))}
          <button
            type="button"
            className="adm-add-row"
            onClick={() => {
              const id = `room_${Date.now().toString(36)}`;
              setRoomEditing(id);
              setRoomsDraft((current) => [
                ...current,
                {
                  id,
                  hotelId: hotel.id,
                  name: "Hạng phòng mới",
                  capacityAdults: 2,
                  capacityChildren: 0,
                  maxOccupancy: 2,
                  amenities: [],
                  images: [],
                  sizeSqm: null,
                  order: rooms.length,
                  contentStatus: "demo",
                  updatedAt: new Date().toISOString(),
                  revision: 0,
                  state: "draft",
                } as HotelRoomRow,
              ]);
            }}
          >
            + Thêm hạng phòng
          </button>
          {pendingRooms.map((room) => (
            <RoomRow
              key={`${room.id}-new`}
              csrf={csrf}
              hotelId={hotel.id}
              room={room}
              media={media}
              upload={upload}
              open={roomEditing === room.id}
              isNew
              onToggle={() => setRoomEditing(null)}
              onSaved={onSaved}
              onStatus={report}
            />
          ))}
        </div>
      ) : null}

      {tab === "rates" ? (
        <div className="stt-hotel-section">
          <HotelCalendar
            csrf={csrf}
            hotelId={hotel.id}
            rooms={roomIds.map((id) => ({
              id,
              name: rooms.find((room) => room.id === id)?.name ?? id,
            }))}
            onStatus={report}
          />
        </div>
      ) : null}

      {tab === "publish" ? (
        <div className="stt-hotel-section">
          <div className="stt-hotel-section-head">
            <h3>Tour liên quan</h3>
            <p className="adm-hint">
              Chỉ gắn khi đã có thoả thuận. “Đã bao gồm” nghĩa là tour trả tiền
              phòng; website không cộng giá phòng lần nữa.
            </p>
          </div>
          {links.map((link, index) => (
            <div className="stt-hotel-link-row" key={`${link.roomId}-${link.tourSlug}-${index}`}>
              <Field label="Tour">
                <select
                  value={link.tourSlug}
                  onChange={(event) =>
                    setLinks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, tourSlug: event.target.value }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="">Chọn tour</option>
                  {tourOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Áp dụng cho">
                <select
                  value={link.roomId}
                  onChange={(event) =>
                    setLinks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, roomId: event.target.value }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="">Cả khách sạn</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quan hệ">
                <select
                  value={link.relation}
                  onChange={(event) =>
                    setLinks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              relation: event.target.value as TourRelation,
                            }
                          : item,
                      ),
                    )
                  }
                >
                  {(Object.keys(RELATION_LABEL) as TourRelation[]).map(
                    (relation) => (
                      <option key={relation} value={relation}>
                        {RELATION_LABEL[relation]}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <button
                type="button"
                className="adm-danger"
                onClick={() =>
                  setLinks((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                Xoá
              </button>
            </div>
          ))}
          <div className="stt-hotel-actions">
            <button
              type="button"
              className="adm-add-row"
              onClick={() =>
                setLinks((current) => [
                  ...current,
                  {
                    hotelId: hotel.id,
                    roomId: "",
                    tourSlug: tourOptions[0]?.value ?? "",
                    relation: "additional",
                    condition: "",
                  },
                ])
              }
            >
              + Thêm tour liên kết
            </button>
            <button
              type="button"
              className="adm-primary"
              disabled={busy}
              onClick={() => void saveLinks()}
            >
              Lưu quan hệ tour
            </button>
          </div>

          <div className="stt-hotel-public-preview">
            <strong>Tóm tắt hiển thị công khai</strong>
            <dl>
              <dt>Tên</dt>
              <dd>{text(draft.name, "—")}</dd>
              <dt>Điểm đến</dt>
              <dd>{text(draft.province, "—")}</dd>
              <dt>Hạng sao</dt>
              <dd>
                {draft.starRating
                  ? `${draft.starRating} sao · ${text(draft.starBasis, "chưa ghi căn cứ")}`
                  : "Không hiển thị sao"}
              </dd>
              <dt>Tình trạng phòng</dt>
              <dd>
                {text(draft.roomMode) === "manual_daily"
                  ? "Số phòng tham khảo theo ngày (sale xác nhận)"
                  : "Liên hệ kiểm tra tình trạng phòng"}
              </dd>
            </dl>
          </div>

          <div className="stt-hotel-actions">
            <button
              type="button"
              className="adm-primary"
              disabled={busy}
              onClick={() => void saveContent("publish")}
            >
              Lưu và xuất bản
            </button>
            {hotel.state === "published" ? (
              <button
                type="button"
                className="adm-ghost-link"
                disabled={busy}
                onClick={() => void changeState("unpublish")}
              >
                Ẩn khỏi website
              </button>
            ) : null}
            {hotel.state === "deleted" ? (
              <button
                type="button"
                className="adm-ghost-link"
                disabled={busy}
                onClick={() => void changeState("restore")}
              >
                Khôi phục
              </button>
            ) : (
              <button
                type="button"
                className="adm-danger"
                disabled={busy}
                onClick={() => void changeState("delete")}
              >
                Lưu trữ khách sạn
              </button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function cleanTranslation(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, item]) => item !== undefined && item !== "",
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function RoomRow({
  csrf,
  hotelId,
  room,
  media,
  upload,
  open,
  isNew = false,
  onToggle,
  onSaved,
  onStatus,
}: {
  csrf: string;
  hotelId: string;
  room: HotelRoomRow;
  media: { value: string; label: string }[];
  upload: (file: File) => Promise<{ src: string; alt: string }>;
  open: boolean;
  isNew?: boolean;
  onToggle: () => void;
  onSaved: () => Promise<void>;
  onStatus: (kind: "ok" | "error", message: string) => void;
}) {
  const [draft, setDraft] = useState<HotelRoom>(room);
  const [revision, setRevision] = useState(
    isNew ? 0 : (room.revision ?? 1),
  );
  const [busy, setBusy] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const uploading = uploadCount > 0;

  async function uploadRoomPhoto(file: File) {
    setUploadCount((count) => count + 1);
    try {
      return await upload(file);
    } finally {
      setUploadCount((count) => count - 1);
    }
  }
  const [error, setError] = useState("");

  const set = (key: keyof HotelRoom, value: unknown) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function save(action: "save" | "publish" | "delete") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/content/hotelRooms", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({
          data: {
            ...draft,
            images: imagesOf(draft.images).filter((image) => image.src),
          },
          revision,
          action,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok)
        throw new Error(
          typeof body.error === "string" ? body.error : "Không lưu được hạng phòng",
        );
      setRevision(Number(body.revision ?? revision + 1));
      onStatus(
        "ok",
        action === "publish"
          ? "Đã xuất bản hạng phòng."
          : action === "delete"
            ? "Đã lưu trữ hạng phòng."
            : "Đã lưu nháp hạng phòng.",
      );
      await onSaved();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Không lưu được";
      setError(message);
      onStatus("error", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stt-hotel-section">
      <div className="stt-hotel-actions" style={{ justifyContent: "space-between" }}>
        <div>
          <strong>{room.name}</strong>{" "}
          <span className="adm-hint">
            {room.capacityAdults + room.capacityChildren} khách · tối đa{" "}
            {room.maxOccupancy}
          </span>
        </div>
        <button type="button" className="adm-ghost-link" disabled={uploading} onClick={onToggle}>
          {open ? "Thu gọn" : "Sửa hạng phòng"}
        </button>
      </div>
      {open ? (
        <>
          {error ? (
            <p className="adm-field-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="stt-hotel-grid2">
            <Field label="Tên hạng phòng">
              <input
                value={draft.name}
                maxLength={120}
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
            <Field label="Diện tích (m²)">
              <input
                inputMode="numeric"
                value={draft.sizeSqm ?? ""}
                onChange={(event) =>
                  set(
                    "sizeSqm",
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              />
            </Field>
            <Field label="Giường">
              <input
                value={draft.bed ?? ""}
                maxLength={120}
                onChange={(event) => set("bed", event.target.value || undefined)}
              />
            </Field>
            <Field label="Hướng nhìn">
              <input
                value={draft.view ?? ""}
                maxLength={120}
                onChange={(event) => set("view", event.target.value || undefined)}
              />
            </Field>
            <Field label="Người lớn tiêu chuẩn">
              <input
                inputMode="numeric"
                value={draft.capacityAdults}
                onChange={(event) =>
                  set("capacityAdults", Number(event.target.value || 1))
                }
              />
            </Field>
            <Field label="Trẻ em tiêu chuẩn">
              <input
                inputMode="numeric"
                value={draft.capacityChildren}
                onChange={(event) =>
                  set("capacityChildren", Number(event.target.value || 0))
                }
              />
            </Field>
            <Field label="Sức chứa tối đa">
              <input
                inputMode="numeric"
                value={draft.maxOccupancy}
                onChange={(event) =>
                  set("maxOccupancy", Number(event.target.value || 1))
                }
              />
            </Field>
            <Field label="Thứ tự">
              <input
                inputMode="numeric"
                value={draft.order}
                onChange={(event) => set("order", Number(event.target.value || 0))}
              />
            </Field>
          </div>
          <Field label="Mô tả">
            <textarea
              rows={3}
              value={draft.description ?? ""}
              maxLength={2000}
              onChange={(event) => set("description", event.target.value || undefined)}
            />
          </Field>
          <ChipsField
            label="Tiện nghi"
            value={draft.amenities}
            onChange={(value) => set("amenities", value)}
          />
          <Field label="Chính sách trẻ em">
            <textarea
              rows={2}
              value={draft.childPolicy ?? ""}
              maxLength={600}
              onChange={(event) => set("childPolicy", event.target.value || undefined)}
            />
          </Field>
          <Field label="Chính sách giường phụ">
            <textarea
              rows={2}
              value={draft.extraBedPolicy ?? ""}
              maxLength={600}
              onChange={(event) => set("extraBedPolicy", event.target.value || undefined)}
            />
          </Field>
          <GalleryField
            label="Ảnh hạng phòng"
            hint={`Tối đa ${MAX_ROOM_IMAGES} ảnh. Ảnh đầu tiên hiển thị trên thẻ phòng.`}
            sizeGuide="Nên dùng ảnh ngang 1600 × 1200 px (4:3), JPEG, PNG hoặc WebP, tối đa 10 MB mỗi ảnh."
            maxImages={MAX_ROOM_IMAGES}
            busy={uploading}
            value={imagesOf(draft.images)}
            media={media}
            upload={uploadRoomPhoto}
            onChange={(value) => set("images", value)}
          />
          <div className="stt-hotel-actions">
            <button
              type="button"
              className="adm-primary"
              disabled={busy || uploading}
              onClick={() => void save("save")}
            >
              Lưu nháp
            </button>
            <button
              type="button"
              className="adm-ghost-link"
              disabled={busy || uploading}
              onClick={() => void save("publish")}
            >
              Lưu và xuất bản
            </button>
            <button
              type="button"
              className="adm-danger"
              disabled={busy || uploading || isNew}
              onClick={() => void save("delete")}
            >
              Lưu trữ
            </button>
          </div>
          <p className="adm-hint">Khách sạn: {hotelId}</p>
        </>
      ) : null}
    </div>
  );
}
