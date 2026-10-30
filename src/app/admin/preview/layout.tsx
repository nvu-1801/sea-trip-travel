import "../../globals.css";
import type { CSSProperties } from "react";
import {
  Be_Vietnam_Pro,
  Cormorant_Garamond,
  Lora,
} from "next/font/google";
import { themeById } from "@/config/themes";
import { siteTheme } from "@/server/cms/store";

/**
 * Admin previews render the real public section, so they need the same design
 * tokens and font faces as the landing page. The Studio shell uses its own
 * palette; this wrapper is the "public island" inside it.
 */
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
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

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = themeById(siteTheme());
  return (
    <div
      className={`${beVietnamPro.variable} ${lora.variable} ${cormorant.variable}`}
      data-theme={theme.id}
      style={
        {
          ...theme.vars,
          "--font-display": `var(--font-lora), "Lora", Georgia, "Times New Roman", serif`,
        } as CSSProperties
      }
      lang="vi"
    >
      {children}
    </div>
  );
}
