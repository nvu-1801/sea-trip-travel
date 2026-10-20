export const dynamic = "force-dynamic";
import { SiteContactProvider } from "@/components/layout/site-context";
import { settings } from "@/server/cms/store";
import { contentVersion } from "@/server/cms/db";
import { LiveContent } from "@/components/layout/live-content";
import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import "../globals.css";
import { siteConfig } from "@/config/runtime-site";
import { SkipLink, SiteHeader } from "@/components/layout/site-header";
import { IdleMotionManager } from "@/features/home/idle-motion-manager";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { FloatingContact } from "@/components/layout/floating-contact";
import { JsonLd } from "@/components/seo/json-ld";
import { travelAgencyJsonLd, websiteJsonLd } from "@/lib/json-ld";
import {
  defaultLocale,
  isLocale,
  localeMeta,
  locales,
  type Locale,
} from "@/i18n/config";
import { getMessages } from "@/i18n/server";

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
  /* Light-only design: tells browsers not to force-darken the page. */
  colorScheme: "light",
};

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const version =
    process.env.CMS_ENABLED === "1" ? contentVersion("public") : null;
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const m = getMessages(locale);

  return (
    <html
      data-motion-paused={!settings().motion}
      lang={localeMeta[locale].htmlLang}
      className={`${beVietnamPro.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteContactProvider
          value={{
            ...siteConfig.contact,
            name: siteConfig.name,
            socialLinks: settings().socialLinks,
          }}
        >
          <JsonLd id="ld-agency" data={travelAgencyJsonLd(locale)} />
          <JsonLd id="ld-website" data={websiteJsonLd(locale)} />

          <SkipLink label={m.common.skipToContent} />
          <PageViewTracker />
          <IdleMotionManager />
          {version !== null && <LiveContent version={version} />}
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
          />
        </SiteContactProvider>
      </body>
    </html>
  );
}
