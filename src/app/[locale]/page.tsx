import "@/features/home/home-editorial.css";
import { JourneyStory, PlanningSection } from "@/features/home/journey-story";
import type { Metadata } from "next";
import { siteConfig } from "@/config/runtime-site";
import { buildMetadata } from "@/lib/seo";
import { Hero } from "@/features/home/hero";
import { QuickFinder } from "@/features/home/quick-finder";
import { ExploreSection } from "@/features/home/explore-section";
import { FeaturedToursSection } from "@/features/home/featured-tours-section";
import { TrustStrip } from "@/features/home/trust-strip";
import { RegionsSection } from "@/features/home/regions-section";
import { ValuesSection } from "@/features/home/values-section";
import { GuidesSection } from "@/features/home/guides-section";
import { ConsultSection } from "@/features/leads/consult-section";
import { TranslationNotice } from "@/components/layout/translation-notice";
import { getFeaturedTours } from "@/lib/data/tours";
import { tourTranslationStatus } from "@/lib/data/localize";
import { isIndexable } from "@/domain/localization";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";

/**
 * Home page.
 *
 * Section order follows the intended journey:
 *   khám phá → quan tâm → xem tour → gửi yêu cầu.
 *
 * In English the page aggregates tour cards that are still draft translations,
 * so it is kept out of the index until they are reviewed.
 */

async function resolveLocale(
  params: Promise<{ locale: string }>,
): Promise<Locale> {
  const { locale } = await params;
  return isLocale(locale) ? locale : defaultLocale;
}

function homeIndexable(locale: Locale): boolean {
  if (locale === "vi") return true;
  return getFeaturedTours(6, "en").every((tour) =>
    isIndexable(tourTranslationStatus(tour.id, "en"), "en"),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const m = getMessages(locale);
  const indexable = homeIndexable(locale);

  return buildMetadata({
    title: `${siteConfig.name} — ${m.site.tagline}`,
    description: m.site.description,
    path: "/",
    locale,
    noIndex: !indexable,
    hreflang: indexable,
    keywords:
      locale === "vi"
        ? [
            "tour Quy Nhơn Phú Yên",
            "du lịch Quy Nhơn",
            "tour trong nước",
            "cẩm nang du lịch",
          ]
        : ["Quy Nhon Phu Yen tours", "Vietnam tours", "travel guides"],
  });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const m = getMessages(locale);
  const indexable = homeIndexable(locale);

  return (
    <div className="home-editorial">
      {indexable ? null : <TranslationNotice locale={locale} />}
      <Hero locale={locale} />
      <QuickFinder locale={locale} />
      <ExploreSection locale={locale} />
      <FeaturedToursSection locale={locale} />
      <TrustStrip locale={locale} />
      <JourneyStory locale={locale} />
      <RegionsSection locale={locale} />
      <ValuesSection locale={locale} />
      <GuidesSection locale={locale} />
      <PlanningSection locale={locale} />
      <ConsultSection
        locale={locale}
        tone="muted"
        spacing="loose"
        title={m.home.consult.title}
        description={m.home.consult.description}
      />
    </div>
  );
}
