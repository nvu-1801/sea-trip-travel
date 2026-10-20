import Link from "next/link";
import { getDestinationsByRegion } from "@/lib/data/destinations";
import { Container, Section } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
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
  const destinations = getDestinationsByRegion("quy-nhon-phu-yen", locale)
    .filter((d) => d.image?.src)
    .slice(0, 3);
  return (
    <Section className="journal-explore">
      <Container>
        <Reveal className="journal-heading">
          <div>
            <p className="journal-eyebrow">{copy.eyebrow}</p>
            <h2>
              {copy.titleA}
              <br />
              <em>{copy.titleB}</em>
            </h2>
          </div>
          <p>{copy.body}</p>
        </Reveal>
        <div className="destination-editorial">
          {destinations.map((destination, index) => (
            <Reveal key={destination.id} className="destination-editorial-item">
              <Link
                href={`${localizePath(locale, "/tim-tour")}?q=${encodeURIComponent(destination.name.split(" – ")[0])}`}
                className="destination-editorial-card"
              >
                <AssetImage
                  image={destination.image}
                  className="destination-editorial-photo"
                  sizes="(max-width: 700px) 100vw, 55vw"
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
            </Reveal>
          ))}
        </div>
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
