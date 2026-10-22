import type { CategoryTranslationInput } from "@/domain/localization";

/**
 * DRAFT English translations for tour categories.
 *
 * Keyed by the SOURCE record `id` (not the slug). `translationStatus: "draft"`
 * means this copy is machine-written and must be reviewed before indexing.
 */
export const categoryTranslations: Readonly<
  Record<string, CategoryTranslationInput>
> = {
  cat_quy_nhon_phu_yen: {
    translationStatus: "draft",
    name: "Quy Nhon - Phu Yen Tours",
    tagline: "Our flagship route, carefully curated by SEA TRIP",
    description:
      "Quy Nhon – Phu Yen is the flagship route of SEA TRIP TRAVEL: blue seas, basalt rock, lighthouses, and Central Vietnam seafood. The tours below are grouped by duration so you can pick quickly based on how much time you have.",
  },

  cat_quy_nhon_1_ngay: {
    translationStatus: "draft",
    name: "Quy Nhon 1-Day Tours",
    tagline: "Ideal for short schedules, departing and returning the same day",
    description:
      "Day tours for travellers with limited time: focused on a single main cluster such as Ky Co – Eo Gio, Hon Kho, or Cu Lao Xanh, departing and finishing the same day.",
  },

  cat_quy_nhon_dai_ngay: {
    translationStatus: "draft",
    name: "Quy Nhon Multi-Day Tours",
    tagline: "Combine Quy Nhon with Phu Yen over 2–5 days",
    description:
      "Multi-day tours combine Quy Nhon and Phu Yen in a single journey, with overnight stays and a more relaxed pace for sightseeing.",
  },

  cat_tour_trong_nuoc: {
    translationStatus: "draft",
    name: "Vietnam Tours",
    tagline: "Curated by four regions",
    description:
      "The domestic tour catalogue is divided by region so it is easy to picture each journey and choose the right season. Each region features popular routes lasting from 2 to 5 days.",
  },

  cat_mien_bac: {
    translationStatus: "draft",
    name: "Northern Vietnam Tours",
    tagline: "Hanoi, Ha Long Bay, Sa Pa, Ninh Binh",
    description:
      "Northern Vietnam suits cultural journeys combined with limestone scenery: Hanoi's Old Quarter, Ha Long Bay, the Sa Pa rice terraces, and the Ninh Binh complex.",
  },

  cat_mien_trung: {
    translationStatus: "draft",
    name: "Central Vietnam Tours",
    tagline: "Da Nang, Hoi An, Hue",
    description:
      "Central Vietnam is the heritage route: Da Nang – Hoi An – Hue are conveniently linked by road, suiting both relaxation and cultural discovery.",
  },

  cat_mien_nam: {
    translationStatus: "draft",
    name: "Southern Vietnam Tours",
    tagline: "Phu Quoc and the waterways of the Mekong Delta",
    description:
      "Southern Vietnam has two main directions: island and beach leisure in Phu Quoc, and exploring the Mekong Delta waterways with their floating markets and fruit orchards.",
  },

  cat_tay_nguyen: {
    translationStatus: "draft",
    name: "Central Highlands Tours",
    tagline: "Da Lat, Buon Ma Thuot",
    description:
      "The Central Highlands offers a cool plateau climate: Da Lat with its pine hills and lakes, and Buon Ma Thuot with its coffee, waterfalls, and gong culture.",
  },
};
