import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { session } from "@/server/cms/auth";
import { list } from "@/server/cms/store";
import { tourRecordSchema } from "@/domain/tour-cms";
import { resolveTour } from "@/lib/data/localize";
import { TourDetailContent } from "@/features/tours/tour-detail-view";
import { resolveLocaleFromParams } from "@/i18n/params";

/**
 * Draft preview for a tour.
 *
 * Lives under the localized tree (not /admin) on purpose: the tour page's
 * styles, header, footer and fonts are owned by `[locale]/layout`, so this is
 * the only way to preview the *real* page instead of a text dump.
 *
 * Access rules:
 *  - a valid Studio session is required (otherwise → /admin);
 *  - the response is never indexed and always rendered dynamically;
 *  - the consult form is replaced with a notice so a preview cannot create
 *    real leads;
 *  - analytics ignore `/xem-truoc`.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Xem trước tour | SEA TRIP Studio",
  description: "Bản xem trước nội bộ của SEA TRIP Studio.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function TourPreviewPage({
  params,
}: PageProps<"/[locale]/xem-truoc/tour/[id]">) {
  if (!(await session())) redirect("/admin");

  const { id } = await params;
  const row = list("tours").find((item) => item.id === id);
  if (!row || row.state === "deleted") notFound();

  const parsed = tourRecordSchema.safeParse(row.data);
  if (!parsed.success) notFound();

  const locale = await resolveLocaleFromParams(params);
  const tour = resolveTour(parsed.data, locale);
  const stateLabel =
    row.state === "published" ? "Đang xuất bản" : "Bản nháp chưa xuất bản";

  return (
    <>
      <div className="border-b border-border bg-primary-soft">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-primary-strong px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              {stateLabel}
            </span>
            <span className="text-foreground-muted">
              Xem trước nội dung đã lưu trong Studio · phiên bản{" "}
              {row.revision}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/admin" className="text-primary-strong hover:underline">
              ← Về Studio
            </Link>
            <span className="hidden text-foreground-muted sm:inline">
              Lưu thay đổi rồi tải lại trang này để xem bản mới
            </span>
          </div>
        </div>
      </div>
      <TourDetailContent tour={tour} locale={locale} preview />
    </>
  );
}
