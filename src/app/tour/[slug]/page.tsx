import type { Metadata } from "next";
import { getTourSlugs } from "@/lib/data/tours";
import {
  TourDetailView,
  buildTourMetadata,
} from "@/features/tours/tour-detail-view";

/**
 * Every tour slug is produced by `generateStaticParams`, so real tour URLs are
 * fully prerendered and normal navigation is instant.
 *
 * `instant = false` is deliberate: a tour detail page's entire content depends
 * on the slug, so the honest configuration is "this segment may block while the
 * param resolves" — the alternative is a Suspense shell that would flash a
 * skeleton for the 404 case. See docs/architecture.md.
 */
export const instant = false;

export function generateStaticParams() {
  return getTourSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/tour/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return buildTourMetadata(slug);
}

export default async function TourDetailPage({ params }: PageProps<"/tour/[slug]">) {
  const { slug } = await params;
  return <TourDetailView slug={slug} />;
}
