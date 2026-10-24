"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motionAllowed, subscribeMotion } from "@/lib/motion";

/**
 * Pointer tilt, capped at three degrees.
 *
 * ThreeUI rotates its cards against the pointer, and a trace of that adds
 * physicality to a photo grid. The cap is deliberately tiny: anything past ~4°
 * turns a travel card into a toy and starts fighting the hover lift the cards
 * already have.
 *
 * Only fine pointers get the effect (`(hover: hover) and (pointer: fine)`), so
 * a touch device never pays for it. The transform is written as two custom
 * properties in a rAF callback — no React state per pointer event, and no
 * permanent `will-change`.
 */
export function TiltCard({
  children,
  className,
  max = 3,
}: {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees on each axis. */
  max?: number;
}) {
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (!motionAllowed()) return;

    let frame = 0;
    let rect: DOMRect | null = null;
    let targetX = 0;
    let targetY = 0;

    const apply = () => {
      frame = 0;
      node.style.setProperty("--stt-tilt-x", `${targetX.toFixed(2)}deg`);
      node.style.setProperty("--stt-tilt-y", `${targetY.toFixed(2)}deg`);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const onEnter = () => {
      rect = node.getBoundingClientRect();
      node.dataset.tilting = "true";
    };

    const onMove = (event: PointerEvent) => {
      if (!rect) rect = node.getBoundingClientRect();
      if (!motionAllowed()) {
        reset();
        return;
      }
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      // Invert Y: pushing the pointer up should tip the card away from you.
      targetX = Number((-py * max * 2).toFixed(2));
      targetY = Number((px * max * 2).toFixed(2));
      schedule();
    };

    const reset = () => {
      targetX = 0;
      targetY = 0;
      rect = null;
      delete node.dataset.tilting;
      schedule();
    };

    node.addEventListener("pointerenter", onEnter, { passive: true });
    node.addEventListener("pointermove", onMove, { passive: true });
    node.addEventListener("pointerleave", reset, { passive: true });
    node.addEventListener("pointercancel", reset, { passive: true });
    const unsubscribe = subscribeMotion(() => {
      if (!motionAllowed()) reset();
    });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      node.removeEventListener("pointerenter", onEnter);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", reset);
      node.removeEventListener("pointercancel", reset);
      unsubscribe();
    };
  }, [max]);

  return (
    <div ref={element} className={cn("stt-tilt", className)}>
      {children}
    </div>
  );
}
