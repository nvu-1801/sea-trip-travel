"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/** Editorial viewport entrance without flickering. Respects motion preferences. */
export type RevealVariant = "rise" | "left" | "right" | "zoom";

/**
 * One observer per revealed group.
 *
 * The element is revealed by setting `data-revealed="true"`; the motion itself
 * lives in CSS. That keeps the animation off the main thread and means the
 * reduced-motion / print / manual-pause rules can neutralise it declaratively.
 */
function useRevealObserver<T extends HTMLElement>() {
  const element = useRef<T>(null);

  useEffect(() => {
    const node = element.current;
    if (!node) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isPaused = () =>
      media.matches || document.documentElement.dataset.motionPaused === "true";
    const reveal = () => node.setAttribute("data-revealed", "true");

    if (isPaused() || !("IntersectionObserver" in window)) {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      {
        threshold: 0,
        // Start when the element is about a tenth of the viewport above the
        // bottom edge, so the 920ms entrance is actually visible instead of
        // finishing while the block is still below the fold.
        rootMargin: "0px 0px -10% 0px",
      },
    );

    observer.observe(node);

    const preferences = new MutationObserver(() => {
      if (isPaused()) reveal();
    });
    preferences.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-motion-paused"],
    });

    // The OS preference can change while the page is open. Never leave a
    // section parked at opacity 0 because the media query flipped after mount.
    const onPreferenceChange = () => {
      if (isPaused()) reveal();
    };
    media.addEventListener("change", onPreferenceChange);

    return () => {
      observer.disconnect();
      preferences.disconnect();
      media.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return element;
}

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
  const element = useRevealObserver<HTMLElement>();

  return (
    <Tag
      ref={element}
      data-reveal-3d={variant}
      data-revealed="false"
      style={{
        transitionDelay: delay > 0 ? `${Math.min(delay, 5) * 90}ms` : undefined,
      }}
      className={cn("stt-reveal-3d", className)}
    >
      {children}
    </Tag>
  );
}

/**
 * A section heading that arrives in reading order: eyebrow → title → copy → CTA.
 *
 * The whole block is watched once, then its direct children are staggered in
 * CSS. This deliberately replaces "one Reveal per child": one observer instead
 * of four, and a rhythm that follows the copy rather than the DOM noise.
 */
export function RevealGroup({
  children,
  className,
  as: Tag = "div",
  stagger = 90,
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  stagger?: number;
}) {
  const element = useRevealObserver<HTMLElement>();

  return (
    <Tag
      ref={element}
      data-revealed="false"
      style={{ "--stt-stagger": `${stagger}ms` } as CSSProperties}
      className={cn("stt-seq", className)}
    >
      {children}
    </Tag>
  );
}
