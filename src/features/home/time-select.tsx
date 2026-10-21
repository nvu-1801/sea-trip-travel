"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon, ClockIcon } from "@/components/ui/icons";

export type TimeOption = { value: string; label: string; hint: string };

/**
 * Dropdown chọn thời gian cho QuickFinder.
 *
 * Progressive enhancement: `<select>` gốc luôn nằm trong form (no-JS vẫn
 * dùng được, mobile vẫn có thể dùng picker hệ thống) và là control được
 * submit. Khi JS chạy, select gốc được ẩn (vẫn submit bình thường) và UI
 * custom dạng pill + menu hiện ra. Menu dùng pattern menu/menuitemradio:
 * Tab tới từng mục, Enter/Space chọn, Esc đóng và trả focus về nút.
 */
export function TimeSelect({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: readonly TimeOption[];
  /** Initial value (e.g. from URL params). Falls back to the first option. */
  defaultValue?: string;
}) {
  // false khi render server / no-JS (hiện select gốc), true sau hydrate.
  const enhanced = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(
    () =>
      options.some((option) => option.value === defaultValue)
        ? (defaultValue as string)
        : (options[0]?.value ?? ""),
  );
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className="stt-time-select"
      data-enhanced={enhanced ? "true" : "false"}
    >
      <select
        name={name}
        aria-label={label}
        value={value}
        tabIndex={enhanced ? -1 : 0}
        onChange={(event) => setValue(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        ref={buttonRef}
        type="button"
        className="stt-time-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <ClockIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="stt-time-current">{selected?.label}</span>
        <ChevronDownIcon
          className={cn("h-4 w-4 shrink-0", open && "stt-time-open")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <span
          id={menuId}
          role="menu"
          aria-label={label}
          className="stt-time-menu"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className="stt-time-option"
                data-active={active ? "true" : undefined}
                onClick={() => {
                  setValue(option.value);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
              >
                <span className="stt-time-text">
                  <span className="stt-time-label">{option.label}</span>
                  <span className="stt-time-hint">{option.hint}</span>
                </span>
                {active && (
                  <CheckIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}
