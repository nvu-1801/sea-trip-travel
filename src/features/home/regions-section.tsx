import Link from "next/link";
import { ROUTES } from "@/config/navigation";
import {
  getCategories,
  getChildCategories,
  getCategoryTourCount,
} from "@/lib/data/categories";
import { Container, Section } from "@/components/ui/layout";
import { AssetImage } from "@/components/ui/asset-image";
import { Reveal } from "@/components/ui/reveal";
import type { Locale } from "@/i18n/config";
import { landingSections } from "@/server/cms/store";
import { localizePath } from "@/i18n/routing";

export function RegionsSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  let copy = {
    eyebrow: en ? "03 / A LITTLE FURTHER" : "03 / ĐI XA HƠN MỘT CHÚT",
    titleA: en ? "One country." : "Một Việt Nam.",
    titleB: en ? "Endless discoveries." : "Muôn điều để nhớ.",
    intro: en
      ? "From mountain mornings to coastal afternoons, find a different rhythm in every region."
      : "Từ sớm mai nơi núi cao đến chiều lộng gió bên bờ biển. Mỗi miền đất là một cách khác để yêu những chuyến đi.",
  };
  let moods = en
    ? ["Mountains & heritage", "Coast & ancient towns", "Islands & waterways", "Pines & highland mornings"]
    : ["Non nước & di sản", "Biển xanh & phố cổ", "Đảo ngọc & sông nước", "Rừng thông & sớm cao nguyên"];
  try {
    const s = landingSections().regions;
    copy = {
      eyebrow: (en ? s.eyebrowEn || s.eyebrow : s.eyebrow) || copy.eyebrow,
      titleA: (en ? s.titleAEn || s.titleA : s.titleA) || copy.titleA,
      titleB: (en ? s.titleBEn || s.titleB : s.titleB) || copy.titleB,
      intro: (en ? s.introEn || s.intro : s.intro) || copy.intro,
    };
    const m = en && s.moodsEn.length ? s.moodsEn : s.moods;
    if (m.length) moods = m;
  } catch {
    // fallback
  }
  const domestic = getCategories(locale).find(
    (c) => c.path === ROUTES.domestic,
  );
  if (!domestic) return null;
  return (
    <Section id="kham-pha-vung-mien" className="journal-regions">
      <Container>
        <div className="regions-editorial">
          <Reveal className="regions-heading">
            <p className="journal-eyebrow">{copy.eyebrow}</p>
            <h2>
              {copy.titleA}
              <br />
              <em>{copy.titleB}</em>
            </h2>
            <p className="regions-intro">{copy.intro}</p>
            <Link
              className="journal-text-link"
              href={localizePath(locale, ROUTES.domestic)}
            >
              {en ? "All domestic journeys" : "Xem hành trình trong nước"} ↗
            </Link>
          </Reveal>
          <ol className="region-postcards">
            {getChildCategories(domestic.id, locale).map((region, i) => (
              <Reveal as="li" key={region.id}>
                <Link
                  className="region-postcard"
                  href={localizePath(locale, region.path)}
                >
                  <AssetImage
                    image={region.image}
                    altFallback={region.name}
                    className="region-postcard-photo"
                    sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 25vw"
                  />
                  <span className="region-postcard-top">
                    <span>
                      0{i + 1} / {en ? "VIETNAM" : "VIỆT NAM"}
                    </span>
                    <span>
                      {getCategoryTourCount(region.id)}{" "}
                      {en ? "journeys" : "hành trình"}
                    </span>
                  </span>
                  <div className="region-postcard-copy">
                    <p className="region-postcard-mood">{moods[i] ?? moods[0]}</p>
                    <h3>{region.name.replace(/^Tour /, "")}</h3>
                    <p>{region.tagline ?? region.description}</p>
                    <span className="region-postcard-cta">
                      {en ? "Explore this region" : "Khám phá miền đất này"}
                      <span aria-hidden="true">↗</span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  );
}
