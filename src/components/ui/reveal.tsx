"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One-time viewport entrance. Content stays visible without JavaScript; respects motion preferences. */
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
  const element = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = element.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    const stop = () => {
      if (media.matches || document.documentElement.dataset.motionPaused === "true")
        animation?.cancel();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (media.matches || document.documentElement.dataset.motionPaused === "true") return;
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const transform = mobile ? "translateY(14px)" : {
        rise: "translateY(24px)",
        left: "translateX(-24px)",
        right: "translateX(24px)",
        zoom: "translateY(16px) scale(0.97)",
      }[variant];
      animation = node.animate(
        [{ opacity: 0.25, transform }, { opacity: 1, transform: "none" }],
        { duration: 650, delay: delay * 80, easing: "cubic-bezier(0.16,1,0.3,1)", fill: "backwards" },
      );
    }, { threshold: 0, rootMargin: "0px 0px -48px 0px" });
    observer.observe(node);
    const preferences = new MutationObserver(stop);
    preferences.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion-paused"] });
    media.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      preferences.disconnect();
      media.removeEventListener("change", stop);
      animation?.cancel();
    };
  }, [variant, delay]);
  return (
    <Tag
      ref={element}
      data-reveal-once={variant}
      data-reveal-delay={delay > 0 ? String(delay) : undefined}
      className={cn(className)}
    >
      {children}
    </Tag>
  );
}

