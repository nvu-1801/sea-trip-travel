"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MONTH_LABELS,
  WEEKDAY_FULL,
  WEEKDAY_SHORT,
  buildMonthGrid,
  formatDateWithWeekday,
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
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronDownIcon, ChevronRightIcon } from "./icons";
import { controlClassName } from "./form-controls";

/**
 * Custom date picker.
 *
 * Why not `<input type="date">`: the calendar popup lives in the browser's shadow
 * DOM and cannot be styled. Chrome paints the selected day in its own blue
 * regardless of `accent-color`, which looks foreign next to the brand pink and
 * the rest of the form. Everything around the field could be themed; the one
 * part the customer actually looks at could not.
 *
 * So the popup is built here. The value contract is unchanged: an ISO
 * `YYYY-MM-DD` string, or `""` when cleared — identical to what the native input
 * produced, so nothing downstream changes.
 *
 * Accessibility: `role="dialog"` popover, `role="grid"` calendar with
 * `columnheader`/`gridcell`, roving `tabindex`, `aria-selected`, and
 * `aria-current="date"`. Arrow keys move by day/week, PageUp/PageDown by month,
 * Home/End to week edges, Enter/Space selects, Escape closes, clicking outside
 * closes. Date arithmetic lives in `lib/date.ts`.
 */
export function DatePicker({
  id,
  value,
  onChange,
  invalid = false,
  placeholder = "Chọn ngày",
  describedBy,
  className,
}: {
  id: string;
  /** ISO `YYYY-MM-DD`, or `""` when empty. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
  describedBy?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  /**
   * "Today" is resolved on open (a user gesture), never during render: reading
   * the clock while rendering would differ between server and client.
   */
  const [today, setToday] = useState<DateParts | null>(null);
  const [view, setView] = useState<MonthView | null>(null);
  const [focusIso, setFocusIso] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());

  const selected = useMemo(() => parseIsoDate(value), [value]);

  const focusDay = useCallback((iso: string) => {
    setFocusIso(iso);
    requestAnimationFrame(() => dayRefs.current.get(iso)?.focus());
  }, []);

  const returnFocusToTrigger = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openPopover = () => {
    const now = todayParts();
    const base = selected ?? now;
    setToday(now);
    setView(monthViewOf(base));
    setFocusIso(toIsoDate(base));
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

  const clear = () => {
    onChange("");
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  // Close on outside pointer press.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const grid = useMemo(() => (view ? buildMonthGrid(view.y, view.m) : []), [view]);

  const moveFocus = (next: DateParts) => {
    setView(monthViewOf(next));
    focusDay(toIsoDate(next));
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
        // Small surface, few focusables: a simple wrap keeps focus inside.
        event.preventDefault();
        return cycleFocus(event.shiftKey ? -1 : 1);
      default:
        return;
    }
  };

  /** Wrap Tab within the popover (month nav → days → quick actions). */
  const cycleFocus = (direction: 1 | -1) => {
    const root = wrapperRef.current?.querySelector<HTMLElement>('[role="dialog"]');
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>("button:not([disabled])"),
    ).filter((element) => element.tabIndex !== -1 || element === document.activeElement);
    if (focusables.length === 0) return;

    const current = focusables.indexOf(document.activeElement as HTMLElement);
    const next = (current + direction + focusables.length) % focusables.length;
    focusables[next]?.focus();
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        data-focus-ring=""
        onClick={() => (open ? returnFocusToTrigger() : openPopover())}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            openPopover();
            return;
          }
          if (open && event.key === "Escape") {
            event.preventDefault();
            returnFocusToTrigger();
          }
        }}
        className={cn(
          controlClassName(invalid),
          "flex cursor-pointer items-center gap-2.5 text-left",
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-primary-strong" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            selected ? "font-medium text-foreground" : "text-foreground-subtle",
          )}
        >
          {selected ? formatDateWithWeekday(value).split(" · ")[0] : placeholder}
        </span>
        {selected ? (
          <span className="hidden shrink-0 text-xs text-foreground-subtle sm:inline">
            {WEEKDAY_FULL[weekdayIndexMonday(selected)]}
          </span>
        ) : null}
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-foreground-subtle transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && view ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Chọn ngày khởi hành"
          onKeyDown={onPopoverKeyDown}
          className={cn(
            "absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[19.5rem] max-w-[calc(100vw-2.5rem)]",
            "origin-top rounded-2xl border border-border bg-surface p-3 shadow-lifted",
            "animate-[stt-reveal_0.18s_var(--ease-out-soft)_both]",
          )}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setView(shiftMonthView(view, -1))}
              data-focus-ring=""
              aria-label="Tháng trước"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-primary-soft hover:text-primary-strong"
            >
              <ChevronRightIcon className="h-4 w-4 rotate-180" />
            </button>

            <p aria-live="polite" className="text-sm font-bold text-foreground">
              {MONTH_LABELS[view.m]} {view.y}
            </p>

            <button
              type="button"
              onClick={() => setView(shiftMonthView(view, 1))}
              data-focus-ring=""
              aria-label="Tháng sau"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-primary-soft hover:text-primary-strong"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar grid */}
          <div
            role="grid"
            aria-label={`${MONTH_LABELS[view.m]} ${view.y}`}
            className="mt-2 grid grid-cols-7 gap-y-0.5"
          >
            <div role="row" className="contents">
              {WEEKDAY_SHORT.map((day, index) => (
                <div
                  key={day}
                  role="columnheader"
                  aria-label={WEEKDAY_FULL[index]}
                  className="flex h-8 items-center justify-center text-[0.6875rem] font-bold uppercase tracking-wide text-foreground-subtle"
                >
                  {day}
                </div>
              ))}
            </div>

            {Array.from({ length: 6 }, (_, week) => (
              <div key={week} role="row" className="contents">
                {grid.slice(week * 7, week * 7 + 7).map((cell) => {
                  const isSelected = sameDay(cell.parts, selected);
                  const isToday = sameDay(cell.parts, today);
                  const isFocusTarget = cell.iso === focusIso;

                  return (
                    <div
                      key={cell.iso}
                      role="gridcell"
                      aria-selected={isSelected}
                      className="flex justify-center"
                    >
                      <button
                        ref={(node) => {
                          if (node) dayRefs.current.set(cell.iso, node);
                          else dayRefs.current.delete(cell.iso);
                        }}
                        type="button"
                        tabIndex={isFocusTarget ? 0 : -1}
                        aria-label={`${cell.parts.d} ${MONTH_LABELS[cell.parts.m]} ${cell.parts.y}`}
                        aria-current={isToday ? "date" : undefined}
                        data-focus-ring=""
                        onClick={() => select(cell.parts)}
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors duration-150",
                          isSelected
                            ? "bg-primary-strong font-bold text-white shadow-soft"
                            : "text-foreground hover:bg-primary-soft hover:text-primary-strong",
                          !isSelected && isToday && "font-bold text-primary-strong ring-1 ring-brand-300",
                          !isSelected && !isToday && !cell.inMonth && "text-foreground-subtle/55",
                        )}
                      >
                        {cell.parts.d}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <button
              type="button"
              onClick={clear}
              data-focus-ring=""
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              Xoá
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => today && select(today)}
                data-focus-ring=""
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary-strong transition-colors hover:bg-primary-soft"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => today && select(shiftDays(today, 1))}
                data-focus-ring=""
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary-strong transition-colors hover:bg-primary-soft"
              >
                Ngày mai
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
