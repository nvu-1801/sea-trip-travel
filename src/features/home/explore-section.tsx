import Link from "next/link";
import {
  getHomeExploreDestinations,
  homeDestinationHref,
} from "@/lib/data/destinations";
import { Container, Section } from "@/components/ui/layout";
import { SectionEyebrow } from "@/components/ui/section-eyebrow";
import { RevealGroup } from "@/components/ui/reveal";
import { MaskedHeading } from "@/components/motion/word-reveal";
import { DepthItem, DepthStage } from "@/components/motion/depth-stage";
import { TiltCard } from "@/components/motion/tilt-card";
import { AssetImage } from "@/components/ui/asset-image";
import type { Locale } from "@/i18n/config";
import { landingSections } from "@/server/cms/store";
import { localizePath } from "@/i18n/routing";

export function ExploreSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  let copy = {
    eyebrow: en ? "01 / THE COAST IS CALLING" : "01 / CÓ HẸN VỚI BIỂN",
    titleA: en ? "A little closer to" : "Chạm vào một miền",
    titleB: en ? "somewhere beautiful." : "bình yên rất khác.",
    body: en
      ? "Rocky headlands, quiet fishing villages and turquoise bays. Start with a place that makes you want to slow down."
      : "Qua những cung đường ôm biển, ghé làng chài nhỏ, để một ngày trôi theo nhịp sóng. Chọn nơi khiến bạn muốn dừng chân lâu hơn một chút.",
    footnote: en ? "Your pace. Your kind of journey." : "Đi chậm một chút. Nhớ lâu một chút.",
  };
  try {
    const s = landingSections().explore;
    copy = {
      eyebrow: (en ? s.eyebrowEn || s.eyebrow : s.eyebrow) || copy.eyebrow,
      titleA: (en ? s.titleAEn || s.titleA : s.titleA) || copy.titleA,
      titleB: (en ? s.titleBEn || s.titleB : s.titleB) || copy.titleB,
      body: (en ? s.bodyEn || s.body : s.body) || copy.body,
      footnote: (en ? s.footnoteEn || s.footnote : s.footnote) || copy.footnote,
    };
  } catch {
    // fallback
  }
  // Selection is explicit: the owner enables up to three destinations in
  // Studio. A missing photo is not a reason to hide a card — AssetImage renders
  // the branded placeholder instead.
  const destinations = getHomeExploreDestinations(locale);
  if (!destinations.length) return null;
  return (
    <Section className="journal-explore">
      <Container>
        <RevealGroup className="journal-heading">
          <div>
            <SectionEyebrow className="journal-eyebrow">{copy.eyebrow}</SectionEyebrow>
            <MaskedHeading
              lines={[
                { text: copy.titleA },
                { text: copy.titleB, emphasis: true },
              ]}
            />
          </div>
          <p>{copy.body}</p>
        </RevealGroup>
        <DepthStage className="destination-editorial" count={destinations.length}>
          {destinations.map((destination, index) => (
            <DepthItem
              key={destination.id}
              className="destination-editorial-item"
              level={((index % 3) + 1) as 1 | 2 | 3}
            >
              <TiltCard>
                <Link
                  href={homeDestinationHref(destination, locale)}
                  className="destination-editorial-card"
                >
                  <AssetImage
                    image={destination.image}
                    className="destination-editorial-photo"
                    sizes="(max-width: 700px) 100vw, 55vw"
                    parallax
                    unveil={index === 0}
                  />
                  <div className="destination-editorial-copy">
                    <span className="destination-number">
                      0{index + 1} / {en ? "DISCOVER" : "KHÁM PHÁ"}
                    </span>
                    <h3>{destination.name}</h3>
                    <p>{destination.summary}</p>
                    <span className="destination-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </div>
                </Link>
              </TiltCard>
            </DepthItem>
          ))}
        </DepthStage>
        <div className="journal-footnote">
          <span>{copy.footnote}</span>
          <Link href={localizePath(locale, "/tour-quy-nhon-phu-yen")}>
            {en
              ? "Explore Quy Nhon – Phu Yen"
              : "Khám phá tuyến Quy Nhơn – Phú Yên"}{" "}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
