import type { Metadata } from "next";
import { ROUTES } from "@/config/navigation";
import { siteConfig } from "@/config/runtime-site";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/json-ld";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import {
  ClockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SendIcon,
} from "@/components/ui/icons";
import { PageHero } from "@/features/shared/page-hero";
import { LeadForm } from "@/features/leads/lead-form";
import { leadFormLabels } from "@/features/leads/lead-form-labels";
import { getMessages } from "@/i18n/server";
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
    enIndexable: true,
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

  const crumbs = [
    { label: m.common.home, href: localizePath(locale, "/") },
    { label: m.nav.contact },
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

      <PageHero
        crumbs={crumbs}
        crumbsLabel={m.common.breadcrumbAria}
        eyebrow={m.contact.heroEyebrow}
        titleLines={[
          { text: m.contact.heroTitleLine1 },
          { text: m.contact.heroTitleLine2, emphasis: true },
        ]}
        description={m.contact.heroDescription}
        actions={
          <>
            <ButtonLink
              href={siteConfig.contact.hotlineHref}
              size="lg"
              external
            >
              <PhoneIcon className="h-4 w-4" />
              {m.common.callHotline}
            </ButtonLink>
            <a href="#tu-van" className="stt-page-hero-link">
              {m.contact.formTitle}
              <SendIcon className="h-4 w-4" />
            </a>
          </>
        }
        meta={[
          { label: m.common.hotline, value: siteConfig.contact.hotline },
          { label: m.common.email, value: siteConfig.contact.email },
        ]}
        media={{
          src: "/images/hero/coastal-sunset.webp",
          alt: m.contact.heroImageAlt,
          sizes: "(max-width: 1023px) 100vw, 46vw",
        }}
        floating={
          <div>
            <p className="stt-page-hero-float-kicker">{m.common.hotline}</p>
            <a
              href={siteConfig.contact.hotlineHref}
              className="stt-page-hero-float-body mt-1 inline-flex min-h-11 items-center font-display text-lg font-semibold text-foreground transition-colors hover:text-primary-strong"
            >
              {siteConfig.contact.hotline}
            </a>
            <p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-semibold text-foreground-subtle">
              <ClockIcon className="h-3.5 w-3.5" />
              {m.site.workingHours}
            </p>
          </div>
        }
        scrollCue={m.common.scrollCue}
        tone="warm"
      />

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
                        <p className="text-base font-bold text-foreground">
                          {channel.value}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-foreground-muted">
                        {channel.note}
                      </p>
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
                      <p className="text-sm font-semibold text-foreground">
                        {step.title}
                      </p>
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
            <div id="tu-van" className="scroll-mt-28 lg:col-span-7">
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
