"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ElementType,
} from "react";
import { cn } from "@/lib/utils";
import { motionAllowed, subscribeMotion } from "@/lib/motion";

/**
 * Editorial heading whose words rise out of a mask.
 *
 * Technique borrowed from ThreeUI's landing pages (`splitHeadingWords` in their
 * Kage build): the phrase is split into per-word spans, each inside an
 * `overflow: hidden` clip, and the inner span travels up. It reads better than a
 * block fade because the eye follows the sentence instead of the box.
 *
 * Two details matter for this site:
 *
 *  - The accessible text is preserved. The visible words are marked
 *    `aria-hidden` and the heading carries the full phrase as `aria-label`, so
 *    screen readers never hear a stutter of fragments.
 *  - Nothing is hidden in the markup. The `data-words` state is written
 *    imperatively in a layout effect — before the first paint, so there is no
 *    flash — and only when motion is allowed and IntersectionObserver exists.
 *    A no-JS render, a reduced-motion visitor and the print stylesheet all get
 *    plain, fully painted text.
 */

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export type MaskedLine = { text: string; emphasis?: boolean };

export function MaskedHeading({
  lines,
  as: Tag = "h2",
  className,
  stagger = 72,
  lineStagger = 0,
}: {
  lines: MaskedLine[];
  as?: ElementType;
  className?: string;
  /** Delay between words, in milliseconds. Phones drop to 0 in CSS. */
  stagger?: number;
  /** Extra delay applied to every word of the next line, in milliseconds. */
  lineStagger?: number;
}) {
  const element = useRef<HTMLElement>(null);
  const label = lines
    .map((line) => line.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  useIsomorphicLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    if (!motionAllowed()) return;
    if (typeof IntersectionObserver === "undefined") return;

    node.dataset.words = "armed";
    let settled = false;
    const reveal = () => {
      if (settled) return;
      settled = true;
      node.dataset.words = "in";
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);

    // If the observer never reports (layout swap, a print capture, a tab that
    // was restored mid-frame), the heading must not stay parked off-screen.
    const failsafe = window.setTimeout(reveal, 2500);
    const unsubscribe = subscribeMotion(() => {
      if (!motionAllowed()) reveal();
    });

    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
      unsubscribe();
      delete node.dataset.words;
    };
  }, []);

  return (
    <Tag className={cn("stt-words", className)} aria-label={label} ref={element}>
      {lines.map((line, lineIndex) => {
        const words = line.text.split(/\s+/).filter(Boolean);
        return (
          <span className="stt-words-line" aria-hidden="true" key={lineIndex}>
            {words.map((word, wordIndex) => (
              <Fragment key={`${word}-${wordIndex}`}>
                {wordIndex > 0 ? " " : null}
                <span
                  className="stt-words-word"
                  style={
                    {
                      "--stt-word-delay": `${lineIndex * lineStagger + wordIndex * stagger}ms`,
                    } as CSSProperties
                  }
                >
                  <span className="stt-words-inner">
                    {line.emphasis ? <em>{word}</em> : word}
                  </span>
                </span>
              </Fragment>
            ))}
          </span>
        );
      })}
    </Tag>
  );
}
