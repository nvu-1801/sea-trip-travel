"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronDownIcon, ChevronRightIcon } from "./icons";
import { controlClassName } from "./form-controls";

/**
 * Date-picker strings. Passed in from the server so the catalogs stay out of the
 * client bundle.
 */
export type DatePickerLabels = {
  placeholder: string;
  dialogLabel: string;
  previousMonth: string;
  nextMonth: string;
  clear: string;
  today: string;
  tomorrow: string;
  months: readonly string[];
  weekdaysShort: readonly string[];
  weekdaysFull: readonly string[];
  /** "{day} {month} {year}" */
  dayAria: string;
};

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    vars[key] === undefined ? match : String(vars[key]),
  );
}

const pad = (value: number) => String(value).padStart(2, "0");
const ddmm = (parts: DateParts) => `${pad(parts.d)}/${pad(parts.m + 1)}/${parts.y}`;

/**
 * Custom date picker.
 *
 * The popup is built here rather than using `<input type="date">` so it can be
 * themed; the value contract is unchanged (ISO `YYYY-MM-DD`, or `""`).
 *
 * Accessibility: `role="dialog"` popover, `role="grid"` calendar with
 * `columnheader`/`gridcell`, roving `tabindex`, `aria-selected`, and
 * `aria-current="date"`. Arrow keys move by day/week, PageUp/PageDown by month,
 * Home/End to week edges, Enter/Space selects, Escape closes, clicking outside
 * closes. All labels come from `labels`.
 */
export function DatePicker({
  id,
  value,
  onChange,
  invalid = false,
  labels,
  describedBy,
  className,
}: {
  id: string;
  /** ISO `YYYY-MM-DD`, or `""` when empty. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  labels: DatePickerLabels;
  describedBy?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState<DateParts | null>(null);
  const [view, setView] = useState<MonthView | null>(null);
  const [focusIso, setFocusIso] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());

  const selected = useMemo(() => parseIsoDate(value), [value]);

  const focusDay = useCallback((iso: string) => {
    setFocusIso(iso);
  }, []);

  useEffect(() => {
    if (!open || !focusIso) return;
    dayRefs.current.get(focusIso)?.focus();
  }, [open, focusIso]);

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
        event.preventDefault();
        return cycleFocus(event.shiftKey ? -1 : 1);
      default:
        return;
    }
  };

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
          {selected ? ddmm(selected) : labels.placeholder}
        </span>
        {selected ? (
          <span className="hidden shrink-0 text-xs text-foreground-subtle sm:inline">
            {labels.weekdaysFull[weekdayIndexMonday(selected)]}
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
          aria-label={labels.dialogLabel}
          onKeyDown={onPopoverKeyDown}
          className={cn(
            "absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[19.5rem] max-w-[calc(100vw-2.5rem)]",
            "origin-top rounded-2xl border border-border bg-surface p-3 shadow-lifted",
            "animate-[stt-entrance_0.18s_var(--ease-out-soft)_both]",
          )}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setView(shiftMonthView(view, -1))}
              data-focus-ring=""
              aria-label={labels.previousMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-primary-soft hover:text-primary-strong"
            >
              <ChevronRightIcon className="h-4 w-4 rotate-180" />
            </button>

            <p aria-live="polite" className="text-sm font-bold text-foreground">
              {labels.months[view.m]} {view.y}
            </p>

            <button
              type="button"
              onClick={() => setView(shiftMonthView(view, 1))}
              data-focus-ring=""
              aria-label={labels.nextMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-primary-soft hover:text-primary-strong"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar grid */}
          <div
            role="grid"
            aria-label={`${labels.months[view.m]} ${view.y}`}
            className="mt-2 grid grid-cols-7 gap-y-0.5"
          >
            <div role="row" className="contents">
              {labels.weekdaysShort.map((day, index) => (
                <div
                  key={day}
                  role="columnheader"
                  aria-label={labels.weekdaysFull[index]}
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
                        aria-label={fmt(labels.dayAria, {
                          day: cell.parts.d,
                          month: labels.months[cell.parts.m],
                          year: cell.parts.y,
                        })}
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
              {labels.clear}
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => today && select(today)}
                data-focus-ring=""
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary-strong transition-colors hover:bg-primary-soft"
              >
                {labels.today}
              </button>
              <button
                type="button"
                onClick={() => today && select(shiftDays(today, 1))}
                data-focus-ring=""
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary-strong transition-colors hover:bg-primary-soft"
              >
                {labels.tomorrow}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
