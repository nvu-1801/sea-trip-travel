import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SectionEyebrow } from "./section-eyebrow";

/**
 * Layout primitives.
 * One container width and one vertical rhythm for the whole site, so spacing
 * stays consistent as pages are added.
 */

export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("container-page", className)}>{children}</div>;
}

type SectionProps = {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  id?: string;
  /** Visual treatment, keeps section backgrounds deliberate rather than random. */
  tone?: "default" | "muted" | "sunken" | "inverse";
  /** Vertical rhythm. `loose` gives editorial breathing room. */
  spacing?: "none" | "tight" | "default" | "loose";
};

const tones = {
  default: "bg-background",
  muted: "surface-section-muted",
  sunken: "surface-section-sunken",
  inverse: "bg-brand-900 text-brand-50",
} as const;

const spacings = {
  none: "",
  tight: "py-9 sm:py-12",
  default: "py-12 sm:py-20",
  loose: "py-14 sm:py-28",
} as const;

export function Section({
  as: Tag = "section",
  className,
  children,
  id,
  tone = "default",
  spacing = "default",
}: SectionProps) {
  return (
    <Tag id={id} className={cn(tones[tone], spacings[spacing], className)}>
      {children}
    </Tag>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("flex flex-col gap-3", align === "center" ? "max-w-2xl" : "max-w-2xl")}>
        {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
        <Tag className="text-display-sm font-display font-semibold text-foreground">{title}</Tag>
        {description ? (
          <p className="text-[1.0625rem] leading-relaxed text-foreground-muted">{description}</p>
        ) : null}
      </div>
      {action ? (
        // Full-width on phones so the CTA is an easy thumb target; auto from sm.
        <div className="shrink-0 [&>a]:max-sm:w-full [&>button]:max-sm:w-full">{action}</div>
      ) : null}
    </div>
  );
}
