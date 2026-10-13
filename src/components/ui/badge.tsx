import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "brand" | "sun" | "neutral" | "outline" | "success";

const tones: Record<BadgeTone, string> = {
  brand: "bg-primary-soft text-primary-strong",
  sun: "bg-amber-50 text-accent-strong",
  neutral: "bg-surface-sunken text-foreground-muted",
  outline: "border border-border-strong text-foreground-muted",
  success: "bg-success-soft text-success",
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
