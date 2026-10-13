import { ROUTES } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { PhoneIcon, ClockIcon, ShieldIcon, SparkleIcon } from "@/components/ui/icons";
import { LeadForm } from "./lead-form";

const ASSURANCES = [
  {
    icon: ClockIcon,
    title: "Phản hồi trong giờ làm việc",
    body: "Yêu cầu được chuyển thẳng cho bộ phận tư vấn, không qua trung gian.",
  },
  {
    icon: SparkleIcon,
    title: "Lịch trình chỉnh theo nhu cầu",
    body: "Bạn cho biết thời gian và ngân sách, SEA TRIP gợi ý phương án phù hợp.",
  },
  {
    icon: ShieldIcon,
    title: "Không đặt cọc trực tuyến",
    body: "Website chỉ tiếp nhận yêu cầu tư vấn. Mọi thoả thuận diễn ra trực tiếp.",
  },
];

/**
 * The consultation section, shared by the home page, category pages, the tour
 * detail page and the contact page. `tourSlug`/`defaultInterest` pre-fill it so
 * a request started from a tour page arrives with that context attached.
 */
export function ConsultSection({
  id = "tu-van",
  tourSlug,
  defaultInterest,
  tone = "muted",
  spacing = "default",
  title = "Nhận tư vấn lịch trình phù hợp với bạn",
  description = "Điền vài thông tin cơ bản, SEA TRIP sẽ liên hệ để gợi ý điểm đến, thời điểm và phương án phù hợp nhất.",
}: {
  id?: string;
  tourSlug?: string;
  defaultInterest?: string;
  tone?: "default" | "muted" | "sunken";
  spacing?: "tight" | "default" | "loose";
  title?: string;
  description?: string;
}) {
  return (
    <Section id={id} tone={tone} spacing={spacing}>
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <SectionHeading eyebrow="Liên hệ tư vấn" title={title} description={description} />

            <ul className="mt-8 flex flex-col gap-5">
              {ASSURANCES.map((item) => (
                <li key={item.title} className="flex gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                    <item.icon className="h-5 w-5 text-primary-strong" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-foreground-muted">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">
                Muốn trao đổi trực tiếp?
              </p>
              <a
                href={siteConfig.contact.hotlineHref}
                className="mt-2 inline-flex items-center gap-2 text-xl font-extrabold text-primary-strong transition-colors hover:text-primary-strong-hover"
              >
                <PhoneIcon className="h-5 w-5" />
                {siteConfig.contact.hotline}
              </a>
              <p className="mt-1 text-sm text-foreground-muted">
                {siteConfig.contact.workingHours}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
              <LeadForm
                tourSlug={tourSlug}
                defaultInterest={defaultInterest}
                compact={Boolean(tourSlug)}
              />
            </div>
            <p className="mt-4 text-center text-xs text-foreground-subtle">
              Thông tin của bạn được xử lý theo{" "}
              <a
                href={ROUTES.privacy}
                className="font-semibold text-primary-strong underline underline-offset-2"
              >
                chính sách bảo mật
              </a>
              .
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
