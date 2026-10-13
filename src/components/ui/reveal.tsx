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
 * See the `@supports (animation-timeline: view())` block in globals.css for the
 * progressive-enhancement gate.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag data-reveal="" className={cn(className)}>
      {children}
    </Tag>
  );
}
