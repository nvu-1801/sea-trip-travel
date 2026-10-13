import Link from "next/link";
import type { Metadata } from "next";
import { ROUTES } from "@/config/navigation";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/ui/layout";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon, CompassIcon } from "@/components/ui/icons";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

/**
 * 404.
 *
 * A dead end is a lost lead, so this offers the three most likely intended
 * destinations instead of an apology.
 */
export const metadata: Metadata = buildMetadata({
  title: "Không tìm thấy trang",
  description: "Trang bạn tìm không tồn tại hoặc đã được thay đổi.",
  path: "/404",
  noIndex: true,
});

const SUGGESTIONS = [
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
];

export default function NotFound() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Không tìm thấy trang" }]} />

      <Section tone="default" spacing="loose">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
              <CompassIcon className="h-8 w-8 text-primary-strong" />
            </span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">
              Lỗi 404
            </p>
            <h1 className="mt-3 text-display-sm font-extrabold text-foreground sm:text-display">
              Không tìm thấy trang này
            </h1>
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-foreground-muted">
              Đường dẫn có thể đã thay đổi hoặc không còn tồn tại. Bạn thử một trong các mục dưới
              đây, hoặc gửi yêu cầu để SEA TRIP tìm giúp.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/" size="lg">
                Về trang chủ
              </ButtonLink>
              <ButtonLink href={ROUTES.contact} variant="secondary" size="lg">
                Gửi yêu cầu tư vấn
              </ButtonLink>
            </div>
          </div>

          <ul className="mx-auto mt-14 grid max-w-4xl gap-5 sm:grid-cols-3">
            {SUGGESTIONS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex h-full flex-col gap-2 rounded-2xl border border-border bg-surface p-5 shadow-soft transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
                >
                  <span className="font-bold text-foreground transition-colors group-hover:text-primary-strong">
                    {item.title}
                  </span>
                  <span className="text-sm leading-relaxed text-foreground-muted">{item.body}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-primary-strong">
                    Xem ngay
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
