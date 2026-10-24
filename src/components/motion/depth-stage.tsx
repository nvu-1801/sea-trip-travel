import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * CSS 3D depth for the home page — no JavaScript, no canvas.
 *
 * `DepthStage` only lights up the perspective on its subtree; `items` are the
 * children that actually travel. Each level has its own resting Z offset, so a
 * grid of cards reads as a stack with real distance between the layers instead
 * of one plane that fades.
 *
 * The motion itself lives in `src/features/home/home-motion.css` behind
 * `@supports (animation-timeline: view())` and
 * `@media (prefers-reduced-motion: no-preference)`. That keeps it free on the
 * main thread, free in browsers without scroll timelines (they get the final
 * layout immediately) and invisible to the reduced-motion and print paths.
 */
export type DepthLevel = 1 | 2 | 3;

export function DepthStage({
  children,
  className,
  count,
  perspective,
}: {
  children: ReactNode;
  className?: string;
  count?: number;
  /** Override the 1400px default when a stage is wider or very tall. */
  perspective?: string;
}) {
  return (
    <div
      className={cn("stt-depth-stage", className)}
      data-depth-stage
      data-count={count}
      style={
        perspective
          ? ({ "--stt-depth-perspective": perspective } as CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function DepthItem({
  children,
  className,
  level = 1,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  level?: DepthLevel;
  as?: "div" | "li";
}) {
  return (
    <Tag className={cn("stt-depth-item", className)} data-depth={level}>
      {children}
    </Tag>
  );
}
