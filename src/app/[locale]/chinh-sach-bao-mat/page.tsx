import { notFound } from "next/navigation";
import { contentPage } from "@/server/cms/pages";
import { ArticleBody } from "@/features/guides/article-body";
import type { Metadata } from "next";
import { ROUTES } from "@/config/navigation";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, Section } from "@/components/ui/layout";
import { JsonLd } from "@/components/seo/json-ld";
import { AlertIcon } from "@/components/ui/icons";
import { TranslationNotice } from "@/components/layout/translation-notice";
import { format, getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import { resolveLocaleFromParams } from "@/i18n/params";
import { defaultLocale } from "@/i18n/config";

const POLICY_UPDATED_AT = "2026-10-13";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocaleFromParams(params);
  const m = getMessages(locale);
  return buildMetadata({
    title:
      contentPage("chinh-sach-bao-mat")?.seo?.title ??
      contentPage("chinh-sach-bao-mat")?.title ??
      m.privacy.metaTitle,
    description:
      contentPage("chinh-sach-bao-mat")?.seo?.description ??
      contentPage("chinh-sach-bao-mat")?.summary ??
      m.privacy.metaDescription,
    path: ROUTES.privacy,
    locale,
    // The policy text is legal copy: it is translated only from the source and
    // must be approved by the owner before it is indexed in English.
    noIndex: locale !== defaultLocale,
    hreflang: locale === defaultLocale,
  });
}

/**
 * Privacy notice for the consultation form.
 *
 * Scope is deliberately narrow: this policy covers the contact information
 * collected by the request form. It does not claim analytics cookies, accounts
 * or payments that the MVP does not have.
 *
 * ⚠️ TODO(owner): replace the legal-entity placeholder below and have the final
 * wording reviewed before launch. See docs/CONTENT-TODO.md. The English page
 * shows the Vietnamese policy behind an explicit draft notice until it is
 * reviewed.
 */
export default async function PrivacyPage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocaleFromParams(params);
  const m = getMessages(locale);
  const page = contentPage("chinh-sach-bao-mat");
  if (!page) notFound();
  const updated = (page.updatedAt.slice(0, 10) || POLICY_UPDATED_AT)
    .split("-")
    .reverse()
    .join("/");

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: m.common.home, path: localizePath(locale, "/") },
          {
            label: m.privacy.title,
            path: localizePath(locale, ROUTES.privacy),
          },
        ])}
      />

      {locale === defaultLocale ? null : <TranslationNotice locale={locale} />}

      <Breadcrumbs
        items={[
          { label: m.common.home, href: localizePath(locale, "/") },
          { label: m.privacy.title },
        ]}
        ariaLabel={m.common.breadcrumbAria}
      />

      <Container>
        <div className="mx-auto max-w-3xl py-12 sm:py-16">
          <header className="flex flex-col gap-4 border-b border-border pb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-strong">
              {m.privacy.eyebrow}
            </p>
            <h1 className="text-display font-display font-semibold text-foreground">
              {locale === "en" && page.titleEn ? page.titleEn : page.title}
            </h1>
            {page.summary && (
              <p className="text-foreground-muted">
                {locale === "en" && page.summaryEn
                  ? page.summaryEn
                  : page.summary}
              </p>
            )}
            <p className="text-sm text-foreground-subtle">
              {format(m.privacy.lastUpdated, { date: updated })}
            </p>
          </header>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-warning-soft p-4 text-sm leading-relaxed text-foreground">
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <p>
              <strong className="font-bold">Bản dự thảo.</strong> Thông tin pháp
              lý của đơn vị vận hành (tên công ty, mã số thuế, địa chỉ đăng ký)
              chưa được cung cấp và sẽ được bổ sung trước khi website chính thức
              hoạt động. Nội dung dưới đây mô tả đúng cách website hiện xử lý dữ
              liệu.
            </p>
          </div>

          <div className="mt-10">
            <ArticleBody
              blocks={
                locale === "en" && page.bodyEn.length ? page.bodyEn : page.body
              }
            />
          </div>
        </div>
      </Container>

      <Section tone="muted" spacing="tight">
        <Container>
          <p className="text-sm text-foreground-muted">
            {m.privacy.footerLinkPre}{" "}
            <a
              href={localizePath(locale, ROUTES.contact)}
              className="font-semibold text-primary-strong underline underline-offset-2"
            >
              {m.privacy.footerLink}
            </a>{" "}
            {m.privacy.footerLinkPost}
          </p>
        </Container>
      </Section>
    </>
  );
}
