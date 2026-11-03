"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Hotel block inside an existing consultation card.
 *
 * Read-only request snapshot first, then the sales plan (quote, confirmed
 * option) and any tour booking already linked to this lead. Nothing here
 * creates revenue or holds a room.
 */

type HotelLead = {
  id: string;
  kind?: string;
  hotelTitle?: string | null;
  hotelSlug?: string | null;
  hotelPlan?:
    | {
        quoteAmount: number | null;
        quoteNote: string;
        confirmedOption: string;
        bookingId: string | null;
        updatedAt: string;
      }
    | null;
  data: Record<string, unknown>;
};

type HotelSnapshot = {
  hotelName?: string;
  rooms?: { roomId: string; name: string; quantity: number }[];
  checkIn?: string | null;
  checkOut?: string | null;
  nights?: number;
  datesFlexible?: boolean;
  adults?: number;
  children?: number;
  childrenAges?: number[];
  availability?: Record<string, string>;
  tourTitle?: string | null;
  tourRelation?: string | null;
  needsReview?: boolean;
  quote?: {
    status?: string;
    lodgingTotal?: number | null;
    includedByTour?: boolean;
    reasons?: string[];
  };
};

type Booking = {
  id: string;
  leadId?: string | null;
  tourTitle?: string;
  travelDate?: string;
  saleAmount?: number;
};

const vnd = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

const RELATION_LABEL: Record<string, string> = {
  included: "Đã bao gồm trong tour",
  upgrade: "Cần báo chênh lệch nâng cấp",
  additional: "Cộng thêm, báo giá riêng",
};

export function HotelLeadCard({
  lead,
  csrf,
  onSaved,
}: {
  lead: HotelLead;
  csrf: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [amount, setAmount] = useState(
    lead.hotelPlan?.quoteAmount ? String(lead.hotelPlan.quoteAmount) : "",
  );
  const [quoteNote, setQuoteNote] = useState(lead.hotelPlan?.quoteNote ?? "");
  const [confirmedOption, setConfirmedOption] = useState(
    lead.hotelPlan?.confirmedOption ?? "",
  );

  const snapshot = (lead.data.hotel ?? {}) as HotelSnapshot;
  const rooms = snapshot.rooms ?? [];

  useEffect(() => {
    if (!open || bookings) return;
    const year = new Date().getFullYear();
    fetch(`/api/admin/finance?from=${year - 1}-01-01&to=${year + 1}-12-31`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { bookings?: Booking[] } | null) => {
        setBookings(
          (body?.bookings ?? []).filter((booking) => booking.leadId === lead.id),
        );
      })
      .catch(() => setBookings([]));
  }, [bookings, lead.id, open]);

  async function save() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({
          action: "hotel-plan",
          id: lead.id,
          quoteAmount: amount ? Number(amount) : null,
          quoteNote,
          confirmedOption,
          bookingId: lead.hotelPlan?.bookingId ?? null,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Không lưu được báo giá");
      setStatus("Đã lưu báo giá và phương án.");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được báo giá");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stt-hotel-lead">
      <div className="stt-hotel-lead-head">
        <strong>
          {lead.hotelTitle ?? snapshot.hotelName ?? "Khách sạn"} ·{" "}
          {snapshot.datesFlexible || !snapshot.checkIn
            ? "Chưa chốt ngày"
            : `${snapshot.checkIn} → ${snapshot.checkOut} (${snapshot.nights ?? 0} đêm)`}
        </strong>
        {lead.hotelSlug ? (
          <a href={`/khach-san/${lead.hotelSlug}`} target="_blank" rel="noreferrer">
            Trang khách sạn ↗
          </a>
        ) : null}
        <button type="button" className="adm-ghost-link" onClick={() => setOpen(!open)}>
          {open ? "Thu gọn" : "Chi tiết lưu trú & báo giá"}
        </button>
      </div>

      <p className="adm-hint">
        {snapshot.adults ?? 0} người lớn
        {snapshot.children
          ? `, ${snapshot.children} trẻ em${
              snapshot.childrenAges?.length
                ? ` (${snapshot.childrenAges.join(", ")} tuổi)`
                : ""
            }`
          : ""}
        {" · "}
        {rooms.map((room) => `${room.name} ×${room.quantity}`).join(", ") || "chưa chọn phòng"}
      </p>

      <p className="adm-hint">
        {snapshot.quote?.includedByTour
          ? "Đã bao gồm trong tour — không cộng giá phòng."
          : snapshot.quote?.status === "quoted" && snapshot.quote.lodgingTotal != null
            ? `Giá tham khảo: ${vnd.format(snapshot.quote.lodgingTotal)} ₫`
            : "Cần báo giá (thiếu giá hoặc phụ thu chưa xác định)."}
        {snapshot.tourTitle
          ? ` · Tour: ${snapshot.tourTitle}${
              snapshot.tourRelation
                ? ` (${RELATION_LABEL[snapshot.tourRelation] ?? snapshot.tourRelation})`
                : ""
            }`
          : " · Khách nhờ tư vấn tour phù hợp."}
      </p>

      {snapshot.needsReview ? (
        <p className="adm-field-warning">
          Cần kiểm tra: sức chứa hoặc giá/tình trạng chưa đủ để báo giá chắc chắn.
        </p>
      ) : null}

      {open ? (
        <div className="stt-hotel-lead-plan">
          {rooms.length > 0 ? (
            <ul className="adm-hint">
              {rooms.map((room) => (
                <li key={room.roomId}>
                  {room.name} × {room.quantity} —{" "}
                  {snapshot.availability?.[room.roomId] ?? "chưa kiểm tra"}
                </li>
              ))}
            </ul>
          ) : null}

          <label className="adm-field">
            <span className="adm-field-label">Báo giá cuối cùng (VND)</span>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
              placeholder="Để trống nếu chưa chốt"
            />
            {amount ? <small className="adm-hint">{vnd.format(Number(amount))} ₫</small> : null}
          </label>
          <label className="adm-field">
            <span className="adm-field-label">Nội dung báo giá / điều kiện</span>
            <textarea
              rows={2}
              value={quoteNote}
              maxLength={2000}
              onChange={(event) => setQuoteNote(event.target.value)}
            />
          </label>
          <label className="adm-field">
            <span className="adm-field-label">Phương án khách đã đồng ý</span>
            <textarea
              rows={2}
              value={confirmedOption}
              maxLength={2000}
              onChange={(event) => setConfirmedOption(event.target.value)}
            />
          </label>

          <div className="adm-hint">
            Booking tour liên kết:{" "}
            {bookings === null ? (
              "đang tải…"
            ) : bookings.length === 0 ? (
              <>
                chưa có. Tạo booking trong{" "}
                <Link href="/admin/finance">Tài chính tour</Link> và chọn đúng yêu cầu
                này để liên kết.
              </>
            ) : (
              bookings.map((booking) => (
                <span key={booking.id}>
                  #{booking.id.slice(0, 8)} · {booking.tourTitle ?? "Tour"} ·{" "}
                  {booking.travelDate ?? ""}{" "}
                </span>
              ))
            )}
          </div>

          <div className="adm-lead-actions">
            <button
              type="button"
              className="adm-primary"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? "Đang lưu…" : "Lưu báo giá & phương án"}
            </button>
            {status ? (
              <span className="adm-field-success" role="status">
                {status}
              </span>
            ) : null}
            {error ? (
              <span className="adm-field-error" role="alert">
                {error}
              </span>
            ) : null}
          </div>
          <p className="adm-hint">
            Lưu báo giá không tự trừ phòng và không tạo doanh thu.
          </p>
        </div>
      ) : null}
    </div>
  );
}
