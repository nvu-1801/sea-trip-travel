import Link from "next/link";
import { InfoIcon } from "@/components/ui/icons";
import { localizePath } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";

/**
 * Shown above a page whose translation is not yet reviewed.
 *
 * The policy is explicit: an English URL never silently renders a full
 * Vietnamese page. When a review is still pending, the page says so, links to
 * the Vietnamese original, and stays out of the index (the page also sets
 * `noIndex`).
 */
export function TranslationNotice({ locale }: { locale: Locale }) {
  if (locale === "vi") return null;
  const m = getMessages(locale);

  return (
    <div className="border-b border-amber-200 bg-warning-soft">
      <div className="mx-auto flex max-w-[88rem] items-start gap-3 px-5 py-3.5 text-sm leading-relaxed text-foreground sm:px-7 lg:px-10">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p>
          <strong className="font-bold">{m.draftBanner.label}.</strong>{" "}
          {m.draftBanner.message}{" "}
          <Link
            href={localizePath("vi", "/")}
            prefetch={false}
            className="font-semibold text-primary-strong underline underline-offset-2"
          >
            {m.draftBanner.switchVi}
          </Link>
        </p>
      </div>
    </div>
  );
}
