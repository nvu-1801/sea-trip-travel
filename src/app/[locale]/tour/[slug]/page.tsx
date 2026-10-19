import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTourBySlug, getTourSlugs } from "@/lib/data/tours";
import {
  TourDetailView,
  buildTourMetadata,
} from "@/features/tours/tour-detail-view";
import { resolveLocaleFromParams } from "@/i18n/params";

/**
 * Every tour slug is produced by `generateStaticParams`, so real tour URLs are
 * fully prerendered and normal navigation is instant.
 *
 * `instant = false` is deliberate: a tour detail page's entire content depends
 * on the slug, so the honest configuration is "this segment may block while the
 * param resolves" — the alternative is a Suspense shell that would flash a
 * skeleton for the 404 case. See docs/architecture.md.
 */

export function generateStaticParams() {
  return getTourSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/tour/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = await resolveLocaleFromParams(params);
  // 404 during metadata resolution — before the PPR shell streams. A `notFound()`
  // reached while streaming degrades to a soft 404 (HTTP 200 + noindex).
  if (!getTourBySlug(slug, locale)) notFound();
  return buildTourMetadata(slug, locale);
}

export default async function TourDetailPage({
  params,
}: PageProps<"/[locale]/tour/[slug]">) {
  const { slug } = await params;
  return (
    <TourDetailView
      slug={slug}
      locale={await resolveLocaleFromParams(params)}
    />
  );
}
