import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

/** Join the configured origin with a site-relative path. */
export function absoluteUrl(path: string): string {
  const base = siteConfig.url.replace(/\/+$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Strip diacritics-free path segments are already ASCII; this is for safety. */
export function canonicalFor(path: string): string {
  return absoluteUrl(path);
}

type BuildMetadataInput = {
  title: string;
  description: string;
  /** Site-relative canonical path. */
  path: string;
  /** Site-relative OG image. Defaults to the generated brand card. */
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  noIndex?: boolean;
  keywords?: readonly string[];
};

export function buildMetadata({
  title,
  description,
  path,
  image = "/opengraph-image.png",
  type = "website",
  publishedTime,
  noIndex = false,
  keywords,
}: BuildMetadataInput): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    keywords: keywords ? [...keywords] : undefined,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [{ url: absoluteUrl(image), width: 1200, height: 630, alt: title }],
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
