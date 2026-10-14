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
import { leadFormLabels } from "@/features/leads/lead-form-labels";
import { getMessages } from "@/i18n/messages";
import { localizePath } from "@/i18n/routing";
import { resolveLocaleFromParams } from "@/i18n/params";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocaleFromParams(params);
  const m = getMessages(locale);
  return buildMetadata({
    title: m.contact.metaTitle,
    description: m.contact.metaDescription,
    path: ROUTES.contact,
    locale,
  });
}

export default async function ContactPage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocaleFromParams(params);
  const m = getMessages(locale);

  const channels = [
    {
      icon: PhoneIcon,
      label: m.contact.channelHotline,
      value: siteConfig.contact.hotline,
      href: siteConfig.contact.hotlineHref,
      note: m.site.workingHours,
    },
    {
      icon: MailIcon,
      label: m.contact.channelEmail,
      value: siteConfig.contact.email,
      href: `mailto:${siteConfig.contact.email}`,
      note: m.contact.emailNote,
    },
    {
      icon: MapPinIcon,
      label: m.contact.channelAddress,
      value: siteConfig.contact.address,
      href: null,
      note: m.contact.addressNote,
    },
  ];

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: m.common.home, path: localizePath(locale, "/") },
          { label: m.nav.contact, path: localizePath(locale, ROUTES.contact) },
        ])}
      />

      <Breadcrumbs
        items={[
          { label: m.common.home, href: localizePath(locale, "/") },
          { label: m.nav.contact },
        ]}
        ariaLabel={m.common.breadcrumbAria}
      />

      <section className="relative overflow-hidden border-b border-border bg-surface-muted">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-brand-100/70 blur-3xl"
        />
        <Container>
          <div className="relative flex flex-col gap-4 py-12 sm:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-strong">
              {m.contact.heroEyebrow}
            </p>
            <h1 className="max-w-3xl text-display font-display font-semibold text-foreground">
              {m.contact.heroTitle}
            </h1>
            <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-foreground-muted">
              {m.contact.heroDescription}
            </p>
          </div>
        </Container>
      </section>

      <Section tone="default" spacing="default">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
            {/* --- Channels + steps ---------------------------------------- */}
            <div className="flex flex-col gap-8 lg:col-span-5">
              <ul className="flex flex-col gap-4">
                {channels.map((channel) => (
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
                  {m.contact.afterTitle}
                </h2>
                <ol className="mt-4 flex flex-col gap-4">
                  {m.contact.steps.map((step) => (
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
                  {m.contact.outOfHours}
                </p>
              </div>
            </div>

            {/* --- Form ---------------------------------------------------- */}
            <div className="lg:col-span-7">
              <Reveal>
                <div className="rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
                  <SectionHeading
                    eyebrow={m.contact.formEyebrow}
                    title={m.contact.formTitle}
                    description={m.contact.formDescription}
                    as="h2"
                  />
                  <div className="mt-7">
                    <LeadForm locale={locale} labels={leadFormLabels(locale)} />
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
