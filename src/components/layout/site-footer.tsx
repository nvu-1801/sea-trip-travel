import { settings } from "@/server/cms/store";
import Link from "next/link";

import { getCategories } from "@/lib/data/categories";
import { Container } from "@/components/ui/layout";
import {
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
} from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import { Logo } from "./logo";
import { MotionControl } from "@/features/home/motion-control";

/**
 * Copyright year.
 *
 * Reading the clock during prerender is non-deterministic, which Cache
 * Components refuses to allow. Caching the value gives every visitor the same
 * output until the cache lifetime lapses — which is exactly right for a year.
 */
async function CopyrightYear() {
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

/** Column heading with the brand rule that marks every section eyebrow. */
function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-foreground">
      <span
        aria-hidden="true"
        className="brand-gradient h-0.5 w-5 rounded-full"
      />
      {children}
    </h2>
  );
}

const linkClass =
  "font-medium text-foreground-muted transition-colors hover:text-primary-strong";

export function SiteFooter({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const config = settings();
  const topLevel = getCategories(locale).filter(
    (category) => category.parentId === null,
  );
  const socials = config.socialLinks.map((item, index) => ({
    key: String(index),
    label: item.label,
    url: item.href,
  }));

  return (
    <footer className="bg-surface-sunken">
      {/* Mirrors the identity rule at the top of the header. */}
      <div className="brand-gradient h-px w-full" aria-hidden="true" />

      <Container>
        <div className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-12 lg:py-16">
          <div className="sm:col-span-2 lg:col-span-4">
            <Logo size="md" />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary-strong">
              {m.site.tagline}
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-foreground-muted">
              {m.site.description}
            </p>
          </div>

          <nav aria-label={m.footer.categoriesAria} className="lg:col-span-3">
            <FooterHeading>{m.footer.categoriesTitle}</FooterHeading>
            <ul className="mt-5 space-y-3 text-sm">
              {topLevel.map((category) => (
                <li key={category.id}>
                  <Link
                    href={localizePath(locale, category.path)}
                    className={linkClass}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={m.footer.infoAria} className="lg:col-span-2">
            <FooterHeading>{m.footer.infoTitle}</FooterHeading>
            <ul className="mt-5 space-y-3 text-sm">
              {config.footerLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={
                      item.href.startsWith("/")
                        ? localizePath(locale, item.href)
                        : item.href
                    }
                    className={linkClass}
                  >
                    {locale === "en" ? item.labelEn || item.label : item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="sm:col-span-2 lg:col-span-3">
            <FooterHeading>{m.footer.contactTitle}</FooterHeading>
            <ul className="mt-5 space-y-1 text-sm text-foreground-muted">
              <li className="flex items-start gap-2.5">
                <PhoneIcon className="mt-3.5 h-4 w-4 shrink-0 text-primary-strong" />
                <a
                  href={config.contact.hotlineHref}
                  className="inline-flex min-h-11 items-center font-semibold text-foreground transition-colors hover:text-primary-strong"
                >
                  {config.contact.hotline}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MailIcon className="mt-3.5 h-4 w-4 shrink-0 text-primary-strong" />
                <a
                  href={`mailto:${config.contact.email}`}
                  className="inline-flex min-h-11 items-center break-all transition-colors hover:text-primary-strong"
                >
                  {config.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPinIcon className="mt-1 h-4 w-4 shrink-0 text-primary-strong" />
                <span className="py-1.5 leading-relaxed">
                  {config.contact.address}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <ClockIcon className="mt-1 h-4 w-4 shrink-0 text-primary-strong" />
                <span className="py-1.5 leading-relaxed">
                  {locale === "en"
                    ? config.contact.workingHoursEn ||
                      config.contact.workingHours
                    : config.contact.workingHours}
                </span>
              </li>
            </ul>

            {socials.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {socials.map((social) => (
                  <li key={social.key}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center rounded-full border border-border-strong bg-surface/60 px-4 text-xs font-semibold text-foreground-muted transition-[color,border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-primary-soft hover:text-primary-strong"
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
          <p>{renderCopyright(m.footer.copyright, config.name)}</p>
          <div className="flex flex-col gap-3 sm:items-end">
            <a
              href="/image-credits.html"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {locale === "en" ? "Photo credits" : "Nguồn ảnh"}
            </a>
            <MotionControl english={locale === "en"} enabled={config.motion} />
            <p className="sm:max-w-xl sm:text-right">{m.footer.disclaimer}</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
