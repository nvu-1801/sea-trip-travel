import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { SkipLink, SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FloatingContact } from "@/components/layout/floating-contact";
import { JsonLd } from "@/components/seo/json-ld";
import { travelAgencyJsonLd, websiteJsonLd } from "@/lib/json-ld";

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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Chọn lọc điểm đến, nâng tầm trải nghiệm`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
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
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    url: siteConfig.url,
  },
  robots: { index: true, follow: true, "max-image-preview": "large" },
};

export const viewport: Viewport = {
  themeColor: "#ff0366",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={siteConfig.lang} className={`${beVietnamPro.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <JsonLd id="ld-agency" data={travelAgencyJsonLd()} />
        <JsonLd id="ld-website" data={websiteJsonLd()} />

        <SkipLink />
        <SiteHeader />

        <main id="noi-dung-chinh" className="flex-1">
          {children}
        </main>

        <SiteFooter />
        <FloatingContact />
      </body>
    </html>
  );
}
