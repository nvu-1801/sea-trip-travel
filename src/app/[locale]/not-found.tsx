import Link from "next/link";
import { Container, Section } from "@/components/ui/layout";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon, CompassIcon } from "@/components/ui/icons";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ROUTES } from "@/config/navigation";
import { localizePath } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";

/**
 * 404.
 *
 * A dead end is a lost lead, so this offers the three most likely intended
 * destinations instead of an apology.
 *
 * HOW THE LANGUAGE IS RESOLVED, AND WHY
 * -------------------------------------
 * A `not-found` boundary cannot use `next/root-params` (it renders outside the
 * normal page slot; the getter throws, and Next then silently falls back to the
 * framework's default English 404). It also must not use a dynamic API such as
 * `headers()`/`cookies()`, and must not be a Client Component: both push the
 * boundary into streaming, which downgrades the response to a *soft* 404
 * (HTTP 200 + noindex) instead of a hard 404.
 *
 * So this stays a plain, synchronous Server Component that renders BOTH
 * languages and lets CSS reveal the one that matches `<html lang>`. No dynamic
 * API, no root-params, hard 404 preserved, and English is still correct.
 */
const COPY = {
  vi: {
    breadcrumbAria: "Đường dẫn",
    home: "Trang chủ",
    eyebrow: "Lỗi 404",
    title: "Không tìm thấy trang này",
    description:
      "Đường dẫn có thể đã thay đổi hoặc không còn tồn tại. Bạn thử một trong các mục dưới đây, hoặc gửi yêu cầu để SEA TRIP tìm giúp.",
    ctaHome: "Về trang chủ",
    ctaConsult: "Gửi yêu cầu tư vấn",
    viewNow: "Xem ngay",
    suggestions: [
      {
        href: ROUTES.quyNhonPhuYen,
        title: "Tour Quy Nhơn – Phú Yên",
        body: "Tuyến trọng tâm: tour trong ngày và hành trình 2–5 ngày.",
      },
      {
        href: ROUTES.domestic,
        title: "Tour trong nước",
        body: "Miền Bắc, Miền Trung, Miền Nam và Tây Nguyên.",
      },
      {
        href: ROUTES.guides,
        title: "Cẩm nang du lịch",
        body: "Kinh nghiệm chọn thời điểm, di chuyển và điểm đến.",
      },
    ],
  },
  en: {
    breadcrumbAria: "Breadcrumb",
    home: "Home",
    eyebrow: "Error 404",
    title: "We could not find this page",
    description:
      "The link may have changed or no longer exists. Try one of the items below, or send a request and SEA TRIP will help you find it.",
    ctaHome: "Back to home",
    ctaConsult: "Send a request",
    viewNow: "View now",
    suggestions: [
      {
        href: ROUTES.quyNhonPhuYen,
        title: "Quy Nhon – Phu Yen tours",
        body: "Our focus route: day tours and 2–5 day journeys.",
      },
      {
        href: ROUTES.domestic,
        title: "Vietnam tours",
        body: "North, Central, South and the Central Highlands.",
      },
      {
        href: ROUTES.guides,
        title: "Travel guides",
        body: "Advice on timing, transport and destinations.",
      },
    ],
  },
} as const;

function NotFoundBody({ locale }: { locale: Locale }) {
  const t = COPY[locale];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: t.home, href: localizePath(locale, "/") },
          { label: t.title },
        ]}
        ariaLabel={t.breadcrumbAria}
      />

      <Section tone="default" spacing="loose">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
              <CompassIcon className="h-8 w-8 text-primary-strong" />
            </span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">
              {t.eyebrow}
            </p>
            <h1 className="mt-3 text-display font-display font-semibold text-foreground">
              {t.title}
            </h1>
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-foreground-muted">
              {t.description}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href={localizePath(locale, "/")} size="lg">
                {t.ctaHome}
              </ButtonLink>
              <ButtonLink
                href={localizePath(locale, ROUTES.contact)}
                variant="secondary"
                size="lg"
              >
                {t.ctaConsult}
              </ButtonLink>
            </div>
          </div>

          <ul className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
            {t.suggestions.map((item) => (
              <li key={item.href}>
                <Link
                  href={localizePath(locale, item.href)}
                  className="group flex h-full flex-col gap-2 rounded-2xl border border-border bg-surface p-5 shadow-soft transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
                >
                  <span className="font-bold text-foreground transition-colors group-hover:text-primary-strong">
                    {item.title}
                  </span>
                  <span className="text-sm leading-relaxed text-foreground-muted">{item.body}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-primary-strong">
                    {t.viewNow}
                    <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}

export default function NotFound() {
  return (
    <>
      <div className="nf-lang-vi">
        <NotFoundBody locale="vi" />
      </div>
      <div className="nf-lang-en">
        <NotFoundBody locale="en" />
      </div>
    </>
  );
}
