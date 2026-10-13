import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { Hero } from "@/features/home/hero";
import { ExploreSection } from "@/features/home/explore-section";
import { FeaturedToursSection } from "@/features/home/featured-tours-section";
import { RegionsSection } from "@/features/home/regions-section";
import { ValuesSection } from "@/features/home/values-section";
import { GuidesSection } from "@/features/home/guides-section";
import { ConsultSection } from "@/features/leads/consult-section";

/**
 * Home page.
 *
 * Section order follows the intended journey:
 *   khám phá → quan tâm → xem tour → gửi yêu cầu.
 */
export const metadata: Metadata = buildMetadata({
  title: `${siteConfig.name} — Chọn lọc điểm đến, nâng tầm trải nghiệm`,
  description: siteConfig.description,
  path: "/",
  keywords: [
    "tour Quy Nhơn Phú Yên",
    "du lịch Quy Nhơn",
    "tour trong nước",
    "cẩm nang du lịch",
  ],
});

export default function HomePage() {
  return (
    <>
      <Hero />
      <ExploreSection />
      <FeaturedToursSection />
      <RegionsSection />
      <ValuesSection />
      <GuidesSection />
      <ConsultSection
        tone="muted"
        spacing="loose"
        title="Bạn đang nghĩ tới chuyến đi nào?"
        description="Để lại vài thông tin, SEA TRIP sẽ gợi ý điểm đến, thời điểm và phương án phù hợp — hoàn toàn miễn phí."
      />
    </>
  );
}
