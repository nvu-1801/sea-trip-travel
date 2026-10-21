"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Editorial viewport entrance without flickering. Respects motion preferences. */
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
  delay?: number;
}) {
  const element = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = element.current;
    if (!node) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isPaused = () =>
      media.matches || document.documentElement.dataset.motionPaused === "true";

    if (isPaused() || !("IntersectionObserver" in window)) {
      node.setAttribute("data-revealed", "true");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.setAttribute("data-revealed", "true");
          observer.disconnect();
        }
      },
      {
        threshold: 0,
        rootMargin: "0px 0px 100px 0px", // Trigger 100px in advance so there is no popping!
      },
    );

    observer.observe(node);

    const preferences = new MutationObserver(() => {
      if (isPaused()) {
        node.setAttribute("data-revealed", "true");
      }
    });
    preferences.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-motion-paused"],
    });

    return () => {
      observer.disconnect();
      preferences.disconnect();
    };
  }, []);

  return (
    <Tag
      ref={element}
      data-reveal-3d={variant}
      data-revealed="false"
      style={{
        transitionDelay: delay > 0 ? `${Math.min(delay, 5) * 85}ms` : undefined,
      }}
      className={cn("stt-reveal-3d", className)}
    >
      {children}
    </Tag>
  );
}

