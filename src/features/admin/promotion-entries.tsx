"use client";

import { useEffect, useState } from "react";
import { Field, HotelFormError } from "./hotel-form";
import { ConfirmModal, type ToastKind } from "./notify";
import { promotionWinnerCount } from "@/domain/promotion";

type Entry = { id: string; fullName: string; phone: string; tourSlug?: string; created_at: string; exclusion: string | null };
type Fulfillment = "contacted" | "confirmed" | "delivered";
type Data = { entries: Entry[]; seenThrough: number; closedAt: string | null; rules: { method: "random" | "manual"; count: number; reserves: number; entriesPerWinner?: number }; result: { method: "random" | "manual"; selected: string[]; alternates: string[]; fulfillment: Record<string, Fulfillment>; eligible: number; at: string } | null };
type Action = { action: "close" } | { action: "random"; count: number } | { action: "manual"; ids: string[]; reason: string } | { action: "exclude" | "replace"; id: string; reason: string } | { action: "fulfill"; id: string; status: Fulfillment };
type LegacyReport = { eligible: number; duplicates: number; linked: number; trash: number; invalid: number; unreadable: number };

export function PromotionEntries({ id, title, request, notify, onBack }: {
  id: string; title: string; request: <T = Data>(url: string, init?: RequestInit) => Promise<T>;
  notify: (kind: ToastKind, message: string) => void; onBack: () => void;
}) {
  const url = `/api/admin/promotions/${encodeURIComponent(id)}`;
  const [data, setData] = useState<Data>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [exclude, setExclude] = useState("");
  const [replace, setReplace] = useState("");
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Action | { action: "reconcile" } | null>(null);
  const [legacy, setLegacy] = useState<LegacyReport>();
  useEffect(() => {
    let active = true;
    request(url).then((value) => {
      if (!active) return;
      setData(value);
      if (value.seenThrough) {
        void request(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "mark-read", through: value.seenThrough }),
        }).catch(() => { /* The badge can be cleared when the list is reopened. */ });
      }
    })
      .catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [request, url]);

  async function reconcile(apply: boolean) {
    setBusy(true);
    try {
      const report = await request<LegacyReport>(url, {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ apply }),
      });
      setLegacy(report);
      if (apply) {
        setData(await request(url));
        setLegacy(undefined);
        notify("success", `Đã chuyển ${report.eligible} lượt và đối soát ${report.duplicates} lượt trùng.`);
      }
    } catch (cause) {
      notify("error", cause instanceof Error ? cause.message : "Không đối soát được đăng ký cũ");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function apply(action: Action) {
    setBusy(true);
    setIssues({});
    try {
      await request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(action) });
      setData(await request(url));
      if (action.action === "exclude") setSelected((current) => current.filter((entry) => entry !== action.id));
      setExclude("");
      setReplace("");
      notify("success", "Đã cập nhật chiến dịch.");
    } catch (cause) {
      if (cause instanceof HotelFormError) setIssues(cause.issues);
      notify("error", cause instanceof Error ? cause.message : "Không cập nhật được chiến dịch");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }
  const eligible = data?.entries.filter((entry) => !entry.exclusion).length ?? 0;
  const method = data?.rules.method;
  const count = promotionWinnerCount(eligible, data?.rules.count ?? 1, data?.rules.entriesPerWinner);
  const visible = data?.entries.filter((entry) => `${entry.fullName} ${entry.phone} ${entry.tourSlug ?? ""}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi")));
  return <section className="stt-hotel-section stt-promo-entries" aria-label="Người tham gia chiến dịch">
    <div className="stt-hotel-actions">
      <button type="button" className="stt-hotel-action" onClick={onBack}>Về danh sách chiến dịch</button>
      {data && !data.closedAt && <button type="button" className="stt-hotel-action" onClick={() => setConfirm({ action: "close" })}>Đóng đăng ký</button>}
      {data && !data.closedAt && <button type="button" className="stt-hotel-action" disabled={busy} onClick={() => void reconcile(false)}>Đối soát đăng ký cũ</button>}
    </div>
    <h2>{title}</h2>
    {legacy && <div className="adm-notice">
      <p>Có thể chuyển {legacy.eligible} lượt, {legacy.duplicates} lượt trùng. Giữ lại {legacy.linked} có hồ sơ hoặc hóa đơn, {legacy.trash} trong thùng rác và {legacy.invalid} thiếu thông tin.</p>
      {legacy.unreadable > 0 && <p>Toàn bộ hộp thư có {legacy.unreadable} bản ghi không đọc được để đối chiếu.</p>}
      <button type="button" className="stt-hotel-action" disabled={busy || !(legacy.eligible + legacy.duplicates)}
        onClick={() => setConfirm({ action: "reconcile" })}>Chuyển các lượt đủ điều kiện</button>
    </div>}
    {error ? <p className="adm-field-error" role="alert">{error}</p> : !data ? <p role="status">Đang tải người tham gia…</p> : <>
      <div className="stt-promo-stats" aria-label="Thống kê">
        <span><strong>{data.entries.length}</strong> Đăng ký</span>
        <span><strong>{eligible}</strong> Đủ điều kiện</span>
        <span><strong>{data.result?.selected.length ?? 0}</strong> Trúng quà</span>
      </div>
      <Field label="Tìm người tham gia"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, điện thoại hoặc tour" /></Field>
      {!visible?.length ? <p>Không có lượt đăng ký phù hợp.</p> : <ul className="stt-hotel-trash-list">
        {visible.map((entry) => <li key={entry.id}>
          <div><strong>{entry.fullName}</strong><small>{entry.phone} · {entry.tourSlug || "Trang chủ"}</small>
            <small>{entry.exclusion ? `Đã loại · ${entry.exclusion}` : data.result?.selected.includes(entry.id) ? "Trúng quà" :
              data.result?.alternates.includes(entry.id) ? `Dự phòng #${data.result.alternates.indexOf(entry.id) + 1}` : "Đủ điều kiện"}</small>
          </div>
          {data.result?.selected.includes(entry.id) && <div className="stt-hotel-actions">
            <Field label={`Trao quà cho ${entry.fullName}`}>
              <select disabled={busy} value={data.result.fulfillment[entry.id] ?? ""} onChange={(event) => {
                if (event.target.value) void apply({ action: "fulfill", id: entry.id, status: event.target.value as Fulfillment });
              }}>
                <option value="" disabled>Chưa liên hệ</option>
                <option value="contacted">Đã liên hệ</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="delivered">Đã trao</option>
              </select>
            </Field>
            {!!data.result.alternates.length && data.result.fulfillment[entry.id] !== "delivered" &&
              <button type="button" className="stt-hotel-action" onClick={() => { setReplace(entry.id); setReason(""); setIssues({}); }}>Dùng lượt dự phòng</button>}
          </div>}
          {replace === entry.id && <form onSubmit={(event) => {
            event.preventDefault();
            if (!reason.trim()) { setIssues({ reason: "Nhập lý do thay người trúng." }); return; }
            setConfirm({ action: "replace", id: entry.id, reason });
          }}>
            <Field label="Lý do thay người trúng" error={issues.reason}><input value={reason} maxLength={250} onChange={(event) => { setReason(event.target.value); setIssues({}); }} /></Field>
            <button className="stt-hotel-action" disabled={busy}>Thay người trúng</button>
          </form>}
          {!data.result && !entry.exclusion && <div className="stt-hotel-actions">
            {data.closedAt && method === "manual" && <label className="adm-toggle">
              <input type="checkbox" checked={selected.includes(entry.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, entry.id] : current.filter((value) => value !== entry.id))} />
              <span>Chọn {entry.fullName}</span>
            </label>}
            <button type="button" className="stt-hotel-action" onClick={() => { setExclude(entry.id); setReason(""); setIssues({}); }}>Loại lượt</button>
          </div>}
          {exclude === entry.id && <form onSubmit={(event) => { event.preventDefault(); void apply({ action: "exclude", id: entry.id, reason }); }}>
            <Field label="Lý do loại" error={issues.reason}><input value={reason} maxLength={250} onChange={(event) => { setReason(event.target.value); setIssues({}); }} /></Field>
            <button className="stt-hotel-action" disabled={busy}>Xác nhận loại</button>
          </form>}
        </li>)}
      </ul>}
      {data.result ? <p role="status">Đã chốt {data.result.selected.length} người trúng bằng {data.result.method === "random" ? "bốc thăm" : "chọn thủ công"}.</p> :
        data.closedAt && <section className="stt-hotel-section">
          <h3>Chốt người trúng</h3>
          <p>{method === "random" ? "Bốc thăm ngẫu nhiên" : "Chọn theo thể lệ"} · {count} phần quà</p>
          {(!count || eligible < count) && <p className="adm-field-error">Chưa đủ lượt hợp lệ để chốt người trúng.</p>}
          {method === "manual" &&
            <Field label={`Lý do chọn (${selected.length} người)`} error={issues.reason || issues.ids}><input value={reason} maxLength={250} onChange={(event) => { setReason(event.target.value); setIssues({}); }} /></Field>}
          <button type="button" className="adm-primary" disabled={busy || !count || eligible < count} onClick={() => {
            if (method === "manual" && (selected.length !== count || !reason.trim())) {
              setIssues({ reason: selected.length !== count ? `Chọn đúng ${count} người trong danh sách.` : "Nhập lý do chọn." }); return;
            }
            setConfirm(method === "random" ? { action: "random", count } : { action: "manual", ids: selected, reason });
          }}>Chốt kết quả</button>
        </section>}
    </>}
    <ConfirmModal request={confirm ? { title: confirm.action === "close" ? "Đóng đăng ký?" : confirm.action === "replace" ? "Thay người trúng?" : confirm.action === "reconcile" ? "Chuyển đăng ký cũ?" : "Chốt người trúng?", body: confirm.action === "close" ? "Chiến dịch sẽ dừng nhận lượt mới." : confirm.action === "replace" ? "Người dự phòng kế tiếp sẽ nhận suất này. Lý do được lưu vào lịch sử." : confirm.action === "reconcile" ? "Các lượt đã chuyển sẽ được ẩn trong Yêu cầu tư vấn. Bản ghi gốc vẫn được lưu." : "Kết quả sẽ được ghi vào lịch sử và khóa sau khi xác nhận.", danger: true } : null}
      busy={busy} onCancel={() => { if (!busy) setConfirm(null); }} onConfirm={() => { if (confirm?.action === "reconcile") void reconcile(true); else if (confirm) void apply(confirm); }} />
  </section>;
}
