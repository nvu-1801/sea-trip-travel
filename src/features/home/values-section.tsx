import { ROUTES } from "@/config/navigation";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { AssetImage } from "@/components/ui/asset-image";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";

/**
 * Brand values.
 *
 * Every claim here is about *how we work* — something a traveller can verify by
 * talking to us. There are deliberately no invented customer counts, ratings,
 * awards or partner logos.
 */
export function ValuesSection({ locale }: { locale: Locale }) {
  const m = getMessages(locale);

  return (
    <Section tone="sunken" spacing="loose">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Reveal>
              <div className="stt-mask-reveal relative">
                <AssetImage
                  image={{ alt: m.home.values.imageAlt }}
                  sizes="(max-width: 1024px) 90vw, 30vw"
                  className="aspect-[4/5] w-full rounded-3xl border border-border shadow-card"
                />
                <div className="absolute -bottom-5 right-4 max-w-52 rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary-strong">
                    {m.home.values.cardLabel}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">
                    {m.site.tagline}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal>
              <SectionHeading
                eyebrow={m.home.values.eyebrow}
                title={m.home.values.title}
                description={m.home.values.description}
              />
            </Reveal>

            <ol className="mt-9 flex flex-col gap-6">
              {m.home.values.principles.map((principle, index) => (
                <Reveal as="li" key={principle.title}>
                  <div className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-surface text-sm font-extrabold text-primary-strong"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        {principle.title}
                      </h3>
                      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-foreground-muted">
                        {principle.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>

            <Reveal>
              <ButtonLink
                href={localizePath(locale, ROUTES.contact)}
                className="mt-9"
              >
                {m.home.values.cta}
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            </Reveal>
          </div>
        </div>
      </Container>
    </Section>
  );
}
