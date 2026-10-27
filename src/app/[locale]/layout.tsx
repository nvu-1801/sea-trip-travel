export const dynamic = "force-dynamic";
import { SiteContactProvider } from "@/components/layout/site-context";
import { settings, siteTheme } from "@/server/cms/store";
import { contentVersion } from "@/server/cms/db";
import { LiveContent } from "@/components/layout/live-content";
import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import {
  Be_Vietnam_Pro,
  Cormorant_Garamond,
  Lora,
  Manrope,
} from "next/font/google";
import "../globals.css";
import { siteConfig } from "@/config/runtime-site";
import { SkipLink, SiteHeader } from "@/components/layout/site-header";
import { IdleMotionManager } from "@/features/home/idle-motion-manager";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { WebVitals } from "@/components/analytics/web-vitals";
import { InitialScroll } from "@/components/layout/initial-scroll";
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
import { themeById } from "@/config/themes";

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
 * Display faces.
 *
 * Vietnamese uses Lora: a warm, low-contrast serif with full Vietnamese
 * diacritic support and a gentler rhythm than the previous Fraunces. English
 * uses Cormorant Garamond, which is more calligraphic and editorial. Both are
 * self-hosted by `next/font` (no layout shift, no request to Google at runtime).
 */
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

/**
 * English body face. Manrope is soft, modern and has Vietnamese support too,
 * but it is only selected for `html[lang="en"]`; Vietnamese keeps Be Vietnam
 * Pro, which is optimised for Vietnamese diacritics.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
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

export async function generateViewport(): Promise<Viewport> {
  const theme = themeById(siteTheme());
  return {
    // Browser chrome follows the active theme; the rest of the palette is
    // applied as inline custom properties on <html> below.
    themeColor: theme.vars["--color-primary-strong"],
    width: "device-width",
    initialScale: 1,
    /* Light-only design: tells browsers not to force-darken the page. */
    colorScheme: "light",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const version =
    process.env.CMS_ENABLED === "1" ? contentVersion("public") : null;
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const m = getMessages(locale);
  const siteSettings = settings();
  const activeTheme = themeById(siteTheme());

  return (
    <html
      data-motion-paused={!siteSettings.motion}
      data-theme={activeTheme.id}
      style={activeTheme.vars as CSSProperties}
      lang={localeMeta[locale].htmlLang}
      className={`${beVietnamPro.variable} ${lora.variable} ${cormorant.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <noscript>
          <style>{`.stt-reveal-3d,.stt-seq>*{opacity:1!important;transform:none!important;transition:none!important}`}</style>
        </noscript>
        <SiteContactProvider
          value={{
            ...siteConfig.contact,
            name: siteConfig.name,
            socialLinks: siteSettings.socialLinks,
          }}
        >
          <JsonLd id="ld-agency" data={travelAgencyJsonLd(locale)} />
          <JsonLd id="ld-website" data={websiteJsonLd(locale)} />

          <SkipLink label={m.common.skipToContent} />
          <PageViewTracker />
          <WebVitals />
          <InitialScroll />
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
