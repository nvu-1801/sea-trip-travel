import { homeHero, settings } from "@/server/cms/store";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { CollageHero } from "./collage-hero";
import { HeroCarousel } from "./hero-carousel";
import type { HeroCopy } from "./hero-copy";
import "./hero.css";

export function Hero({ locale }: { locale: Locale }) {
  const config = homeHero();
  const messages = getMessages(locale).home.hero;
  const custom = config[locale];
  const copy: HeroCopy = {
    badge: custom.badge || messages.badge,
    titleLine1: custom.titleLine1 || messages.titleLine1,
    titleLine2: custom.titleLine2 || messages.titleLine2,
    description: custom.description || messages.lead,
    primaryLabel: custom.primaryLabel || messages.ctaTours,
    secondaryLabel: custom.secondaryLabel || messages.ctaConsult,
  };
  return config.mode === "collage" ? (
    <CollageHero locale={locale} config={config} copy={copy} />
  ) : (
    <HeroCarousel
      key={JSON.stringify(config)}
      config={config}
      copy={copy}
      locale={locale}
      motionEnabled={settings().motion}
    />
  );
}
