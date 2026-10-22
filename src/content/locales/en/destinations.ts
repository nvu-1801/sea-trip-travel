import type { DestinationTranslationInput } from "@/domain/localization";

/**
 * DRAFT English translations for destinations.
 *
 * Keyed by the SOURCE record `id` (not the slug). `translationStatus: "draft"`
 * means this copy is machine-written and must be reviewed before indexing.
 */
export const destinationTranslations: Readonly<
  Record<string, DestinationTranslationInput>
> = {
  dest_quy_nhon: {
    translationStatus: "draft",
    name: "Quy Nhon",
    province: "Gia Lai",
    summary:
      "A Central Vietnam coastal city with long sandy beaches, fresh seafood, and a slow pace of life.",
    imageAlt: "Panoramic view of Quy Nhon Bay from above",
  },

  dest_ky_co_eo_gio: {
    translationStatus: "draft",
    name: "Ky Co – Eo Gio",
    province: "Gia Lai",
    summary:
      "Quy Nhon's most famous pair of destinations: clear blue water and a rocky coastal road.",
    imageAlt: "Ky Co beach with turquoise water",
  },

  dest_hon_kho: {
    translationStatus: "draft",
    name: "Hon Kho",
    province: "Gia Lai",
    summary:
      "A small island close to shore, ideal for a day of coral snorkelling.",
    imageAlt: "Nhon Hai fishing village on the Hon Kho route",
  },

  dest_cu_lao_xanh: {
    translationStatus: "draft",
    name: "Cu Lao Xanh",
    province: "Gia Lai",
    summary:
      "A peaceful offshore island, notable for its lighthouse and fishing village.",
    imageAlt: "Cu Lao Xanh island and its lighthouse",
  },

  dest_ghenh_da_dia: {
    translationStatus: "draft",
    name: "Ghenh Da Dia",
    province: "Phu Yen",
    summary:
      "A striking formation of layered basalt columns, Phu Yen's geological emblem.",
    imageAlt: "Layered basalt columns at Ghenh Da Dia",
  },

  dest_bai_xep: {
    translationStatus: "draft",
    name: "Bai Xep",
    province: "Phu Yen",
    summary:
      "A small beach with two rocky slabs jutting into the sea, made famous by a well-known film.",
    imageAlt: "Bai Xep beach in An Chan, Phu Yen",
  },

  dest_mui_dien: {
    translationStatus: "draft",
    name: "Mui Dien – Dai Lanh",
    province: "Phu Yen",
    summary:
      "The point that sees the earliest sunrise on the Vietnamese mainland.",
    imageAlt: "Dai Lanh lighthouse, Phu Yen",
  },

  dest_dam_o_loan: {
    translationStatus: "draft",
    name: "O Loan Lagoon",
    province: "Phu Yen",
    summary:
      "A wide brackish lagoon, known for its blood cockles and tranquil scenery.",
    imageAlt: "O Loan Lagoon, Phu Yen",
  },

  dest_ha_noi: {
    translationStatus: "draft",
    name: "Hanoi",
    province: "Hanoi",
    summary:
      "The capital, with its Old Quarter, lakes, and deep layers of culture.",
    imageAlt: "Hoan Kiem Lake, Hanoi",
  },

  dest_vinh_ha_long: {
    translationStatus: "draft",
    name: "Ha Long Bay",
    province: "Quang Ninh",
    summary:
      "A World Natural Heritage site with thousands of limestone islands rising from the water.",
    imageAlt: "Ha Long Bay seen from Ti Top Island",
  },

  dest_sapa: {
    translationStatus: "draft",
    name: "Sa Pa",
    province: "Lao Cai",
    summary:
      "A highland town with rice terraces and a cool climate year-round.",
    imageAlt: "Rice terraces and mountains in Sa Pa",
  },

  dest_ninh_binh: {
    translationStatus: "draft",
    name: "Ninh Binh",
    province: "Ninh Binh",
    summary:
      "Limestone mountains, small rivers, and rice fields typical of the northern delta.",
    imageAlt: "Trang An landscape, Ninh Binh",
  },

  dest_da_nang: {
    translationStatus: "draft",
    name: "Da Nang",
    province: "Da Nang",
    summary: "A modern coastal city, the gateway to Hoi An and Ba Na Hills.",
    imageAlt: "Dragon Bridge over the Han River, Da Nang",
  },

  dest_hoi_an: {
    translationStatus: "draft",
    name: "Hoi An",
    province: "Quang Nam",
    summary:
      "A lantern-lit old town and World Cultural Heritage site on the banks of the Hoai River.",
    imageAlt: "Hoi An Ancient Town beside the river",
  },

  dest_hue: {
    translationStatus: "draft",
    name: "Hue",
    province: "Hue",
    summary:
      "The former imperial capital, with its citadel, royal tombs, and royal cuisine.",
    imageAlt: "Meridian Gate at the Hue Citadel",
  },

  dest_phu_quoc: {
    translationStatus: "draft",
    name: "Phu Quoc",
    province: "Kien Giang",
    summary:
      "Vietnam's largest island, with white-sand beaches and a national park.",
    imageAlt: "Phu Quoc beach",
  },

  dest_mien_tay: {
    translationStatus: "draft",
    name: "Mekong Delta – Can Tho",
    province: "Can Tho",
    summary:
      "Floating markets, fruit orchards, and the waterways of the Mekong.",
    imageAlt: "Boats at Cai Rang floating market, Can Tho",
  },

  dest_da_lat: {
    translationStatus: "draft",
    name: "Da Lat",
    province: "Lam Dong",
    summary: "A highland city with pine hills, lakes, and a cool climate.",
    imageAlt: "Xuan Huong Lake seen from Dalat Palace",
  },

  dest_buon_ma_thuot: {
    translationStatus: "draft",
    name: "Buon Ma Thuot",
    province: "Dak Lak",
    summary: "The coffee capital, with waterfalls and gong culture.",
    imageAlt: "Dray Nur waterfall, Dak Lak",
  },
};
