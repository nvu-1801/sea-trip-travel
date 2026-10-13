import { cacheLife } from "next/cache";
import Link from "next/link";
import { footerLegalNav, ROUTES } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { primarySocialLinks, secondarySocialLinks } from "@/config/social-links";
import { getCategories } from "@/lib/data/categories";
import { Container } from "@/components/ui/layout";
import { MailIcon, MapPinIcon, PhoneIcon, ClockIcon } from "@/components/ui/icons";
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

export function SiteFooter() {
  const topLevel = getCategories().filter((category) => category.parentId === null);
  const socials = [...primarySocialLinks, ...secondarySocialLinks];

  return (
    <footer className="border-t border-border bg-surface-sunken">
      <Container>
        <div className="grid gap-8 py-12 sm:gap-10 sm:py-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo size="md" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-foreground-muted">
              {siteConfig.description}
            </p>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-primary-strong">
              {siteConfig.message}
            </p>
          </div>

          <nav aria-label="Danh mục tour" className="lg:col-span-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Danh mục tour
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {topLevel.map((category) => (
                <li key={category.id}>
                  <Link
                    href={category.path}
                    className="font-medium text-foreground-muted transition-colors hover:text-primary-strong"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Liên kết khác" className="lg:col-span-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Thông tin
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href={ROUTES.guides}
                  className="font-medium text-foreground-muted transition-colors hover:text-primary-strong"
                >
                  Cẩm Nang Du Lịch
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.contact}
                  className="font-medium text-foreground-muted transition-colors hover:text-primary-strong"
                >
                  Liên Hệ
                </Link>
              </li>
              {footerLegalNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="font-medium text-foreground-muted transition-colors hover:text-primary-strong"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Liên hệ
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-foreground-muted">
              <li className="flex items-start gap-2.5">
                <PhoneIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong" />
                <a
                  href={siteConfig.contact.hotlineHref}
                  className="font-semibold text-foreground transition-colors hover:text-primary-strong"
                >
                  {siteConfig.contact.hotline}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MailIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong" />
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="break-all transition-colors hover:text-primary-strong"
                >
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong" />
                <span>{siteConfig.contact.address}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong" />
                <span>{siteConfig.contact.workingHours}</span>
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
                      className="inline-flex rounded-full border border-border-strong px-3 py-1.5 text-xs font-semibold text-foreground-muted transition-colors hover:border-primary hover:text-primary-strong"
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
          <p>
            © <CopyrightYear /> {siteConfig.name}.
          </p>
          <p>
            Thông tin tour, lịch trình và hình ảnh trên website cần được xác nhận trước khi xuất
            bản.
          </p>
        </div>
      </Container>
    </footer>
  );
}
