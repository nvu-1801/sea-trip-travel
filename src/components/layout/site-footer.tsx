import { hotelSettings, settings } from "@/server/cms/store";
import Link from "next/link";

import { ROUTES } from "@/config/navigation";

import { getCategories } from "@/lib/data/categories";
import { Container } from "@/components/ui/layout";
import {
  ChatIcon,
  FacebookIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
} from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
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

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold tracking-tight text-foreground">
      {children}
    </h2>
  );
}

const linkClass =
  "stt-footer-link inline-flex min-h-11 items-center rounded-sm font-medium text-foreground-muted";

/** Round icon button for a known social network; text pill otherwise. */
function SocialButton({ label, url }: { label: string; url: string }) {
  const KnownIcon = /face/i.test(label)
    ? FacebookIcon
    : /zalo|chat|message/i.test(label)
      ? ChatIcon
      : null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`stt-footer-social inline-flex min-h-11 items-center justify-center rounded-full border border-border-strong bg-surface/60 text-xs font-semibold text-foreground-muted ${KnownIcon ? "w-11" : "px-4"}`}
    >
      {KnownIcon ? <KnownIcon className="h-5 w-5" /> : label}
    </a>
  );
}

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
    <footer className="stt-footer border-t border-border">
      <Container>
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 py-10 lg:grid-cols-12 lg:gap-8 lg:py-14">
          <div className="col-span-2 lg:col-span-4">
            <Logo size="md" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-foreground-muted">
              {m.footer.description}
            </p>
          </div>

          <nav aria-label={m.footer.categoriesAria} className="lg:col-span-3">
            <FooterHeading>{m.footer.categoriesTitle}</FooterHeading>
            <ul className="mt-2 text-sm">
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
            <ul className="mt-2 text-sm">
              {hotelSettings().enabled ? (
                <li>
                  <Link
                    href={localizePath(locale, ROUTES.hotels)}
                    className={linkClass}
                  >
                    {m.nav.hotels}
                  </Link>
                </li>
              ) : null}
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

          <div className="col-span-2 border-t border-border pt-6 lg:col-span-3 lg:border-t-0 lg:pt-0">
            <FooterHeading>{m.footer.contactTitle}</FooterHeading>
            <ul className="mt-2 space-y-1 text-sm text-foreground-muted">
              <li className="flex items-start gap-2.5">
                <PhoneIcon className="mt-3.5 h-4 w-4 shrink-0 text-primary-strong" />
                <a
                  href={config.contact.hotlineHref}
                  className="stt-footer-link inline-flex min-h-11 items-center rounded-sm text-lg font-bold tabular-nums text-foreground"
                >
                  {config.contact.hotline}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MailIcon className="mt-3.5 h-4 w-4 shrink-0 text-primary-strong" />
                <a
                  href={`mailto:${config.contact.email}`}
                  className="stt-footer-link inline-flex min-h-11 min-w-0 items-center rounded-sm [overflow-wrap:anywhere]"
                >
                  {config.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPinIcon className="mt-2 h-4 w-4 shrink-0 text-primary-strong" />
                <span className="py-1.5 leading-relaxed">
                  {config.contact.address}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <ClockIcon className="mt-2 h-4 w-4 shrink-0 text-primary-strong" />
                <span className="py-1.5 leading-relaxed">
                  {locale === "en"
                    ? config.contact.workingHoursEn ||
                      config.contact.workingHours
                    : config.contact.workingHours}
                </span>
              </li>
            </ul>

            {socials.length > 0 ? (
              <ul className="mt-4 flex flex-wrap items-center gap-2.5">
                {socials.map((social) => (
                  <li key={social.key}>
                    <SocialButton label={social.label} url={social.url} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="border-t border-border py-5 text-xs text-foreground-muted">
          <p>{renderCopyright(m.footer.copyright, config.name)}</p>
        </div>
      </Container>
    </footer>
  );
}
