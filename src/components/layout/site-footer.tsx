import { cacheLife } from "next/cache";
import Link from "next/link";
import { footerLegalNav, ROUTES } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { primarySocialLinks, secondarySocialLinks } from "@/config/social-links";
import { getCategories } from "@/lib/data/categories";
import { Container } from "@/components/ui/layout";
import { MailIcon, MapPinIcon, PhoneIcon, ClockIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { localizePath } from "@/i18n/routing";
import { Logo } from "./logo";

/**
 * Copyright year.
 *
 * Reading the clock during prerender is non-deterministic, which Cache
 * Components refuses to allow. Caching the value gives every visitor the same
 * output until the cache lifetime lapses — which is exactly right for a year.
 */
async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

/** Interleave the cached year element into the localized copyright template. */
function renderCopyright(template: string, name: string): React.ReactNode {
  return template.split(/(\{year\}|\{name\})/).map((part, index) => {
    if (part === "{year}") return <CopyrightYear key={index} />;
    if (part === "{name}") return name;
    return part;
  });
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const topLevel = getCategories(locale).filter((category) => category.parentId === null);
  const socials = [...primarySocialLinks, ...secondarySocialLinks];

  return (
    <footer className="border-t border-border bg-surface-sunken">
      <Container>
        <div className="grid grid-cols-1 gap-8 py-12 sm:gap-10 sm:py-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo size="md" tagline={m.site.tagline} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-foreground-muted">
              {m.site.description}
            </p>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-primary-strong">
              {m.site.tagline}
            </p>
          </div>

          <nav aria-label={m.footer.categoriesAria} className="lg:col-span-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              {m.footer.categoriesTitle}
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {topLevel.map((category) => (
                <li key={category.id}>
                  <Link
                    href={localizePath(locale, category.path)}
                    className="font-medium text-foreground-muted transition-colors hover:text-primary-strong"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={m.footer.infoAria} className="lg:col-span-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              {m.footer.infoTitle}
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href={localizePath(locale, ROUTES.guides)}
                  className="font-medium text-foreground-muted transition-colors hover:text-primary-strong"
                >
                  {m.nav.guides}
                </Link>
              </li>
              <li>
                <Link
                  href={localizePath(locale, ROUTES.contact)}
                  className="font-medium text-foreground-muted transition-colors hover:text-primary-strong"
                >
                  {m.nav.contact}
                </Link>
              </li>
              {footerLegalNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={localizePath(locale, item.href)}
                    className="font-medium text-foreground-muted transition-colors hover:text-primary-strong"
                  >
                    {m.nav[item.labelKey]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              {m.footer.contactTitle}
            </h2>
            <ul className="mt-4 space-y-1 text-sm text-foreground-muted">
              <li className="flex items-center gap-2.5">
                <PhoneIcon className="h-4 w-4 shrink-0 text-primary-strong" />
                <a
                  href={siteConfig.contact.hotlineHref}
                  className="inline-flex min-h-11 items-center font-semibold text-foreground transition-colors hover:text-primary-strong"
                >
                  {siteConfig.contact.hotline}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MailIcon className="h-4 w-4 shrink-0 text-primary-strong" />
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="inline-flex min-h-11 items-center break-all transition-colors hover:text-primary-strong"
                >
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPinIcon className="h-4 w-4 shrink-0 text-primary-strong" />
                <span className="inline-flex min-h-11 items-center">
                  {siteConfig.contact.address}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <ClockIcon className="h-4 w-4 shrink-0 text-primary-strong" />
                <span className="inline-flex min-h-11 items-center">{m.site.workingHours}</span>
              </li>
            </ul>

            {socials.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-2">
                {socials.map((social) => (
                  <li key={social.key}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center rounded-full border border-border-strong px-3.5 text-xs font-semibold text-foreground-muted transition-colors hover:border-primary hover:text-primary-strong"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border py-6 text-xs text-foreground-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>{renderCopyright(m.footer.copyright, siteConfig.name)}</p>
          <p>{m.footer.disclaimer}</p>
        </div>
      </Container>
    </footer>
  );
}
