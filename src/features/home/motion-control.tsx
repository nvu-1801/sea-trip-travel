"use client";
import { useState } from "react";
export function MotionControl({
  english = false,
  enabled = true,
}: {
  english?: boolean;
  enabled?: boolean;
}) {
  const [paused, setPaused] = useState(!enabled);
  return (
    <button
      className="stt-motion-control"
      aria-pressed={paused}
      onClick={() => {
        const next = !paused;
        setPaused(next);
        document.documentElement.dataset.motionPaused = String(next);
      }}
    >
      {paused ? "▶" : "Ⅱ"}{" "}
      {english
        ? paused
          ? "Resume motion"
          : "Pause motion"
        : paused
          ? "Bật chuyển động"
          : "Tạm dừng chuyển động"}
    </button>
  );
}
