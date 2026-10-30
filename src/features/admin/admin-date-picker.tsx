"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildMonthGrid,
  monthViewOf,
  parseIsoDate,
  sameDay,
  shiftDays,
  shiftMonthView,
  shiftMonths,
  toIsoDate,
  todayParts,
  weekdayIndexMonday,
  type DateParts,
  type MonthView,
} from "@/lib/date";
import { AdminIcon } from "./admin-icons";

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
const WEEKDAYS_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
const WEEKDAYS_FULL = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ nhật",
] as const;
const POPOVER_WIDTH = 304;
const POPOVER_HEIGHT = 430;

const pad = (value: number) => String(value).padStart(2, "0");
const ddmm = (parts: DateParts) =>
  `${pad(parts.d)}/${pad(parts.m + 1)}/${parts.y}`;

/**
 * Admin calendar.
 *
 * Native `<input type="date">` was replaced because Chrome renders an
 * unthemed OS popup that escapes the Studio surface and overlaps the finance
 * toolbar. This popover is portaled so it is never clipped by a modal, keeps
 * the ISO `YYYY-MM-DD` value contract, and supports the same keyboard model as
 * the public date picker.
 */
export function AdminDatePicker({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState<DateParts | null>(null);
  const [view, setView] = useState<MonthView | null>(null);
  const [focusIso, setFocusIso] = useState<string | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());

  const selected = useMemo(() => parseIsoDate(value), [value]);
  const focusDay = useCallback((iso: string) => setFocusIso(iso), []);

  useEffect(() => {
    if (!open || !focusIso) return;
    dayRefs.current.get(focusIso)?.focus();
  }, [open, focusIso]);

  const returnFocusToTrigger = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const placePopover = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 10;
    const left = Math.max(
      margin,
      Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - margin),
    );
    const below = rect.bottom + 8;
    const above = rect.top - POPOVER_HEIGHT - 8;
    const top = below + POPOVER_HEIGHT > window.innerHeight - margin && above > margin
      ? above
      : below;
    setPosition({ left, top });
  };

  const openPopover = () => {
    if (disabled) return;
    const now = todayParts();
    const base = selected ?? now;
    setToday(now);
    setView(monthViewOf(base));
    setFocusIso(toIsoDate(base));
    placePopover();
    setOpen(true);
  };

  const select = useCallback(
    (parts: DateParts) => {
      onChange(toIsoDate(parts));
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    },
    [onChange],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !wrapperRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onViewportChange = () => setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onViewportChange);
    document.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onViewportChange);
      document.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open]);

  const grid = useMemo(
    () => (view ? buildMonthGrid(view.y, view.m) : []),
    [view],
  );

  const moveFocus = (next: DateParts) => {
    setView(monthViewOf(next));
    focusDay(toIsoDate(next));
  };

  const cycleFocus = (direction: 1 | -1) => {
    const root = popoverRef.current;
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>("button:not([disabled])"),
    ).filter((element) => element.tabIndex !== -1 || element === document.activeElement);
    if (focusables.length === 0) return;
    const current = focusables.indexOf(document.activeElement as HTMLElement);
    const next = (current + direction + focusables.length) % focusables.length;
    focusables[next]?.focus();
  };

  const onPopoverKeyDown = (event: React.KeyboardEvent) => {
    const base = parseIsoDate(focusIso) ?? selected ?? today;
    if (!base) return;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        return moveFocus(shiftDays(base, -1));
      case "ArrowRight":
        event.preventDefault();
        return moveFocus(shiftDays(base, 1));
      case "ArrowUp":
        event.preventDefault();
        return moveFocus(shiftDays(base, -7));
      case "ArrowDown":
        event.preventDefault();
        return moveFocus(shiftDays(base, 7));
      case "Home":
        event.preventDefault();
        return moveFocus(shiftDays(base, -weekdayIndexMonday(base)));
      case "End":
        event.preventDefault();
        return moveFocus(shiftDays(base, 6 - weekdayIndexMonday(base)));
      case "PageUp":
        event.preventDefault();
        return moveFocus(shiftMonths(base, -1));
      case "PageDown":
        event.preventDefault();
        return moveFocus(shiftMonths(base, 1));
      case "Enter":
      case " ":
        event.preventDefault();
        return select(base);
      case "Escape":
        event.preventDefault();
        return returnFocusToTrigger();
      case "Tab":
        event.preventDefault();
        return cycleFocus(event.shiftKey ? -1 : 1);
      default:
        return;
    }
  };

  const popover =
    open && view && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="false"
            aria-label="Chọn ngày"
            onKeyDown={onPopoverKeyDown}
            className="adm-date-pop"
            style={{ left: position.left, top: position.top }}
          >
            <div className="adm-date-head">
              <button
                type="button"
                onClick={() => setView(shiftMonthView(view, -1))}
                aria-label="Tháng trước"
                className="adm-date-nav"
              >
                ‹
              </button>
              <p aria-live="polite">
                {MONTHS[view.m]} <span>{view.y}</span>
              </p>
              <button
                type="button"
                onClick={() => setView(shiftMonthView(view, 1))}
                aria-label="Tháng sau"
                className="adm-date-nav"
              >
                ›
              </button>
            </div>

            <div
              role="grid"
              aria-label={`${MONTHS[view.m]} ${view.y}`}
              className="adm-date-grid"
            >
              <div role="row" className="adm-date-row">
                {WEEKDAYS_SHORT.map((day, index) => (
                  <div
                    key={day}
                    role="columnheader"
                    aria-label={WEEKDAYS_FULL[index]}
                    className="adm-date-weekday"
                  >
                    {day}
                  </div>
                ))}
              </div>
              {Array.from({ length: 6 }, (_, week) => (
                <div key={week} role="row" className="adm-date-row">
                  {grid.slice(week * 7, week * 7 + 7).map((cell) => {
                    const isSelected = sameDay(cell.parts, selected);
                    const isToday = sameDay(cell.parts, today);
                    const isFocusTarget = cell.iso === focusIso;
                    return (
                      <div key={cell.iso} role="gridcell" aria-selected={isSelected}>
                        <button
                          ref={(node) => {
                            if (node) dayRefs.current.set(cell.iso, node);
                            else dayRefs.current.delete(cell.iso);
                          }}
                          type="button"
                          tabIndex={isFocusTarget ? 0 : -1}
                          aria-label={`${cell.parts.d} ${MONTHS[cell.parts.m]} ${cell.parts.y}`}
                          aria-current={isToday ? "date" : undefined}
                          onClick={() => select(cell.parts)}
                          data-selected={isSelected || undefined}
                          data-today={isToday || undefined}
                          data-outside={!cell.inMonth || undefined}
                          className="adm-date-day"
                        >
                          {cell.parts.d}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="adm-date-foot">
              <span>{selected ? ddmm(selected) : "Chưa chọn ngày"}</span>
              <button
                type="button"
                onClick={() => today && select(today)}
                disabled={!today}
              >
                Hôm nay
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={wrapperRef} className="adm-date">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="adm-date-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? returnFocusToTrigger() : openPopover())}
        onKeyDown={(event) => {
          if (
            !open &&
            (event.key === "ArrowDown" ||
              event.key === "Enter" ||
              event.key === " ")
          ) {
            event.preventDefault();
            openPopover();
          }
        }}
      >
        <AdminIcon name="calendar" size={15} />
        <span data-empty={selected ? undefined : "true"}>
          {selected ? ddmm(selected) : "Chọn ngày"}
        </span>
        <i aria-hidden="true" className="adm-date-caret" />
      </button>
      {popover}
    </div>
  );
}
