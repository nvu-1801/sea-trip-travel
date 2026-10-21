import { ROUTES } from "@/config/navigation";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/runtime-site";
import { Container, Section } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import {
  PhoneIcon,
  ClockIcon,
  ShieldIcon,
  SparkleIcon,
} from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import { LeadForm } from "./lead-form";
import { leadFormLabels } from "./lead-form-labels";

/**
 * The consultation section, shared by the home page, category pages, the tour
 * detail page and the contact page. `tourSlug`/`defaultInterest` pre-fill it so
 * a request started from a tour page arrives with that context attached.
 */
export function ConsultSection({
  locale,
  id = "tu-van",
  tourSlug,
  defaultInterest,
  tone = "muted",
  spacing = "default",
  title,
  description,
}: {
  locale: Locale;
  id?: string;
  tourSlug?: string;
  defaultInterest?: string;
  tone?: "default" | "muted" | "sunken";
  spacing?: "tight" | "default" | "loose";
  title?: ReactNode;
  description?: string;
}) {
  const m = getMessages(locale);
  const en = locale === "en";
  const assurances = [
    { icon: ClockIcon, ...m.consult.assurances[0] },
    { icon: SparkleIcon, ...m.consult.assurances[1] },
    { icon: ShieldIcon, ...m.consult.assurances[2] },
  ];
  const steps = en
    ? {
        label: "Simple 3-step process",
        items: [
          {
            title: "Send a request",
            body: "Fill in the short form — no deposit needed.",
          },
          {
            title: "Get advice",
            body: "An advisor contacts you within working hours.",
          },
          {
            title: "Confirm the plan",
            body: "Price and services clear before you decide.",
          },
        ],
      }
    : {
        label: "Quy trình 3 bước",
        items: [
          {
            title: "Gửi yêu cầu",
            body: "Điền form ngắn bên cạnh, không cần đặt cọc.",
          },
          {
            title: "Nhận tư vấn",
            body: "Tư vấn viên liên hệ lại trong giờ làm việc.",
          },
          {
            title: "Chốt lịch trình",
            body: "Rõ giá và dịch vụ rồi mới quyết định.",
          },
        ],
      };

  return (
    <Section id={id} tone={tone} spacing={spacing}>
      <Container>
        <Reveal className="intro-centered">
          <p className="eyebrow-pill">
            <span aria-hidden="true" />
            {m.consult.eyebrow}
          </p>
          <h2>{title ?? m.consult.defaultTitle}</h2>
          <p>{description ?? m.consult.defaultDescription}</p>
        </Reveal>
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
          <Reveal className="h-full lg:col-span-5" variant="left">
            <div className="flex h-full flex-col rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
              <ul className="flex flex-col divide-y divide-border">
                {assurances.map((item) => (
                  <li
                    key={item.title}
                    className="flex gap-3.5 py-4 first:pt-0 last:pb-0"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                      <item.icon className="h-5 w-5 text-primary-strong" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-foreground-muted">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-border pt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">
                  {steps.label}
                </p>
                <ol className="mt-3 flex flex-col">
                  {steps.items.map((step, i) => (
                    <li key={step.title} className="flex gap-3.5 py-3">
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-strong text-sm font-extrabold text-white"
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-sm leading-relaxed text-foreground-muted">
                          {step.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-auto pt-6">
                <div className="rounded-2xl bg-surface-muted p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">
                    {m.consult.directLabel}
                  </p>
                  <a
                    href={siteConfig.contact.hotlineHref}
                    className="mt-2 inline-flex min-h-11 items-center gap-2 text-xl font-extrabold text-primary-strong transition-colors hover:text-primary-strong-hover"
                  >
                    <PhoneIcon className="stt-phone-buzz h-5 w-5" />
                    {siteConfig.contact.hotline}
                  </a>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {m.site.workingHours}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal
            className="flex h-full flex-col lg:col-span-7"
            variant="right"
            delay={1}
          >
            <div className="flex flex-1 flex-col rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
              <LeadForm
                locale={locale}
                labels={leadFormLabels(locale)}
                tourSlug={tourSlug}
                defaultInterest={defaultInterest}
                compact={Boolean(tourSlug)}
              />
              <p className="mt-6 border-t border-border pt-4 text-center text-xs text-foreground-subtle">
                {m.consult.privacyPre}{" "}
                <a
                  href={localizePath(locale, ROUTES.privacy)}
                  className="font-semibold text-primary-strong underline underline-offset-2"
                >
                  {m.consult.privacyLink}
                </a>
                {m.consult.privacyPost}
              </p>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
