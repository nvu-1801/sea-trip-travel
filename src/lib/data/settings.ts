import { siteConfig } from "@/config/site";
import type { HeroSettings, SiteSettings, SocialSettings } from "@/domain/settings";
import type { ContentSnapshot } from "@/server/repo/types";
import type { Locale } from "@/i18n/config";
import { loadPublishedSnapshot } from "./snapshot";

/**
 * Owner-editable settings, merged over the shipped defaults.
 *
 * The admin can override the hero copy, contact details, social links and the
 * home-page feature selection. Anything not overridden keeps the default from
 * `config/site.ts` / `messages/*.json`, so the site is correct even before the
 * owner opens the admin for the first time.
 */

export type ResolvedSettings = {
  hero: HeroSettings;
  contact: {
    hotline: string;
    hotlineHref: string;
    email: string;
    address: string;
    workingHours: string;
  };
  social: SocialSettings;
  home: SiteSettings["home"];
};

export async function getSiteSettings(
  locale: Locale,
  source?: ContentSnapshot,
): Promise<ResolvedSettings> {
  const snapshot = source ?? (await loadPublishedSnapshot());
  const stored = snapshot.settings[locale] ?? {};

  return {
    hero: stored.hero ?? {},
    contact: {
      hotline: stored.contact?.hotline ?? siteConfig.contact.hotline,
      hotlineHref: stored.contact?.hotlineHref ?? siteConfig.contact.hotlineHref,
      email: stored.contact?.email ?? siteConfig.contact.email,
      address: stored.contact?.address ?? siteConfig.contact.address,
      workingHours: stored.contact?.workingHours ?? siteConfig.contact.workingHours,
    },
    social: {
      facebook: stored.social?.facebook ?? siteConfig.social.facebook,
      zalo: stored.social?.zalo ?? siteConfig.social.zalo,
      instagram: stored.social?.instagram ?? siteConfig.social.instagram,
      tiktok: stored.social?.tiktok ?? siteConfig.social.tiktok,
      youtube: stored.social?.youtube ?? siteConfig.social.youtube,
    },
    home: stored.home,
  };
}
