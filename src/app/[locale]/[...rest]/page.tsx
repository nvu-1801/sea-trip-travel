import { notFound } from "next/navigation";

/**
 * Catch-all for unmatched paths inside the `[locale]` tree.
 *
 * Without it, a URL that matches no route (e.g. `/khong-ton-tai`) never enters
 * the `[locale]` segment, so Next serves the framework's default (English) 404
 * and the localized `not-found.tsx` is bypassed. Matching here and calling
 * `notFound()` sends the request through the localized boundary instead.
 *
 * Real routes always win: a catch-all is the lowest-priority match, so this only
 * fires for genuinely unknown paths.
 */
export default function LocaleCatchAll() {
  notFound();
}
