import type { Metadata } from "next";
import { siteConfig } from "@/config/runtime-site";
import { localeMeta, type Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";

/** Join the configured origin with a site-relative path. */
export function absoluteUrl(path: string): string {
  const base = siteConfig.url.replace(/\/+$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

type BuildMetadataInput = {
  title: string;
  description: string;
  /** Site-relative canonical path, in its Vietnamese form. */
  path: string;
  /** Locale this metadata is rendered for. */
  locale: Locale;
  /** Site-relative OG image. Defaults to the generated brand card. */
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  noIndex?: boolean;
  keywords?: readonly string[];
  /**
   * Emit `vi` / `en` / `x-default` hreflang alternates. Set `false` for pages
   * that have no eligible counterpart (404s, single-language pages).
   */
  hreflang?: boolean;
  /**
   * True only when the English counterpart is published, readable and allowed
   * to be indexed. Without it we never advertise an alternate that points at a
   * noindex page — the old behaviour put `en` on VI pages even when the EN page
   * was `noindex, nofollow`.
   */
  enIndexable?: boolean;
  /** Bypass the layout title template; use when the title already carries the brand. */
  absoluteTitle?: boolean;
};

export function buildMetadata({
  title,
  description,
  path,
  locale,
  image = "/opengraph-image.png",
  type = "website",
  publishedTime,
  noIndex = false,
  keywords,
  hreflang = true,
  enIndexable = false,
  absoluteTitle = false,
}: BuildMetadataInput): Metadata {
  const url = absoluteUrl(localizePath(locale, path));

  const languages =
    hreflang && enIndexable && !noIndex
      ? {
          vi: absoluteUrl(localizePath("vi", path)),
          en: absoluteUrl(localizePath("en", path)),
          "x-default": absoluteUrl(localizePath("vi", path)),
        }
      : undefined;

  return {
    metadataBase: new URL(siteConfig.url),
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords: keywords ? [...keywords] : undefined,
    alternates: { canonical: url, ...(languages ? { languages } : {}) },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: siteConfig.name,
      locale: localeMeta[locale].ogLocale,
      images: [
        { url: absoluteUrl(image), width: 1200, height: 630, alt: title },
      ],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(image)],
    },
  };
}
