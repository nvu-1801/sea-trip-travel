import Link from "next/link";
import { InfoIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";

/**
 * Shown above a page whose English translation is not complete.
 *
 * The policy is explicit: an English URL never silently renders a full
 * Vietnamese page. When content is missing, the page says so and links back to
 * the matching Vietnamese page (or the public homepage when there is none).
 */
export function TranslationNotice({
  locale,
  viHref,
}: {
  locale: Locale;
  /** Vietnamese equivalent of this page; defaults to the public homepage. */
  viHref?: string;
}) {
  if (locale === "vi") return null;
  const m = getMessages(locale);
  const href = viHref || "https://seatriptravel.vn/";
  const external = /^https?:\/\//i.test(href);
  const linkClassName =
    "font-semibold text-primary-strong underline underline-offset-2";

  return (
    <div className="border-b border-amber-200 bg-warning-soft">
      <div className="mx-auto flex max-w-[88rem] items-start gap-3 px-5 py-3.5 text-sm leading-relaxed text-foreground sm:px-7 lg:px-10">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p>
          <strong className="font-bold">{m.draftBanner.label}.</strong>{" "}
          {m.draftBanner.message}{" "}
          {external ? (
            <a href={href} className={linkClassName}>
              {m.draftBanner.switchVi}
            </a>
          ) : (
            <Link href={href} prefetch={false} className={linkClassName}>
              {m.draftBanner.switchVi}
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
