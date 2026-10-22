"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { AlertIcon, CheckIcon, ChevronDownIcon } from "./icons";

/**
 * Form primitives.
 *
 * Two rules keep the form visually stable:
 *
 * 1. **Every control has an explicit height** (`h-11`) and an explicit
 *    `line-height`. Without a fixed height, an `<input>` sizes itself from its
 *    content, so an empty field, a filled field, a `<select>` and a
 *    `type="date"` field all end up a few pixels apart — which is exactly the
 *    "jumps before/after typing" artefact. A fixed box removes the whole class
 *    of problem, including the browser's own intrinsic height for date/select.
 * 2. **The message slot is always rendered** with a reserved line height, so
 *    showing a validation error never pushes the fields below it downwards.
 *
 * Accessibility rules are baked in: every control is labelled, errors are tied
 * to the input with `aria-describedby` + `aria-invalid`, and the error text is a
 * live region so screen readers announce it when validation runs.
 */

export function Field({
  id,
  label,
  required = false,
  hint,
  error,
  optionalLabel = "tuỳ chọn",
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const message = error ?? hint;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/*
        The label and the required/optional marker share ONE line. Keep labels
        and markers short enough to fit a half-width column at `sm` (~290px):
        if either wraps, that cell grows and the row stops reading as one row.
      */}
      <label
        htmlFor={id}
        className="flex min-h-5 items-baseline gap-1.5 text-sm font-semibold text-foreground"
      >
        <span>{label}</span>
        {required ? (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-xs font-normal text-foreground-subtle">({optionalLabel})</span>
        )}
      </label>

      {children}

      {/*
        The message slot is ALWAYS rendered (with a reserved line) and always
        carries the same id, so a control can reference it unconditionally with
        `aria-describedby` and the block height never changes between states.
      */}
      <p
        id={`${id}-message`}
        role={error ? "alert" : undefined}
        className={cn(
          "flex min-h-4 items-start gap-1.5 text-xs leading-4",
          error ? "font-medium text-danger" : "text-foreground-subtle",
        )}
      >
        {error ? <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" /> : null}
        {message ?? ""}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Control styles                                                             */
/* -------------------------------------------------------------------------- */

const controlBase =
  "block w-full min-w-0 rounded-md border bg-surface text-[0.9375rem] leading-6 text-foreground transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-foreground-subtle/80 focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-sunken";

/** One height for every control — inputs, selects and date fields line up. */
const controlSize = "h-11 px-3.5";

const controlValid = "border-border-strong hover:border-brand-200 focus:border-primary-strong";
const controlInvalid = "border-danger bg-danger-soft/40 focus:border-danger";

function stateClasses(invalid: boolean): string {
  return invalid ? controlInvalid : controlValid;
}

/**
 * Shared shell for every control. Exported so composites that are not plain
 * `<input>` (the custom date picker trigger) render the exact same box.
 */
export function controlClassName(invalid = false, className?: string): string {
  return cn(controlBase, controlSize, stateClasses(invalid), className);
}

export function Input({
  className,
  invalid = false,
  type,
  ...props
}: ComponentPropsWithRef<"input"> & { invalid?: boolean }) {
  const isNumber = type === "number";

  return (
    <input
      type={type}
      data-focus-ring=""
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        controlSize,
        isNumber && "input-number",
        stateClasses(invalid),
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid = false,
  ...props
}: ComponentPropsWithRef<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      data-focus-ring=""
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        // Same padding and line-height as the inputs; only the height differs.
        "min-h-28 resize-y px-3.5 py-2.5 leading-relaxed",
        stateClasses(invalid),
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Select                                                                     */
/* -------------------------------------------------------------------------- */

export type SelectOption = {
  value: string;
  label: string;
};

/** Server render / no-JS snapshot: show the native control. */
const subscribeHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Brand-styled select.
 *
 * Why not a native `<select>`: the option popup is drawn by the operating
 * system, so it ignores every token we have — square corners, system font and
 * that blue Windows highlight (see the old screenshot). Custom options are the
 * only way to make the list match the rest of the site.
 *
 * What we keep from the native control:
 * - it is what server render and no-JS visitors get (`useSyncExternalStore`
 *   gives `false` until hydration), so the field still works without JS;
 * - it stays the value source for plain forms, via a hidden input after
 *   hydration;
 * - the popup follows the ARIA combobox/listbox pattern: focus stays on the
 *   trigger, arrow/Home/End move the active option, Enter/Space commit,
 *   Escape closes, letters jump (type-ahead), and `aria-activedescendant`
 *   tells screen readers which option is current.
 */
export function Select({
  id,
  name,
  value,
  options,
  onChange,
  invalid = false,
  disabled = false,
  placeholder,
  className,
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  name?: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  /** Shown when `value` matches no option. */
  placeholder?: string;
  className?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  const enhanced = useSyncExternalStore(
    subscribeHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
  const baseId = useId().replace(/:/g, "");
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const typeahead = useRef({ text: "", at: 0 });

  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  /** Follow the trigger while the page scrolls, so the list never hangs off-screen. */
  const syncPlacement = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Flip upwards only when there is clearly more room above than below.
    setDropUp(
      window.innerHeight - rect.bottom < 260 &&
        rect.top > window.innerHeight - rect.bottom,
    );
  }, []);

  const openList = (index = selectedIndex >= 0 ? selectedIndex : 0) => {
    syncPlacement();
    setActiveIndex(index);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (option.value !== value) onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const typeaheadIndex = (key: string, from: number): number | null => {
    const now = Date.now();
    const previous = typeahead.current;
    const text = now - previous.at > 600 ? key : previous.text + key;
    typeahead.current = { text, at: now };
    const needle = text.toLocaleLowerCase();
    for (let step = 1; step <= options.length; step += 1) {
      const index = (from + step) % options.length;
      if (options[index].label.toLocaleLowerCase().startsWith(needle)) {
        return index;
      }
    }
    return null;
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const last = options.length - 1;

    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setActiveIndex((current) => {
        if (event.key === "ArrowDown") return current >= last ? 0 : current + 1;
        return current <= 0 ? last : current - 1;
      });
      return;
    }

    if (open && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : last);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else openList();
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
      return;
    }

    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const match = typeaheadIndex(event.key, open ? activeIndex : selectedIndex);
      if (match === null) return;
      event.preventDefault();
      if (open) setActiveIndex(match);
      else openList(match);
    }
  };

  // Close on an outside pointer press — no blur handler, so a press on an
  // option is never swallowed before its click fires.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = triggerRef.current?.parentElement;
      if (root && !root.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the keyboard-active option in view inside the scrollable list.
  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  // The anchor can move while the list is open (page scroll / viewport resize),
  // so re-evaluate the drop direction instead of leaving it stuck.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => syncPlacement();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, syncPlacement]);

  return (
    <span className="relative block">
      {enhanced ? (
        <>
          <button
            ref={triggerRef}
            id={id}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open ? optionId(activeIndex) : undefined}
            aria-labelledby={ariaLabelledBy}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-invalid={invalid || undefined}
            data-focus-ring=""
            disabled={disabled}
            onClick={() => {
              if (open) setOpen(false);
              else openList();
            }}
            onKeyDown={onKeyDown}
            className={cn(
              controlBase,
              controlSize,
              "flex cursor-pointer items-center gap-2 pr-10 text-left",
              stateClasses(invalid),
              open && "border-primary-strong shadow-[var(--shadow-focus)]",
              className,
            )}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                selected ? undefined : "text-foreground-subtle/80",
              )}
            >
              {selected?.label ?? placeholder ?? ""}
            </span>
          </button>

          {open ? (
            <div
              id={listId}
              role="listbox"
              aria-labelledby={ariaLabelledBy}
              aria-label={ariaLabel}
              data-drop={dropUp ? "up" : "down"}
              className={cn(
                "stt-select-pop absolute inset-x-0 z-50 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lifted",
                dropUp ? "bottom-full mb-2" : "top-full mt-2",
              )}
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    id={optionId(index)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    data-active={index === activeIndex ? "true" : undefined}
                    onClick={() => choose(index)}
                    className={cn(
                      "stt-select-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      index === activeIndex
                        ? "bg-primary-soft text-primary-strong"
                        : "text-foreground hover:bg-surface-muted",
                      isSelected && "font-semibold",
                    )}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {isSelected ? (
                      <CheckIcon
                        className="h-4 w-4 shrink-0 text-primary-strong"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {name ? <input type="hidden" name={name} value={value} /> : null}
        </>
      ) : (
        <select
          id={id}
          name={name}
          value={value}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-labelledby={ariaLabelledBy}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            controlBase,
            controlSize,
            "cursor-pointer appearance-none pr-10",
            stateClasses(invalid),
            className,
          )}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      <ChevronDownIcon
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle transition-transform duration-200",
          open && "rotate-180 text-primary-strong",
        )}
      />
    </span>
  );
}

export function Checkbox({
  className,
  invalid = false,
  ...props
}: ComponentPropsWithRef<"input"> & { invalid?: boolean }) {
  return (
    <input
      type="checkbox"
      data-focus-ring=""
      aria-invalid={invalid || undefined}
      className={cn(
        "mt-0.5 h-4.5 w-4.5 shrink-0 cursor-pointer rounded-xs border accent-[var(--color-primary-strong)]",
        invalid ? "border-danger" : "border-border-strong",
        className,
      )}
      {...props}
    />
  );
}
