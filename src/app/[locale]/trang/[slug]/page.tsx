import { notFound } from "next/navigation";
import { contentPage } from "@/server/cms/pages";
import { ContentPageView } from "@/features/pages/content-page";
import { resolveLocaleFromParams } from "@/i18n/params";
import { buildMetadata } from "@/lib/seo";
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/trang/[slug]">) {
  const { slug } = await params,
    page = contentPage(slug),
    locale = await resolveLocaleFromParams(params);
  if (!page || slug === "chinh-sach-bao-mat") notFound();
  return buildMetadata({
    title:
      locale === "en" && page.titleEn
        ? page.titleEn
        : (page.seo?.title ?? page.title),
    description:
      locale === "en" && page.summaryEn
        ? page.summaryEn
        : (page.seo?.description ?? page.summary),
    path: `/trang/${slug}`,
    locale,
    noIndex: locale === "en" && !page.translationReviewed,
    hreflang: locale === "vi" || page.translationReviewed,
  });
}
export default async function Page({
  params,
}: PageProps<"/[locale]/trang/[slug]">) {
  const { slug } = await params,
    page = contentPage(slug);
  if (!page || slug === "chinh-sach-bao-mat") notFound();
  return (
    <ContentPageView
      page={page}
      locale={await resolveLocaleFromParams(params)}
    />
  );
}
