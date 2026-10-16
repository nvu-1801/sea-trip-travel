import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "../globals.css";

/**
 * Root layout for the admin area.
 *
 * The admin lives outside `[locale]` (the URL is plain Vietnamese, `/admin/…`)
 * and is never indexed. It is a second root layout so the public site's header,
 * footer and JSON-LD never wrap an admin screen.
 */

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Quản trị", template: "%s · Quản trị SEA TRIP" },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport = {
  themeColor: "#ff0366",
  width: "device-width",
  initialScale: 1,
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full">
      <body
        className={`${beVietnamPro.variable} min-h-full bg-surface-sunken text-foreground antialiased`}
        style={{ fontFamily: "var(--font-be-vietnam-pro), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
