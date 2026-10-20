import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll reveal.
 *
 * Deliberately JS-free. The animation is driven by CSS scroll-driven
 * animations (`animation-timeline: view()`), so:
 *
 *  - there is no IntersectionObserver, no state and no client bundle;
 *  - no hydration mismatch, because nothing differs between server and client;
 *  - content is visible by default — if the browser lacks support, or motion is
 *    reduced, or JavaScript never runs, the page simply renders normally.
 *
 * Variants are transform-only (no opacity) so print / full-page captures never
 * hide content. `delay` staggers siblings by 60ms steps, capped at 120ms.
 *
 * See the `@supports (animation-timeline: view())` block in globals.css for the
 * progressive-enhancement gate.
 */
export type RevealVariant = "rise" | "left" | "right" | "zoom";

export function Reveal({
  children,
  className,
  as: Tag = "div",
  variant = "rise",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  variant?: RevealVariant;
  delay?: 0 | 1 | 2;
}) {
  return (
    <Tag
      data-reveal={variant === "rise" ? "" : variant}
      data-reveal-delay={delay > 0 ? String(delay) : undefined}
      className={cn(className)}
    >
      {children}
    </Tag>
  );
}
