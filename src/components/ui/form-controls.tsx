import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertIcon, ChevronDownIcon } from "./icons";

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

/**
 * Select with a custom chevron.
 *
 * The native control is kept on purpose — on phones the OS picker is far better
 * than anything we could build, and it stays keyboard- and screen-reader-native.
 * What changes is the shell: `appearance-none`, the shared 44px box, the shared
 * border/hover/focus treatment, and our own chevron.
 */
export function Select({
  className,
  invalid = false,
  children,
  ...props
}: ComponentPropsWithRef<"select"> & { invalid?: boolean }) {
  return (
    <span className="relative block">
      <select
        data-focus-ring=""
        aria-invalid={invalid || undefined}
        className={cn(
          controlBase,
          controlSize,
          "cursor-pointer appearance-none pr-10",
          stateClasses(invalid),
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle"
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
