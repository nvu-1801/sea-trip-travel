"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildMonthGrid,
  todayParts,
  toIsoDate,
  type MonthView,
} from "@/lib/date";
import type { RateKind, StoredRateRule } from "@/domain/hotel-pricing";
import { AdminDatePicker } from "./admin-date-picker";
import { AdminIcon } from "./admin-icons";
import { Field, fieldIssue, HotelFormError } from "./hotel-form";
import "./hotels-panel.css";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
const WEEKDAY_FULL = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ Nhật",
] as const;
const KIND_LABEL: Record<RateKind, string> = {
  base: "Giá cơ bản",
  weekday: "Theo thứ",
  date_range: "Khoảng ngày",
};
const MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
] as const;

export type CalendarRoom = { id: string; name: string };

type RuleDraft = {
  id: string;
  kind: RateKind;
  weekdays: number[];
  startDate: string;
  endDate: string;
  /** Kept as text so a half-typed number is not silently rounded. */
  amount: string;
  includesBreakfast: boolean;
  includesTax: boolean;
  feesNote: string;
  label: string;
};

type AvailabilityCell = { rooms: number; closed: boolean };

type Props = {
  csrf: string;
  hotelId: string;
  rooms: CalendarRoom[];
  onStatus: (kind: "ok" | "error", message: string) => void;
};

function emptyRule(kind: RateKind, index: number): RuleDraft {
  return {
    id: `new-${kind}-${index}`,
    kind,
    weekdays: kind === "weekday" ? [5, 6] : [],
    startDate: "",
    endDate: "",
    amount: "",
    includesBreakfast: false,
    includesTax: false,
    feesNote: "",
    label: "",
  };
}

function toDraft(rule: StoredRateRule): RuleDraft {
  return {
    id: rule.id,
    kind: rule.kind,
    weekdays: rule.weekdays,
    startDate: rule.startDate ?? "",
    endDate: rule.endDate ?? "",
    amount: String(rule.amount),
    includesBreakfast: rule.includesBreakfast,
    includesTax: rule.includesTax,
    feesNote: rule.feesNote,
    label: rule.label,
  };
}


const vnd = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export function HotelCalendar({ csrf, hotelId, rooms, onStatus }: Props) {
  const [activeRoomState, setActiveRoom] = useState(rooms[0]?.id ?? "");
  const [rules, setRules] = useState<Record<string, RuleDraft[]>>({});
  const [updatedAt, setUpdatedAt] = useState<Record<string, string | null>>({});
  const [availability, setAvailability] = useState<
    Record<string, Record<string, AvailabilityCell>>
  >({});
  const [month, setMonth] = useState<MonthView>(() => {
    const today = todayParts();
    return { y: today.y, m: today.m };
  });
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [bulkRooms, setBulkRooms] = useState("5");
  const [bulkClosed, setBulkClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rateIssues, setRateIssues] = useState<Record<string, string>>({});
  const [availabilityIssue, setAvailabilityIssue] = useState("");

  const roomIds = useMemo(() => rooms.map((room) => room.id), [rooms]);

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
        throw new HotelFormError(body, "Không lưu được dữ liệu");
      return body;
    },
    [csrf],
  );

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    setError("");
    try {
      const [rates, availabilityResult] = await Promise.all([
        api(`/api/admin/hotels/${hotelId}/rates`),
        api(
          `/api/admin/hotels/${hotelId}/availability?rooms=${roomIds.join(",")}&from=${toIsoDate({ y: month.y, m: month.m, d: 1 })}&to=${toIsoDate({ y: month.y, m: month.m + 1, d: 0 })}`,
        ),
      ]);
      const nextRules: Record<string, RuleDraft[]> = {};
      const source = (rates.rules ?? {}) as Record<string, StoredRateRule[]>;
      for (const roomId of roomIds)
        nextRules[roomId] = (source[roomId] ?? []).map(toDraft);
      setRules(nextRules);
      setUpdatedAt((rates.updatedAt ?? {}) as Record<string, string | null>);

      const rawRows = (availabilityResult.rows ?? {}) as Record<
        string,
        { date: string; rooms: number; closed: boolean }[]
      >;
      const nextAvailability: Record<string, Record<string, AvailabilityCell>> = {};
      for (const roomId of roomIds) {
        nextAvailability[roomId] = {};
        for (const row of rawRows[roomId] ?? [])
          nextAvailability[roomId][row.date] = {
            rooms: row.rooms,
            closed: row.closed,
          };
      }
      setAvailability(nextAvailability);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [api, hotelId, month.m, month.y, roomIds]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  // Derived, not stored: a room archived in another tab must not leave the
  // calendar pointing at a room that no longer exists.
  const activeRoom = rooms.some((room) => room.id === activeRoomState)
    ? activeRoomState
    : (rooms[0]?.id ?? "");

  const activeRules = rules[activeRoom] ?? [];
  const grid = useMemo(
    () => buildMonthGrid(month.y, month.m),
    [month.m, month.y],
  );

  function updateRule(index: number, patch: Partial<RuleDraft>) {
    setRateIssues({});
    setRules((current) => {
      const next = [...(current[activeRoom] ?? [])];
      next[index] = { ...next[index], ...patch };
      return { ...current, [activeRoom]: next };
    });
  }

  function addRule() {
    const kind: RateKind = activeRules.length === 0 ? "base" : "date_range";
    setRules((current) => ({
      ...current,
      [activeRoom]: [...(current[activeRoom] ?? []), emptyRule(kind, Date.now())],
    }));
  }

  function removeRule(index: number) {
    setRules((current) => ({
      ...current,
      [activeRoom]: (current[activeRoom] ?? []).filter((_, i) => i !== index),
    }));
  }

  async function saveRates() {
    setBusy(true);
    setError("");
    setRateIssues({});
    try {
      const payload = {
        rooms: rooms.map((room) => ({
          roomId: room.id,
          expectedUpdatedAt: updatedAt[room.id] ?? null,
          rules: (rules[room.id] ?? []).map((rule) => ({
            id: rule.id,
            kind: rule.kind,
            weekdays: rule.kind === "weekday" ? rule.weekdays : [],
            ...(rule.kind === "date_range"
              ? { startDate: rule.startDate, endDate: rule.endDate }
              : {}),
            amount: Number(rule.amount),
            includesBreakfast: rule.includesBreakfast,
            includesTax: rule.includesTax,
            ...(rule.feesNote ? { feesNote: rule.feesNote } : {}),
            ...(rule.label ? { label: rule.label } : {}),
          })),
        })),
      };
      const result = await api(`/api/admin/hotels/${hotelId}/rates`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const nextUpdated = (result.rooms ?? []) as {
        roomId: string;
        updatedAt: string;
      }[];
      setUpdatedAt((current) => {
        const next = { ...current };
        for (const room of nextUpdated) next[room.roomId] = room.updatedAt;
        return next;
      });
      onStatus("ok", "Đã lưu giá. Website sẽ dùng giá mới ngay sau khi tải lại.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Không lưu được giá";
      if (cause instanceof HotelFormError) {
        setRateIssues(cause.issues);
        const roomIndex = Number(Object.keys(cause.issues)[0]?.split(".")[1]);
        if (rooms[roomIndex]) setActiveRoom(rooms[roomIndex].id);
      }
      onStatus("error", message);
    } finally {
      setBusy(false);
    }
  }

  function toggleDate(iso: string) {
    setSelectedDates((current) => {
      const next = new Set(current);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  function selectMonth() {
    setSelectedDates(
      new Set(grid.filter((cell) => cell.inMonth).map((cell) => cell.iso)),
    );
  }

  async function applyAvailability(clear = false) {
    if (!activeRoom) return;
    if (selectedDates.size === 0) {
      onStatus("error", "Chọn ít nhất một ngày trên lịch trước khi áp dụng");
      return;
    }
    setBusy(true);
    setError("");
    setAvailabilityIssue("");
    try {
      const entries = [...selectedDates].map((date) => ({
        roomId: activeRoom,
        date,
        rooms: clear ? null : Number(bulkRooms),
        closed: clear ? false : bulkClosed,
      }));
      await api(`/api/admin/hotels/${hotelId}/availability`, {
        method: "POST",
        body: JSON.stringify({ entries }),
      });
      setAvailability((current) => {
        const next = { ...current };
        const room = { ...(next[activeRoom] ?? {}) };
        for (const entry of entries) {
          if (entry.rooms === null) delete room[entry.date];
          else
            room[entry.date] = {
              rooms: entry.rooms,
              closed: entry.closed,
            };
        }
        next[activeRoom] = room;
        return next;
      });
      onStatus(
        "ok",
        clear
          ? `Đã xoá số phòng của ${entries.length} ngày`
          : `Đã cập nhật ${entries.length} ngày cho hạng phòng đang chọn`,
      );
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Không lưu được tình trạng";
      setAvailabilityIssue(message);
      onStatus("error", message);
    } finally {
      setBusy(false);
    }
  }

  const activeRoomName =
    rooms.find((room) => room.id === activeRoom)?.name ?? "chưa chọn";
  const ruleIssue = (index: number, key: string) =>
    fieldIssue(rateIssues, `rooms.${rooms.findIndex((room) => room.id === activeRoom)}.rules.${index}.${key}`);

  if (rooms.length === 0)
    return (
      <p className="adm-empty">
        Tạo ít nhất một hạng phòng ở tab Hạng phòng trước khi nhập giá.
      </p>
    );

  return (
    <div className="stt-hotel-calendar">
      <div className="stt-hotel-roomtabs" role="tablist" aria-label="Hạng phòng">
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            role="tab"
            aria-selected={room.id === activeRoom}
            className="stt-hotel-roomtab"
            data-active={room.id === activeRoom}
            onClick={() => setActiveRoom(room.id)}
          >
            {room.name}
          </button>
        ))}
      </div>

      {loading ? <p className="adm-empty">Đang tải giá và tình trạng…</p> : null}
      {error ? (
        <p className="adm-field-error" role="alert">
          {error}{" "}
          <button type="button" className="adm-ghost-link" onClick={() => void load()}>
            Tải lại
          </button>
        </p>
      ) : null}

      <section className="stt-hotel-section" aria-labelledby="hotel-rates-title">
        <div className="stt-hotel-section-head">
          <h3 id="hotel-rates-title">Giá theo ngày — {activeRoomName}</h3>
          <p className="adm-hint">
            Ưu tiên: khoảng ngày &gt; theo thứ &gt; giá cơ bản. Luôn là VND cho
            một phòng một đêm; để trống nghĩa là chưa có giá.
          </p>
        </div>

        <div className="stt-hotel-rules">
          {activeRules.length === 0 ? (
            <p className="adm-empty-note">Hạng phòng này chưa có giá.</p>
          ) : null}
          {activeRules.map((rule, index) => (
            <div className="stt-hotel-rule" key={rule.id}>
              <div className="stt-hotel-rule-main">
                <label className="adm-field">
                  <span className="adm-field-label">Loại</span>
                  <select
                    value={rule.kind}
                    onChange={(event) =>
                      updateRule(index, {
                        kind: event.target.value as RateKind,
                        weekdays:
                          event.target.value === "weekday"
                            ? rule.weekdays.length
                              ? rule.weekdays
                              : [5, 6]
                            : [],
                      })
                    }
                  >
                    {(["base", "weekday", "date_range"] as RateKind[]).map(
                      (kind) => (
                        <option key={kind} value={kind}>
                          {KIND_LABEL[kind]}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                {rule.kind === "weekday" ? (
                  <div className="adm-field">
                    <span className="adm-field-label">Áp dụng thứ</span>
                    <div className="stt-hotel-weekdays">
                      {WEEKDAY_FULL.map((label, day) => (
                        <label key={label} className="stt-hotel-weekday">
                          <input
                            type="checkbox"
                            checked={rule.weekdays.includes(day)}
                            onChange={(event) =>
                              updateRule(index, {
                                weekdays: event.target.checked
                                  ? [...rule.weekdays, day].sort()
                                  : rule.weekdays.filter((value) => value !== day),
                              })
                            }
                          />
                          <span>{WEEKDAY_LABELS[day]}</span>
                        </label>
                      ))}
                    </div>
                    {ruleIssue(index, "weekdays") && <small className="adm-field-error">{ruleIssue(index, "weekdays")}</small>}
                  </div>
                ) : null}

                {rule.kind === "date_range" ? (
                  <>
                    <Field label="Từ ngày" error={ruleIssue(index, "startDate")}>
                      <AdminDatePicker
                        value={rule.startDate}
                        onChange={(value) => updateRule(index, { startDate: value })}
                      />
                    </Field>
                    <Field label="Đến ngày (gồm cả đêm)" error={ruleIssue(index, "endDate")}>
                      <AdminDatePicker
                        value={rule.endDate}
                        onChange={(value) => updateRule(index, { endDate: value })}
                      />
                    </Field>
                    <label className="adm-field">
                      <span className="adm-field-label">Tên đợt (tuỳ chọn)</span>
                      <input
                        value={rule.label}
                        maxLength={80}
                        placeholder="Cao điểm lễ 2/9"
                        onChange={(event) =>
                          updateRule(index, { label: event.target.value })
                        }
                      />
                    </label>
                  </>
                ) : null}

                <Field label="Giá mỗi đêm (VND)" error={ruleIssue(index, "amount")}
                  hint={rule.amount ? `${vnd.format(Number(rule.amount))} ₫` : undefined}>
                  <input
                    inputMode="numeric"
                    value={rule.amount}
                    onChange={(event) =>
                      updateRule(index, {
                        amount: event.target.value.replace(/[^\d]/g, ""),
                      })
                    }
                  />
                </Field>

                <label className="adm-field">
                  <span className="adm-field-label">Phụ thu chưa xác định</span>
                  <input
                    value={rule.feesNote}
                    maxLength={300}
                    placeholder="VD: phụ thu giường phụ, lễ tết…"
                    onChange={(event) =>
                      updateRule(index, { feesNote: event.target.value })
                    }
                  />
                  {rule.feesNote ? (
                    <small className="adm-field-warning">
                      Có phụ thu chưa rõ số tiền → website sẽ hiện “Cần báo giá”.
                    </small>
                  ) : null}
                </label>
              </div>

              <div className="stt-hotel-rule-side">
                <label className="adm-toggle">
                  <input
                    type="checkbox"
                    checked={rule.includesBreakfast}
                    onChange={(event) =>
                      updateRule(index, { includesBreakfast: event.target.checked })
                    }
                  />
                  <span>Bao gồm ăn sáng</span>
                </label>
                <label className="adm-toggle">
                  <input
                    type="checkbox"
                    checked={rule.includesTax}
                    onChange={(event) =>
                      updateRule(index, { includesTax: event.target.checked })
                    }
                  />
                  <span>Đã gồm thuế/phí</span>
                </label>
                <button
                  type="button"
                  className="adm-danger"
                  onClick={() => removeRule(index)}
                >
                  <AdminIcon name="trash" size={14} /> Xoá quy tắc
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="stt-hotel-actions">
          <button type="button" className="adm-add-row" onClick={addRule}>
            <AdminIcon name="plus" size={14} /> Thêm quy tắc giá
          </button>
          <button
            type="button"
            className="adm-primary"
            disabled={busy || loading}
            onClick={() => void saveRates()}
          >
            {busy ? "Đang lưu…" : "Lưu giá & tình trạng"}
          </button>
        </div>
        <p className="adm-hint">
          Lưu áp dụng cho mọi hạng phòng trong một lần, và dừng lại toàn bộ nếu
          có quy tắc chồng lấn.
        </p>
      </section>

      <section className="stt-hotel-section" aria-labelledby="hotel-availability-title">
        <div className="stt-hotel-section-head">
          <h3 id="hotel-availability-title">Số phòng tham khảo theo ngày</h3>
          <p className="adm-hint">
            Đây là số phòng Sea Trip có thể đề xuất sau khi kiểm tra đối tác — không
            phải tồn kho realtime và không tự trừ khi khách gửi yêu cầu. Để trống
            = chưa kiểm tra; 0 = không còn phòng.
          </p>
        </div>

        <div className="stt-hotel-month">
          <button
            type="button"
            className="adm-ghost-link"
            onClick={() =>
              setMonth((current) => {
                const date = new Date(current.y, current.m - 1, 1);
                return { y: date.getFullYear(), m: date.getMonth() };
              })
            }
            aria-label="Tháng trước"
          >
            ←
          </button>
          <strong>
            {MONTHS[month.m]} {month.y}
          </strong>
          <button
            type="button"
            className="adm-ghost-link"
            onClick={() =>
              setMonth((current) => {
                const date = new Date(current.y, current.m + 1, 1);
                return { y: date.getFullYear(), m: date.getMonth() };
              })
            }
            aria-label="Tháng sau"
          >
            →
          </button>
        </div>

        <div className="stt-hotel-grid" role="grid" aria-label="Lịch số phòng">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="stt-hotel-grid-head" role="columnheader">
              {label}
            </span>
          ))}
          {grid.map((cell) => {
            const value = availability[activeRoom]?.[cell.iso];
            const selected = selectedDates.has(cell.iso);
            return (
              <button
                key={cell.iso}
                type="button"
                role="gridcell"
                className="stt-hotel-day"
                data-outside={!cell.inMonth}
                data-selected={selected}
                data-empty={!value}
                aria-selected={selected}
                aria-label={`${cell.iso}: ${
                  value ? `${value.rooms} phòng${value.closed ? ", ngừng nhận" : ""}` : "chưa nhập"
                }`}
                onClick={() => toggleDate(cell.iso)}
              >
                <span className="stt-hotel-day-number">
                  {Number(cell.iso.slice(-2))}
                </span>
                <span className="stt-hotel-day-value">
                  {value ? (value.closed ? "Ngừng" : `${value.rooms} phòng`) : "—"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="stt-hotel-bulk">
          <button type="button" className="adm-ghost-link" onClick={selectMonth}>
            Chọn cả tháng
          </button>
          <button
            type="button"
            className="adm-ghost-link"
            onClick={() => setSelectedDates(new Set())}
          >
            Bỏ chọn
          </button>
          <Field label="Số phòng" error={availabilityIssue}>
            <input
              inputMode="numeric"
              value={bulkRooms}
              onChange={(event) => {
                setAvailabilityIssue("");
                setBulkRooms(event.target.value.replace(/[^\d]/g, "").slice(0, 3));
              }}
            />
          </Field>
          <label className="adm-toggle">
            <input
              type="checkbox"
              checked={bulkClosed}
              onChange={(event) => setBulkClosed(event.target.checked)}
            />
            <span>Ngừng nhận khách</span>
          </label>
          <button
            type="button"
            className="adm-primary"
            disabled={busy || selectedDates.size === 0}
            onClick={() => void applyAvailability(false)}
          >
            Áp dụng cho {selectedDates.size} ngày
          </button>
          <button
            type="button"
            className="adm-ghost-link"
            disabled={busy || selectedDates.size === 0}
            onClick={() => void applyAvailability(true)}
          >
            Xoá số phòng các ngày đã chọn
          </button>
        </div>
        <p className="adm-hint">
          Đang sửa: <strong>{activeRoomName}</strong>. Ngày trả phòng không nằm
          trong phép tính tình trạng.
        </p>
      </section>
    </div>
  );
}
