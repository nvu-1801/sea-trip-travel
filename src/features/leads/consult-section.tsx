import { ROUTES } from "@/config/navigation";
import { siteConfig } from "@/config/runtime-site";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
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
  title?: string;
  description?: string;
}) {
  const m = getMessages(locale);
  const assurances = [
    { icon: ClockIcon, ...m.consult.assurances[0] },
    { icon: SparkleIcon, ...m.consult.assurances[1] },
    { icon: ShieldIcon, ...m.consult.assurances[2] },
  ];

  return (
    <Section id={id} tone={tone} spacing={spacing}>
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow={m.consult.eyebrow}
              title={title ?? m.consult.defaultTitle}
              description={description ?? m.consult.defaultDescription}
            />

            <ul className="mt-8 flex flex-col gap-5">
              {assurances.map((item) => (
                <li key={item.title} className="flex gap-3.5">
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

            <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">
                {m.consult.directLabel}
              </p>
              <a
                href={siteConfig.contact.hotlineHref}
                className="mt-2 inline-flex min-h-11 items-center gap-2 text-xl font-extrabold text-primary-strong transition-colors hover:text-primary-strong-hover"
              >
                <PhoneIcon className="h-5 w-5" />
                {siteConfig.contact.hotline}
              </a>
              <p className="mt-1 text-sm text-foreground-muted">
                {m.site.workingHours}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
              <LeadForm
                locale={locale}
                labels={leadFormLabels(locale)}
                tourSlug={tourSlug}
                defaultInterest={defaultInterest}
                compact={Boolean(tourSlug)}
              />
            </div>
            <p className="mt-4 text-center text-xs text-foreground-subtle">
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
        </div>
      </Container>
    </Section>
  );
}
