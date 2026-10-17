import { siteConfig } from "@/config/site";
import { localeMeta, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { absoluteUrl } from "./seo";

/**
 * JSON-LD builders.
 *
 * House rule: only emit structured data that mirrors content actually visible
 * on the page. No `aggregateRating`, no `review`, no invented awards or
 * certifications. `offers` is emitted only when a real price exists.
 *
 * Every builder takes the rendering `locale` so `inLanguage` and the visible
 * strings match the page language.
 */

type Json = Record<string, unknown>;

const lang = (locale: Locale) => localeMeta[locale].htmlLang;

export type JsonLdContact = {
  hotline: string;
  email: string;
  /** Free-text address the owner edits; falls back to the shipped parts. */
  address?: string;
  /** Owner-edited social links; empty strings are dropped from `sameAs`. */
  social?: { facebook?: string; zalo?: string };
};

export function travelAgencyJsonLd(locale: Locale, contact?: JsonLdContact): Json {
  const m = getMessages(locale);
  const hotline = contact?.hotline ?? siteConfig.contact.hotline;
  const email = contact?.email ?? siteConfig.contact.email;
  const socials = [
    contact?.social?.facebook ?? siteConfig.social.facebook,
    contact?.social?.zalo ?? siteConfig.social.zalo,
  ].filter((link) => link.length > 0);

  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: siteConfig.name,
    description: m.site.description,
    url: absoluteUrl("/"),
    slogan: m.site.tagline,
    image: absoluteUrl("/opengraph-image.png"),
    logo: absoluteUrl("/brand/logo-lockup.png"),
    telephone: hotline,
    email,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.contact.addressParts.street,
      addressLocality: siteConfig.contact.addressParts.locality,
      addressRegion: siteConfig.contact.addressParts.region,
      addressCountry: "VN",
    },
    areaServed: { "@type": "Country", name: locale === "vi" ? "Việt Nam" : "Vietnam" },
    // Only channels the owner has actually set — never a fallback platform URL.
    sameAs: socials,
  };
}

export function websiteJsonLd(locale: Locale): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    inLanguage: lang(locale),
  };
}

export function breadcrumbJsonLd(items: readonly { label: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.path),
    })),
  };
}

export function collectionPageJsonLd({
  name,
  description,
  url,
  tours,
  locale,
}: {
  name: string;
  description: string;
  /** Absolute URL of the page. */
  url: string;
  tours: readonly { title: string; url: string }[];
  locale: Locale;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    inLanguage: lang(locale),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: tours.length,
      itemListElement: tours.map((tour, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tour.title,
        url: tour.url,
      })),
    },
  };
}

export function touristTripJsonLd({
  title,
  summary,
  url,
  destinations,
  itinerary,
  price,
  image,
  locale,
}: {
  title: string;
  summary: string;
  /** Absolute URL of the tour page. */
  url: string;
  destinations: readonly { name: string }[];
  itinerary: readonly { title: string; summary?: string }[];
  price: { amount: number; currency: string } | null;
  image: string;
  locale: Locale;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: title,
    description: summary,
    url,
    image: absoluteUrl(image),
    inLanguage: lang(locale),
    provider: {
      "@type": "TravelAgency",
      name: siteConfig.name,
      url: absoluteUrl("/"),
    },
    ...(destinations.length > 0
      ? { itinerary: destinations.map((destination) => destination.name) }
      : {}),
    ...(itinerary.length > 0
      ? {
          subjectOf: {
            "@type": "ItemList",
            numberOfItems: itinerary.length,
            itemListElement: itinerary.map((day, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: day.title,
              ...(day.summary ? { description: day.summary } : {}),
            })),
          },
        }
      : {}),
    // Only when a real, published price exists — never a placeholder.
    ...(price
      ? {
          offers: {
            "@type": "Offer",
            price: price.amount,
            priceCurrency: price.currency,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };
}

export function articleJsonLd({
  title,
  excerpt,
  url,
  publishedAt,
  updatedAt,
  image,
  author,
  locale,
}: {
  title: string;
  excerpt: string;
  /** Absolute URL of the article page. */
  url: string;
  publishedAt: string;
  updatedAt?: string;
  image: string;
  author: string;
  locale: Locale;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: excerpt,
    mainEntityOfPage: url,
    image: absoluteUrl(image),
    inLanguage: lang(locale),
    datePublished: publishedAt,
    ...(updatedAt ? { dateModified: updatedAt } : {}),
    author: { "@type": "Organization", name: author },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: { "@type": "ImageObject", url: absoluteUrl("/brand/logo-lockup.png") },
    },
  };
}
