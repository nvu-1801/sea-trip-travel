import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * Editorial section kicker.
 *
 * The old treatment was a rounded pill with a pulsing dot and a middle dot in
 * the copy. This version is quieter: an antique-gold hairline, an optional
 * serif-italic chapter number, then a letterspaced label. It reads as a
 * magazine marker instead of a tag, and removes every decorative dot.
 *
 * Accepts the existing CMS strings, e.g. `01 / CÓ HẸN VỚI BIỂN` or
 * `LÊN KẾ HOẠCH`, and normalises `·` separators into the same gold rule.
 */
export function SectionEyebrow({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const value = children.trim();
  const numbered = value.match(/^\s*(\d{1,2})\s*[/·•—–-]\s*(.+)$/);

  if (numbered) {
    return (
      <p className={cn("section-eyebrow", className)}>
        <span className="section-eyebrow-number">{numbered[1]}</span>
        <span className="section-eyebrow-rule" aria-hidden="true" />
        <span className="section-eyebrow-text">{numbered[2]}</span>
      </p>
    );
  }

  const parts = value.split(/\s*[·•]\s*/).filter(Boolean);
  return (
    <p className={cn("section-eyebrow", className)}>
      <span className="section-eyebrow-rule" aria-hidden="true" />
      {parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          {index > 0 ? (
            <span className="section-eyebrow-rule" aria-hidden="true" />
          ) : null}
          <span className="section-eyebrow-text">{part}</span>
        </Fragment>
      ))}
    </p>
  );
}
