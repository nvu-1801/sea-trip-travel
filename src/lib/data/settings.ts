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

  // Vietnamese is the source of truth for everything that is *not* language
  // specific: one hotline, one set of social links, one featured selection. Only
  // the hero copy is edited per language, so an English page still shows the
  // hotline the owner typed in Vietnamese instead of the shipped default.
  const shared = snapshot.settings.vi ?? {};
  const perLocale = snapshot.settings[locale] ?? {};

  // Hero copy is language specific: an English page must fall back to the English
  // catalog default, never to the Vietnamese override.
  const hero = perLocale.hero ?? {};
  const contact = shared.contact ?? {};
  const social = shared.social ?? {};
  const home = shared.home ?? perLocale.home;

  return {
    hero,
    contact: {
      hotline: contact.hotline ?? siteConfig.contact.hotline,
      hotlineHref: contact.hotlineHref ?? siteConfig.contact.hotlineHref,
      email: contact.email ?? siteConfig.contact.email,
      address: contact.address ?? siteConfig.contact.address,
      workingHours: contact.workingHours ?? siteConfig.contact.workingHours,
    },
    social: {
      facebook: social.facebook ?? siteConfig.social.facebook,
      zalo: social.zalo ?? siteConfig.social.zalo,
      instagram: social.instagram ?? siteConfig.social.instagram,
      tiktok: social.tiktok ?? siteConfig.social.tiktok,
      youtube: social.youtube ?? siteConfig.social.youtube,
    },
    home,
  };
}
