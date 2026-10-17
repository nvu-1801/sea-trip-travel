import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import "../globals.css";
import { siteConfig } from "@/config/site";
import { SkipLink, SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FloatingContact } from "@/components/layout/floating-contact";
import { resolveSocialLinks } from "@/config/social-links";
import { getSiteSettings } from "@/lib/data/settings";
import { JsonLd } from "@/components/seo/json-ld";
import { travelAgencyJsonLd, websiteJsonLd } from "@/lib/json-ld";
import { defaultLocale, isLocale, localeMeta, locales, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

/**
 * Be Vietnam Pro — designed for Vietnamese. Full diacritic coverage at every
 * weight, self-hosted by `next/font` so there is no render-blocking request to
 * Google and no layout shift.
 */
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/**
 * Fraunces — display serif for headings only (H1/H2, `text-display*`). Its
 * `SOFT` axis lets the terminals read gentler, which is the "softer, more
 * editorial" tone the brand wants. Body and UI stay on Be Vietnam Pro.
 * Variable font, so every weight is available without enumerating them;
 * the `vietnamese` subset is required for correct diacritic stacking.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "vietnamese"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

/** Both locales are prerendered; the proxy maps the URL prefix onto this segment. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const m = getMessages(locale);

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} — ${m.site.tagline}`,
      template: `%s | ${siteConfig.name}`,
    },
    description: m.site.description,
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    formatDetection: { telephone: true, address: false, email: true },
    icons: {
      icon: [{ url: "/icon.png", type: "image/png" }],
      apple: [{ url: "/apple-icon.png", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      locale: localeMeta[locale].ogLocale,
      siteName: siteConfig.name,
      url: siteConfig.url,
    },
    robots: { index: true, follow: true, "max-image-preview": "large" },
  };
}

export const viewport: Viewport = {
  themeColor: "#ff0366",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const m = getMessages(locale);
  // Owner-edited contact + social details, resolved once for the chrome.
  const settings = await getSiteSettings(locale);
  const resolvedSocial = resolveSocialLinks(settings.social, settings.contact.hotline);
  const socialLinks = {
    zalo: resolvedSocial.primary.find((link) => link.key === "zalo")?.url ?? resolvedSocial.primary[1].url,
    facebook:
      resolvedSocial.primary.find((link) => link.key === "facebook")?.url ?? resolvedSocial.primary[0].url,
  };

  return (
    <html
      lang={localeMeta[locale].htmlLang}
      className={`${beVietnamPro.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <JsonLd
          id="ld-agency"
          data={travelAgencyJsonLd(locale, {
            hotline: settings.contact.hotline,
            email: settings.contact.email,
            address: settings.contact.address,
            social: { facebook: settings.social.facebook, zalo: settings.social.zalo },
          })}
        />
        <JsonLd id="ld-website" data={websiteJsonLd(locale)} />

        <SkipLink label={m.common.skipToContent} />
        <SiteHeader locale={locale} />

        <main id="noi-dung-chinh" className="flex-1">
          {children}
        </main>

        <SiteFooter locale={locale} />
        <FloatingContact
          labels={{
            zalo: m.floating.zalo,
            facebook: m.floating.facebook,
            phone: m.floating.phone,
            open: m.floating.open,
            close: m.floating.close,
            backToTop: m.common.backToTop,
          }}
          contact={{ hotline: settings.contact.hotline, hotlineHref: settings.contact.hotlineHref }}
          social={socialLinks}
        />
      </body>
    </html>
  );
}
