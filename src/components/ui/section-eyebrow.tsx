import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * Editorial section kicker.
 *
 * A quiet magazine marker: an optional serif-italic chapter number followed by
 * a letterspaced label. No horizontal rules, dots or pills — the type itself
 * carries the hierarchy.
 *
 * Accepts the existing CMS strings, e.g. `01 / CÓ HẸN VỚI BIỂN` or
 * `LÊN KẾ HOẠCH`, and splits `·` separators into simple spaced labels.
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
        <span className="section-eyebrow-text">{numbered[2]}</span>
      </p>
    );
  }

  const parts = value.split(/\s*[·•]\s*/).filter(Boolean);
  return (
    <p className={cn("section-eyebrow", className)}>
      {parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          <span className="section-eyebrow-text">{part}</span>
        </Fragment>
      ))}
    </p>
  );
}
