/**
 * Navigation model — the required menu, in the required order.
 * Single source of truth for the header, the mobile drawer and the footer.
 *
 * Labels are i18n keys (resolved from `src/messages/*.json`), never literal
 * text, so the same structure renders in every language. The `key` values map
 * onto `messages.nav`.
 */

export type NavKey =
  | "home"
  | "quyNhonPhuYen"
  | "quyNhonOneDay"
  | "quyNhonMultiDay"
  | "domestic"
  | "north"
  | "central"
  | "south"
  | "highlands"
  | "guides"
  | "contact"
  | "privacy";

export type NavLink = {
  /** Key into `messages.nav`. */
  labelKey: NavKey;
  href: string;
};

export type NavItem = NavLink & {
  /** Present on parent items that open a dropdown / accordion. */
  children?: readonly NavLink[];
  /** Key into `messages.nav.description` for the mega-panel / accordion line. */
  descriptionKey?: "quyNhonPhuYen" | "domestic";
};

export const ROUTES = {
  home: "/",
  quyNhonPhuYen: "/tour-quy-nhon-phu-yen",
  quyNhonOneDay: "/tour-quy-nhon-phu-yen/tour-quy-nhon-1-ngay",
  quyNhonMultiDay: "/tour-quy-nhon-phu-yen/tour-quy-nhon-dai-ngay",
  domestic: "/tour-trong-nuoc",
  north: "/tour-trong-nuoc/tour-mien-bac",
  central: "/tour-trong-nuoc/tour-mien-trung",
  south: "/tour-trong-nuoc/tour-mien-nam",
  highlands: "/tour-trong-nuoc/tour-tay-nguyen",
  guides: "/cam-nang-du-lich",
  contact: "/lien-he",
  privacy: "/chinh-sach-bao-mat",
} as const;

export const primaryNav: readonly NavItem[] = [
  {
    labelKey: "home",
    href: ROUTES.home,
  },
  {
    labelKey: "quyNhonPhuYen",
    href: ROUTES.quyNhonPhuYen,
    descriptionKey: "quyNhonPhuYen",
    children: [
      { labelKey: "quyNhonOneDay", href: ROUTES.quyNhonOneDay },
      { labelKey: "quyNhonMultiDay", href: ROUTES.quyNhonMultiDay },
    ],
  },
  {
    labelKey: "domestic",
    href: ROUTES.domestic,
    descriptionKey: "domestic",
    children: [
      { labelKey: "north", href: ROUTES.north },
      { labelKey: "central", href: ROUTES.central },
      { labelKey: "south", href: ROUTES.south },
      { labelKey: "highlands", href: ROUTES.highlands },
    ],
  },
  {
    labelKey: "guides",
    href: ROUTES.guides,
  },
  {
    labelKey: "contact",
    href: ROUTES.contact,
  },
] as const;

/** Legal / policy links shown in the footer. */
export const footerLegalNav: readonly NavLink[] = [
  { labelKey: "privacy", href: ROUTES.privacy },
];
