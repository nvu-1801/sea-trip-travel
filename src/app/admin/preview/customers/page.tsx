import "@/features/home/customers.css";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { defaultLanding, landingSchema } from "@/domain/landing";
import { CustomerStoriesSection } from "@/features/home/customer-stories";
import type { Locale } from "@/i18n/config";
import { session } from "@/server/cms/auth";
import { list } from "@/server/cms/store";

export const metadata: Metadata = {
  title: "Xem trước Khách hàng & dấu ấn hành trình · SEA TRIP Studio",
  robots: { index: false, follow: false },
};

function customersSection(saved: Record<string, unknown>) {
  const merged = { ...defaultLanding, ...saved };
  const parsed = landingSchema.safeParse(merged);
  if (parsed.success) return parsed.data.customers;
  const raw =
    saved.customers && typeof saved.customers === "object"
      ? (saved.customers as Record<string, unknown>)
      : {};
  return { ...defaultLanding.customers, ...raw };
}

/**
 * Full-width preview of the exact customers block that the landing page
 * renders. It reads the saved draft (never the published copy), so the owner
 * can check spacing, logo balance, covers and reduced-motion behaviour before
 * publishing. Admin session is required and the page is always noindex.
 */
export default async function CustomersPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await session())) redirect("/admin/login");
  const query = await searchParams;
  const rawLocale = Array.isArray(query.lang) ? query.lang[0] : query.lang;
  const locale: Locale = rawLocale === "en" ? "en" : "vi";
  const row = list("landing")[0];
  const section = customersSection(row?.data ?? {});
  const logos = section.logos.filter(
    (logo) => logo.visible && Boolean(logo.image?.src),
  );
  const videos = section.videos.filter(
    (video) => video.visible && Boolean(video.youtubeUrl),
  );
  const empty = logos.length === 0 && videos.length === 0;

  return (
    <main className="adm-customer-preview-page">
      <header className="adm-customer-preview-bar">
        <div>
          <Link href="/admin/customers">← Về editor khách hàng</Link>
          <p>
            Bản xem trước đọc{" "}
            <strong>
              {row?.state === "published"
                ? "bản đã xuất bản"
                : "bản nháp đã lưu"}
            </strong>{" "}
            của khối “Khách hàng &amp; dấu ấn hành trình”. Chưa lưu thay đổi
            trên form thì bản này chưa đổi.
          </p>
        </div>
        <div className="adm-customer-preview-langs" role="group" aria-label="Ngôn ngữ xem trước">
          <Link
            href="/admin/preview/customers?lang=vi"
            aria-current={locale === "vi" ? "page" : undefined}
          >
            Tiếng Việt
          </Link>
          <Link
            href="/admin/preview/customers?lang=en"
            aria-current={locale === "en" ? "page" : undefined}
          >
            English
          </Link>
        </div>
      </header>

      {section.enabled ? null : (
        <p className="adm-customer-preview-flag" role="status">
          Section đang tắt trong Studio — nội dung bên dưới chỉ hiện ở bản xem
          trước này, không hiện trên trang chủ.
        </p>
      )}
      {empty ? (
        <p className="adm-customer-preview-flag" role="status">
          Chưa có logo/video đang hiện. Bật nhóm hoặc thêm mục trong editor rồi
          lưu bản nháp.
        </p>
      ) : null}

      <div className="adm-customer-preview-stage">
        <CustomerStoriesSection section={section} locale={locale} />
      </div>
    </main>
  );
}
