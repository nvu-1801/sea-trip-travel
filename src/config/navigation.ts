/**
 * Navigation model — the required menu, in the required order.
 * Single source of truth for the header, the mobile drawer and the footer.
 */

export type NavLink = {
  label: string;
  href: string;
};

export type NavItem = NavLink & {
  /** Present on parent items that open a dropdown / accordion. */
  children?: readonly NavLink[];
  /** Short line used by the desktop mega-panel and mobile accordion. */
  description?: string;
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
    label: "Trang chủ",
    href: ROUTES.home,
  },
  {
    label: "Tour Quy Nhơn - Phú Yên",
    href: ROUTES.quyNhonPhuYen,
    description: "Tuyến tour trọng tâm của SEA TRIP",
    children: [
      { label: "Tour Quy Nhơn 1 Ngày", href: ROUTES.quyNhonOneDay },
      { label: "Tour Quy Nhơn dài Ngày", href: ROUTES.quyNhonMultiDay },
    ],
  },
  {
    label: "Tour Trong Nước",
    href: ROUTES.domestic,
    description: "Chọn lọc theo từng vùng miền",
    children: [
      { label: "Tour Miền Bắc", href: ROUTES.north },
      { label: "Tour Miền Trung", href: ROUTES.central },
      { label: "Tour Miền Nam", href: ROUTES.south },
      { label: "Tour Tây Nguyên", href: ROUTES.highlands },
    ],
  },
  {
    label: "Cẩm Nang Du Lịch",
    href: ROUTES.guides,
  },
  {
    label: "Liên Hệ",
    href: ROUTES.contact,
  },
] as const;

/** Legal / policy links shown in the footer. */
export const footerLegalNav: readonly NavLink[] = [
  { label: "Chính sách bảo mật", href: ROUTES.privacy },
];

/** Categories acknowledged but intentionally out of MVP scope. */
export const OUT_OF_SCOPE = [
  "Đặt tour trực tuyến",
  "Thanh toán",
  "Tài khoản khách hàng",
  "Vé máy bay / khách sạn",
] as const;
