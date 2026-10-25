import { homeHero, settings } from "@/server/cms/store";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { CollageHero } from "./collage-hero";
import { HeroCarousel } from "./hero-carousel";
import type { HeroCopy } from "./hero-copy";
import "./hero.css";

/**
 * Keep only the first kicker label.
 *
 * Older copy used a middle dot (`Du lịch trong nước · Chọn lọc`) and the design
 * has moved to a single kicker, so the separator and everything after it are
 * dropped instead of being re-inserted.
 */
function primaryBadge(value: string): string {
  return (
    value
      .split(/\s*[·•]\s*/)[0]
      ?.replace(/^[\s—–-]+/, "")
      .trim() ?? ""
  );
}

/**
 * House style: the hero lead is a fragment, not a sentence, so it carries no
 * closing full stop. CMS copy still arrives with one.
 */
function trimClosingPeriod(value: string): string {
  return value.replace(/[\s.]*\.\s*$/, "").trim();
}

export function Hero({ locale }: { locale: Locale }) {
  const config = homeHero();
  const all = getMessages(locale);
  const messages = all.home.hero;
  const custom = config[locale];
  const copy: HeroCopy = {
    badge: primaryBadge(custom.badge || messages.badge),
    titleLine1: custom.titleLine1 || messages.titleLine1,
    titleLine2: custom.titleLine2 || messages.titleLine2,
    description: trimClosingPeriod(custom.description || messages.lead),
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
      scrollCue={all.common.scrollCue}
    />
  );
}
