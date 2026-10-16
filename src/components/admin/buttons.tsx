"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Buttons that know whether their form is in flight.
 *
 * `useFormStatus` reads the parent form's pending state, so every submit button
 * disables itself during a Server Action — which is the first line of defence
 * against a double submit.
 */

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-[background-color,color,border-color,transform] duration-200 disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary: "bg-primary text-white hover:bg-primary-strong-hover",
  secondary: "border border-border-strong bg-surface text-foreground hover:border-brand-300 hover:bg-primary-soft",
  danger: "border border-danger/40 bg-danger-soft text-danger hover:bg-danger/10",
  ghost: "text-foreground-muted hover:bg-surface-muted hover:text-foreground",
} as const;

export function SubmitButton({
  children,
  variant = "primary",
  className,
  pendingLabel,
  name,
  value,
  formAction,
  confirm,
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  pendingLabel?: string;
  name?: string;
  value?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending}
      onClick={
        confirm
          ? (event) => {
              if (!window.confirm(confirm)) event.preventDefault();
            }
          : undefined
      }
      className={cn(base, variants[variant], className)}
    >
      {pending ? (pendingLabel ?? "Đang lưu…") : children}
    </button>
  );
}

/** A destructive action guarded by a native confirm dialog. */
export function ConfirmSubmit({
  children,
  message,
  variant = "danger",
  className,
  name,
  value,
}: {
  children: ReactNode;
  message: string;
  variant?: keyof typeof variants;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className={cn(base, variants[variant], className)}
    >
      {pending ? "Đang xử lý…" : children}
    </button>
  );
}
