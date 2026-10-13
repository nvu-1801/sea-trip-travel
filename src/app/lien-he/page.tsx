import type { Metadata } from "next";
import { ROUTES } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon, SendIcon } from "@/components/ui/icons";
import { LeadForm } from "@/features/leads/lead-form";

export const metadata: Metadata = buildMetadata({
  title: "Liên hệ & nhận tư vấn",
  description:
    "Gửi yêu cầu tư vấn tour Quy Nhơn – Phú Yên và các tuyến trong nước. SEA TRIP TRAVEL liên hệ lại trong giờ làm việc.",
  path: ROUTES.contact,
});

type ContactChannel = {
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  label: string;
  value: string;
  /** `null` when the channel is not a link (e.g. a physical address). */
  href: string | null;
  note: string;
};

const CHANNELS: readonly ContactChannel[] = [
  {
    icon: PhoneIcon,
    label: "Hotline",
    value: siteConfig.contact.hotline,
    href: siteConfig.contact.hotlineHref,
    note: siteConfig.contact.workingHours,
  },
  {
    icon: MailIcon,
    label: "Email",
    value: siteConfig.contact.email,
    href: `mailto:${siteConfig.contact.email}`,
    note: "Dùng cho yêu cầu cần kèm tài liệu",
  },
  {
    icon: MapPinIcon,
    label: "Địa chỉ",
    value: siteConfig.contact.address,
    href: null,
    note: "Vui lòng hẹn trước khi tới văn phòng",
  },
];

const NEXT_STEPS = [
  {
    title: "1. SEA TRIP tiếp nhận yêu cầu",
    body: "Yêu cầu được chuyển tới bộ phận tư vấn kèm tour bạn đang xem và trang bạn gửi từ.",
  },
  {
    title: "2. Tư vấn viên liên hệ lại",
    body: "Trong giờ làm việc, tư vấn viên gọi hoặc trả lời email để làm rõ nhu cầu của bạn.",
  },
  {
    title: "3. Nhận phương án và báo giá",
    body: "Bạn nhận lịch trình chi tiết, giá theo số khách và điều kiện áp dụng để quyết định.",
  },
] as const;

export default function ContactPage() {
  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: "Trang chủ", path: "/" },
          { label: "Liên hệ", path: ROUTES.contact },
        ])}
      />

      <Breadcrumbs
        items={[{ label: "Trang chủ", href: "/" }, { label: "Liên hệ" }]}
      />

      <section className="relative overflow-hidden border-b border-border bg-surface-muted">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-brand-100/70 blur-3xl"
        />
        <Container>
          <div className="relative flex flex-col gap-4 py-12 sm:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-strong">
              Liên hệ
            </p>
            <h1 className="max-w-3xl text-display-sm font-extrabold text-foreground sm:text-display">
              Nói cho SEA TRIP biết bạn muốn đi đâu
            </h1>
            <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-foreground-muted">
              Điền form hoặc gọi trực tiếp. Càng rõ thời gian và số người, tư vấn càng nhanh và sát
              nhu cầu.
            </p>
          </div>
        </Container>
      </section>

      <Section tone="default" spacing="default">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            {/* --- Channels + steps ---------------------------------------- */}
            <div className="flex flex-col gap-8 lg:col-span-5">
              <ul className="flex flex-col gap-4">
                {CHANNELS.map((channel) => (
                  <li
                    key={channel.label}
                    className="flex gap-4 rounded-2xl border border-border bg-surface p-5 shadow-soft"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                      <channel.icon className="h-5 w-5 text-primary-strong" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">
                        {channel.label}
                      </p>
                      {channel.href ? (
                        <a
                          href={channel.href}
                          className="break-words text-base font-bold text-foreground transition-colors hover:text-primary-strong"
                        >
                          {channel.value}
                        </a>
                      ) : (
                        <p className="text-base font-bold text-foreground">{channel.value}</p>
                      )}
                      <p className="mt-1 text-sm text-foreground-muted">{channel.note}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-border bg-surface-muted p-5">
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <SendIcon className="h-5 w-5 text-primary-strong" />
                  Sau khi bạn gửi yêu cầu
                </h2>
                <ol className="mt-4 flex flex-col gap-4">
                  {NEXT_STEPS.map((step) => (
                    <li key={step.title}>
                      <p className="text-sm font-semibold text-foreground">{step.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground-muted">
                        {step.body}
                      </p>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs text-foreground-subtle">
                  <ClockIcon className="mt-px h-4 w-4 shrink-0" />
                  Ngoài giờ làm việc, yêu cầu vẫn được ghi nhận và xử lý vào buổi làm việc kế tiếp.
                </p>
              </div>
            </div>

            {/* --- Form ---------------------------------------------------- */}
            <div className="lg:col-span-7">
              <Reveal>
                <div className="rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
                  <SectionHeading
                    eyebrow="Form tư vấn"
                    title="Gửi yêu cầu"
                    description="Chỉ cần họ tên, số điện thoại và xác nhận. Các trường còn lại giúp tư vấn chính xác hơn."
                    as="h2"
                  />
                  <div className="mt-7">
                    <LeadForm />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
