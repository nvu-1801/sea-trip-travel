"use client";

import { useCallback, useEffect, useState } from "react";
import { contrast, type Promotion } from "@/domain/promotion";
import { GiftPreview } from "@/features/promotions/promotion-gift";
import { Field, HotelFormError, fieldIssue } from "./hotel-form";
import { AdminDatePicker } from "./admin-date-picker";
import "./promotions-panel.css";
import { ImageField } from "./image-picker";
import type { ToastKind } from "./notify";
import { PromotionEntries } from "./promotion-entries";

type Row = { id: string; revision: number; state: string; live: boolean; closed: boolean; entries: number; data: Promotion };
type Option = { value: string; label: string };
const endpoint = "/api/admin/content/promotions";
const calendarSample = {
  name: "Mẫu quà lịch Sea Trip",
  title: "Lịch để bàn Sea Trip Travel",
  intro: "Mang một góc biển Quy Nhơn về bàn làm việc với bộ lịch để bàn Sea Trip.",
  image: "/images/promotions/lich-de-ban-sea-trip.webp",
  alt: "Mẫu lịch để bàn Sea Trip Travel với ảnh vịnh biển Quy Nhơn",
};
type Action = "save" | "publish" | "unpublish" | "delete" | "restore";

function newPromotion(): Promotion {
  return {
    id: `promo_${crypto.randomUUID().replaceAll("-", "")}`, name: "", title: "", intro: "", terms: "",
    button: "Đăng ký tham gia",
    confirmation: "Đã ghi nhận lượt tham gia. Sea Trip sẽ liên hệ nếu bạn trúng quà.",
    image: "", alt: "", background: "#fff8ec", buttonColor: "#6c3b22", accent: "#b97842",
    starts: "", ends: "", home: true, featured: false, tours: [], floating: true, autoOpen: false,
    selectionMode: "random", winnerCount: 1, reserveCount: 0,
  };
}

const fields = [
  ["name", "Tên quản lý nội bộ", 100], ["title", "Tiêu đề khách thấy", 120],
  ["intro", "Lời giới thiệu", 500], ["terms", "Điều kiện nhận quà", 2000],
  ["button", "Nhãn nút gửi đăng ký", 50], ["confirmation", "Lời xác nhận sau khi gửi", 250],
] as const;

export function PromotionsPanel({ csrf, notify }: { csrf: string; notify: (kind: ToastKind, message: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Promotion | null>(null);
  const [media, setMedia] = useState<Option[]>([]);
  const [tours, setTours] = useState<Option[]>([]);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<"desktop" | "mobile" | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<Row | null>(null);

  const request = useCallback(async (url: string, init: RequestInit = {}) => {
    const response = await fetch(url, { ...init, headers: { "x-csrf-token": csrf, ...init.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new HotelFormError(body, "Không tải được dữ liệu chiến dịch");
    return body;
  }, [csrf]);

  useEffect(() => {
    let active = true;
    Promise.all([request(endpoint), request("/api/admin/media"), request("/api/admin/options")])
      .then(([records, images, options]) => {
        if (!active) return;
        setRows(records);
        setMedia(images.map((image: { src: string; name: string }) => ({ value: image.src, label: image.name })));
        setTours(options.tours ?? []);
      })
      .catch((cause) => { if (active) setLoadError(cause.message); });
    return () => { active = false; };
  }, [request]);

  const set = <K extends keyof Promotion>(key: K, value: Promotion[K]) => {
    setDraft((current) => current && { ...current, [key]: value });
    setIssues((current) => ({ ...current, [key]: "" }));
  };
  const edit = (item: Promotion) => { setDraft(item); setIssues({}); setPreview(null); };
  const upload = async (file: File) => {
    const image = await request("/api/admin/media", {
      method: "POST", headers: { "content-type": file.type, "x-image-alt": encodeURIComponent(file.name.slice(0, 200)) }, body: file,
    });
    setMedia((current) => [...current, { value: image.src, label: file.name }]);
    return { src: image.src, alt: image.alt ?? "" };
  };

  async function save(item: Promotion, action: Action) {
    setBusy(true);
    setIssues({});
    try {
      const previous = rows.find((row) => row.id === item.id);
      await request(endpoint, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: item, revision: previous?.revision ?? 0, action }),
      });
      setRows(await request(endpoint));
      if (action === "delete") setDraft((current) => current?.id === item.id ? null : current);
      notify("success", {
        save: "Đã lưu bản nháp",
        publish: "Đã xuất bản chiến dịch",
        unpublish: "Đã tạm dừng chiến dịch",
        delete: "Đã chuyển chiến dịch vào thùng rác",
        restore: "Đã khôi phục chiến dịch về bản nháp",
      }[action]);
    } catch (cause) {
      if (cause instanceof HotelFormError) setIssues(cause.issues);
      notify("error", cause instanceof Error ? cause.message : "Không lưu được chiến dịch");
    } finally {
      setBusy(false);
    }
  }

  const deleted = rows.filter((row) => row.state === "deleted");
  if (view) return <PromotionEntries id={view.id} title={view.data.name} request={request} notify={notify} onBack={() => {
    setView(null);
    void request(endpoint).then(setRows).catch((cause) => notify("error", cause.message));
  }} />;

  return <div className="stt-hotel-panel">
    {loadError && <p role="alert" className="adm-field-error">{loadError}</p>}
    <section className="stt-hotel-section">
      <div className="stt-hotel-actions">
        <button type="button" className="adm-primary" disabled={busy} onClick={() => edit(newPromotion())}>Tạo chiến dịch</button>
        <button type="button" className="stt-hotel-action" disabled={busy} onClick={() => edit({ ...newPromotion(), ...calendarSample })}>Dùng mẫu lịch để bàn</button>
      </div>
      {rows.length === deleted.length && <p>Chưa có chiến dịch quà khuyến mãi.</p>}
      <ul className="stt-hotel-trash-list">
        {rows.filter((row) => row.state !== "deleted").map((row) => <li key={row.id}>
          <div><strong>{row.data.name}</strong><small>{row.closed ? "Đã đóng đăng ký" : row.live ? row.state === "published" ? "Đã xuất bản" : "Có bản nháp mới · bản đã xuất bản vẫn chạy theo lịch" : "Bản nháp hoặc đã tạm dừng"}</small></div>
          <div className="stt-hotel-actions">
            <button type="button" className="stt-hotel-action" disabled={busy} onClick={() => edit(row.data)}>Sửa</button>
            <button type="button" className="stt-hotel-action" disabled={busy} onClick={() => edit({
              ...row.data, id: newPromotion().id, name: `${row.data.name.slice(0, 91)} (bản sao)`,
              starts: "", ends: "", featured: false,
            })}>Nhân bản</button>
            {row.live && !row.closed && <button type="button" className="stt-hotel-action" disabled={busy} onClick={() => void save(row.data, "unpublish")}>Tạm dừng</button>}
            <button type="button" className="stt-hotel-action" disabled={busy} onClick={() => {
              if (window.confirm("Chuyển chiến dịch vào thùng rác? Quà sẽ ngừng hiển thị trên website.")) void save(row.data, "delete");
            }}>Xóa</button>
            <button type="button" className="stt-hotel-action" onClick={() => setView(row)}>Xem đăng ký ({row.entries})</button>
          </div>
        </li>)}
      </ul>
      {deleted.length > 0 && <details>
        <summary>Thùng rác chiến dịch ({deleted.length})</summary>
        <ul className="stt-hotel-trash-list">
          {deleted.map((row) => <li key={row.id}>
            <strong>{row.data.name}</strong>
            <button type="button" className="stt-hotel-action" disabled={busy} onClick={() => void save(row.data, "restore")}>Khôi phục bản nháp</button>
          </li>)}
        </ul>
      </details>}
    </section>
    {draft && <section className="stt-hotel-section" aria-label="Chỉnh sửa chiến dịch quà">
      <h2>{draft.name || "Chiến dịch mới"}</h2>
      <div className="stt-hotel-grid2">
        {fields.map(([key, label, length]) => <Field key={key} label={label} error={fieldIssue(issues, key)}>
          {length > 250
            ? <textarea rows={key === "terms" ? 5 : 3} maxLength={length} value={draft[key]} onChange={(event) => set(key, event.target.value)} />
            : <input maxLength={length} value={draft[key]} onChange={(event) => set(key, event.target.value)} />}
        </Field>)}
      </div>
      <p>Ảnh mẫu là ảnh minh họa. Bạn có thể thay bằng ảnh quà thật trước khi xuất bản.</p>
      <ImageField label="Ảnh món quà" value={draft.image} alt={draft.alt} altRequired media={media}
        onUpload={upload} onAltChange={(alt) => set("alt", alt)}
        onChange={(image, alt) => { set("image", image); if (alt) set("alt", alt); }} />
      {(issues.image || issues.alt) && <p className="adm-field-error">{[issues.image, issues.alt].filter(Boolean).join(" · ")}</p>}
      <div className="stt-promo-colors">
        {([["background", "Nền popup"], ["buttonColor", "Màu nút"], ["accent", "Màu điểm nhấn"]] as const).map(([key, label]) =>
          <Field key={key} label={label}><input type="color" value={draft[key]} onChange={(event) => set(key, event.target.value)} /></Field>)}
      </div>
      {contrast(draft.background, draft.accent) < 3 && <p className="adm-field-warning">Màu điểm nhấn có độ tương phản thấp so với nền. Màu chữ và chữ trên nút được chọn tự động.</p>}
      <fieldset className="stt-promo-settings">
        <legend>Lịch hiển thị</legend>
        <p className="adm-hint">Giờ Việt Nam (UTC+7)</p>
        <div className="stt-hotel-grid2">
          {([["starts", "Bắt đầu"], ["ends", "Kết thúc"]] as const).map(([key, label]) => (
            <Field key={key} label={label} error={issues[key]}>
              <AdminDatePicker withTime value={draft[key]} onChange={(value) => set(key, value)} />
            </Field>
          ))}
        </div>
      </fieldset>
      <fieldset className="stt-promo-settings">
        <legend>Vị trí hiển thị</legend>
        <div className="stt-promo-visibility">
        {([["home", "Hiện ở trang chủ"], ["featured", "Chọn làm quà nổi bật trên trang chủ"],
          ["floating", "Hiện nút nổi Quà tặng"], ["autoOpen", "Tự mở trên trang chủ (tối đa một lần mỗi 7 ngày)"]] as const).map(([key, label]) =>
          <label key={key} className="adm-toggle"><input type="checkbox" checked={draft[key]} onChange={(event) => set(key, event.target.checked)} /><span>{label}</span></label>)}
        </div>
        {issues.featured && <p className="adm-field-error">{issues.featured}</p>}
      </fieldset>
      <fieldset className="stt-promo-settings">
        <legend>Thể lệ chọn người trúng</legend>
        <div className="stt-hotel-grid2">
          <Field label="Cách chọn" error={issues.selectionMode}>
            <select value={draft.selectionMode ?? "random"} onChange={(event) => {
              const mode = event.target.value === "manual" ? "manual" : "random";
              set("selectionMode", mode);
              if (mode === "manual") set("reserveCount", 0);
            }}><option value="random">Bốc thăm ngẫu nhiên</option><option value="manual">Chọn theo tiêu chí trong thể lệ</option></select>
          </Field>
          <Field label="Số phần quà" error={issues.winnerCount}>
            <input type="number" min={1} max={100} value={draft.winnerCount ?? 1} onChange={(event) => set("winnerCount", Number(event.target.value))} />
          </Field>
          {draft.selectionMode !== "manual" && <Field label="Số suất dự phòng" error={issues.reserveCount}>
            <input type="number" min={0} max={100} value={draft.reserveCount ?? 0} onChange={(event) => set("reserveCount", Number(event.target.value))} />
          </Field>}
        </div>
      </fieldset>
      <Field label="Tour áp dụng" hint="Giữ Ctrl hoặc Command để chọn nhiều tour." error={fieldIssue(issues, "tours")}>
        <select className="stt-promo-tours" multiple size={5} value={draft.tours} onChange={(event) => set("tours", Array.from(event.currentTarget.selectedOptions, (item) => item.value))}>
          {tours.map((tour) => <option key={tour.value} value={tour.value}>{tour.label}</option>)}
        </select>
      </Field>
      <div className="stt-hotel-actions">
        <button type="button" className="stt-hotel-action" onClick={() => setPreview("desktop")}>Xem trước desktop</button>
        <button type="button" className="stt-hotel-action" onClick={() => setPreview("mobile")}>Xem trước mobile</button>
        <button type="button" className="stt-hotel-action" disabled={busy} onClick={() => void save(draft, "save")}>Lưu nháp</button>
        <button type="button" className="adm-primary" disabled={busy} onClick={() => void save(draft, "publish")}>Xuất bản</button>
      </div>
      {preview && <div className="stt-gift-preview" data-mobile={preview === "mobile"}>
        <GiftPreview item={draft} />
      </div>}
    </section>}
  </div>;
}
