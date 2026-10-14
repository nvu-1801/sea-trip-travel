"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { localeLabels, localeShortLabels, locales, type Locale } from "@/i18n/config";
import { switchLocalePath } from "@/i18n/routing";
import { isFormDirty } from "@/features/leads/draft-guard";
import { cn } from "@/lib/utils";

/**
 * VI / EN switch.
 *
 * A compact two-segment control (labels, never flags) that links to the *same
 * page* in the other language. The query string and hash are attached after
 * mount from `window.location`, so filter state survives the switch without
 * pulling `useSearchParams` (which would force a Suspense boundary around the
 * whole header). Anchor ids are identical in both languages, so a hash that
 * exists on the current page exists on the target too.
 */
export function LocaleSwitcher({
  locale,
  label,
  switchToLabel,
  currentLabel,
  leaveWarning = "",
  className,
}: {
  locale: Locale;
  label: string;
  /** Template with a `{language}` placeholder. */
  switchToLabel: string;
  /** Template with a `{language}` placeholder. */
  currentLabel: string;
  /** Prompt shown when the consultation form has an unsaved draft. */
  leaveWarning?: string;
  className?: string;
}) {
  const pathname = usePathname() ?? "/";
  const [suffix, setSuffix] = useState("");

  useEffect(() => {
    const update = () => setSuffix(`${window.location.search}${window.location.hash}`);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [pathname]);

  const nameOf = (target: Locale) => localeLabels[target];

  return (
    <nav aria-label={label} className={cn("shrink-0", className)}>
      <ul className="flex items-center gap-0.5 rounded-full border border-border-strong bg-surface p-0.5">
        {locales.map((target) => {
          const isCurrent = target === locale;
          const name = nameOf(target);
          return (
            <li key={target}>
              <Link
                href={switchLocalePath(target, pathname, suffix)}
                prefetch={false}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={isCurrent ? currentLabel.replace("{language}", name) : switchToLabel.replace("{language}", name)}
                data-focus-ring=""
                onClick={(event) => {
                  if (isCurrent) return;
                  if (isFormDirty() && !window.confirm(leaveWarning)) event.preventDefault();
                }}
                className={cn(
                  "inline-flex h-8 min-w-9 items-center justify-center rounded-full px-2 text-xs font-bold uppercase tracking-wide transition-colors",
                  isCurrent
                    ? "bg-primary-strong text-white"
                    : "text-foreground-muted hover:bg-primary-soft hover:text-primary-strong",
                )}
              >
                {localeShortLabels[target]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
