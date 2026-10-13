import { siteConfig } from "@/config/site";
import { absoluteUrl } from "./seo";

/**
 * JSON-LD builders.
 *
 * House rule: only emit structured data that mirrors content actually visible
 * on the page. No `aggregateRating`, no `review`, no invented awards or
 * certifications. `offers` is emitted only when a real price exists.
 */

type Json = Record<string, unknown>;

export function travelAgencyJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: siteConfig.name,
    description: siteConfig.description,
    url: absoluteUrl("/"),
    slogan: siteConfig.message,
    image: absoluteUrl("/opengraph-image.png"),
    logo: absoluteUrl("/brand/logo-lockup.png"),
    telephone: siteConfig.contact.hotline,
    email: siteConfig.contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.contact.address,
      addressCountry: "VN",
    },
    areaServed: { "@type": "Country", name: "Việt Nam" },
  };
}

export function websiteJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    inLanguage: "vi",
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
  path,
  tours,
}: {
  name: string;
  description: string;
  path: string;
  tours: readonly { title: string; slug: string }[];
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    inLanguage: "vi",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: tours.length,
      itemListElement: tours.map((tour, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tour.title,
        url: absoluteUrl(`/tour/${tour.slug}`),
      })),
    },
  };
}

export function touristTripJsonLd({
  title,
  summary,
  slug,
  destinations,
  itinerary,
  price,
  image,
}: {
  title: string;
  summary: string;
  slug: string;
  destinations: readonly { name: string }[];
  itinerary: readonly { title: string; summary?: string }[];
  price: { amount: number; currency: string } | null;
  image: string;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: title,
    description: summary,
    url: absoluteUrl(`/tour/${slug}`),
    image: absoluteUrl(image),
    inLanguage: "vi",
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
  slug,
  publishedAt,
  updatedAt,
  image,
  author,
}: {
  title: string;
  excerpt: string;
  slug: string;
  publishedAt: string;
  updatedAt?: string;
  image: string;
  author: string;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: excerpt,
    mainEntityOfPage: absoluteUrl(`/cam-nang-du-lich/${slug}`),
    image: absoluteUrl(image),
    inLanguage: "vi",
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
