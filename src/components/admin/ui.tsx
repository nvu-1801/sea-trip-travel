import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Admin UI primitives.
 *
 * Plain presentational components (no hooks), so they can be imported by both
 * Server and Client Components. They reuse the public site's design tokens so
 * the admin feels like the same product, not a bolted-on panel.
 */

export function AdminCard({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={cn("rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6", className)}>
      {children}
    </Tag>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="ml-1 text-primary-strong">*</span> : null}
      </label>
      {hint ? <p className="text-xs leading-relaxed text-foreground-subtle">{hint}</p> : null}
      {children}
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-none outline-none transition-colors placeholder:text-foreground-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export const textareaClass = cn(inputClass, "min-h-24 font-[inherit] leading-relaxed");

export function StatusPill({
  status,
  label,
}: {
  status: "draft" | "published" | "hidden" | "new" | "processing" | "done" | "demo" | "verified";
  label: string;
}) {
  const tone: Record<string, string> = {
    published: "bg-success-soft text-success border-success/30",
    verified: "bg-success-soft text-success border-success/30",
    done: "bg-success-soft text-success border-success/30",
    draft: "bg-surface-muted text-foreground-muted border-border-strong",
    demo: "bg-surface-muted text-foreground-muted border-border-strong",
    processing: "bg-sun-300/25 text-foreground border-sun-300",
    hidden: "bg-surface-sunken text-foreground-subtle border-border",
    new: "bg-primary-soft text-primary-strong border-brand-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tone[status] ?? tone.draft,
      )}
    >
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-foreground-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Alert({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: ReactNode;
}) {
  const tones = {
    success: "border-success/30 bg-success-soft text-success",
    error: "border-danger/30 bg-danger-soft text-danger",
    info: "border-border-strong bg-surface-muted text-foreground-muted",
  } as const;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", tones[tone])}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-foreground-muted">{hint}</p> : null}
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        className="block rounded-2xl border border-border bg-surface p-5 shadow-soft transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
      >
        {inner}
      </a>
    );
  }
  return <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">{inner}</div>;
}

/** Small monospace chip, used for slugs, ids and request codes. */
export function CodeChip({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-foreground-muted">
      {children}
    </code>
  );
}
