import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "brand" | "sun" | "neutral" | "outline" | "success";

const tones: Record<BadgeTone, string> = {
  brand:
    "border border-border bg-primary-soft text-primary-strong shadow-[inset_0_1px_0_rgb(255_255_255/0.7)]",
  sun: "border border-sun-300 bg-champagne text-accent-strong shadow-[inset_0_1px_0_rgb(255_255_255/0.7)]",
  neutral: "border border-border bg-surface-muted text-foreground-muted",
  outline: "border border-border-strong bg-surface/60 text-foreground-muted",
  success: "border border-success/20 bg-success-soft text-success",
};

export function Badge({
  tone = "brand",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
