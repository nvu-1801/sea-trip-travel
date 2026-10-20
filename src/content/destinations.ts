import type { DestinationInput } from "@/domain/destination";

/**
 * Destination reference data.
 *
 * All entries are `contentStatus: "demo"`: the place names and regions are
 * real, but the one-line summaries are placeholder editorial copy that the
 * owner must review. Destination photographs and their open licences are listed
 * in public/image-credits.html. Existing supplied photos are retained.
 */
export const destinations: readonly DestinationInput[] = [
  // --- Quy Nhơn – Phú Yên (tuyến trọng tâm) --------------------------------
  {
    id: "dest_quy_nhon",
    slug: "quy-nhon",
    name: "Quy Nhơn",
    province: "Gia Lai",
    region: "quy-nhon-phu-yen",
    summary:
      "Thành phố biển miền Trung với bãi cát dài, hải sản tươi và nhịp sống chậm rãi.",
    image: {
      src: "/images/tours/be29f9c7f7008249.jpeg",
      alt: "Bãi đá Hoàng Hậu",
      width: 443,
      height: 296,
    },
    order: 1,
    contentStatus: "demo",
  },
  {
    id: "dest_ky_co_eo_gio",
    slug: "ky-co-eo-gio",
    name: "Kỳ Co – Eo Gió",
    province: "Gia Lai",
    region: "quy-nhon-phu-yen",
    summary:
      "Cặp điểm đến nổi tiếng nhất Quy Nhơn: nước xanh trong và cung đường ven biển đá.",
    image: {
      src: "/images/tours/d7233006cc4fd0f9.jpeg",
      alt: "Bãi biển Kỳ Co",
      width: 596,
      height: 336,
    },
    order: 2,
    contentStatus: "demo",
  },
  {
    id: "dest_hon_kho",
    slug: "hon-kho",
    name: "Hòn Khô",
    province: "Gia Lai",
    region: "quy-nhon-phu-yen",
    summary:
      "Đảo nhỏ gần bờ, thích hợp cho hoạt động lặn ngắm san hô trong ngày.",
    image: {
      src: "/images/destinations/hon-kho.jpg",
      alt: "Bờ biển làng chài Nhơn Hải trên tuyến tham quan Hòn Khô",
    },
    order: 3,
    contentStatus: "demo",
  },
  {
    id: "dest_cu_lao_xanh",
    slug: "cu-lao-xanh",
    name: "Cù Lao Xanh",
    province: "Gia Lai",
    region: "quy-nhon-phu-yen",
    summary:
      "Hòn đảo yên bình ngoài khơi, nổi bật với ngọn hải đăng và làng chài.",
    image: {
      src: "/images/tours/afdf37ef08e566b9.png",
      alt: "Đảo Cù Lao Xanh",
      width: 582,
      height: 327,
    },
    order: 4,
    contentStatus: "demo",
  },
  {
    id: "dest_ghenh_da_dia",
    slug: "ghenh-da-dia",
    name: "Ghềnh Đá Đĩa",
    province: "Phú Yên",
    region: "quy-nhon-phu-yen",
    summary:
      "Khối đá bazan hình cột xếp lớp độc đáo, biểu tượng địa chất của Phú Yên.",
    image: {
      src: "/images/tours/e58a823508e08a30.jpeg",
      alt: "Ghềnh Đá Đĩa",
      width: 470,
      height: 327,
    },
    order: 5,
    contentStatus: "demo",
  },
  {
    id: "dest_bai_xep",
    slug: "bai-xep",
    name: "Bãi Xép",
    province: "Phú Yên",
    region: "quy-nhon-phu-yen",
    summary:
      "Bãi biển nhỏ với hai phiến đá nhô ra biển, gắn với một bộ phim nổi tiếng.",
    image: {
      src: "/images/destinations/bai-xep.jpg",
      alt: "Bãi Xép, An Chấn, Phú Yên",
    },
    order: 6,
    contentStatus: "demo",
  },
  {
    id: "dest_mui_dien",
    slug: "mui-dien",
    name: "Mũi Điện – Đại Lãnh",
    province: "Phú Yên",
    region: "quy-nhon-phu-yen",
    summary: "Điểm đón ánh bình minh sớm nhất trên đất liền Việt Nam.",
    image: {
      src: "/images/destinations/mui-dien.jpg",
      alt: "Hải đăng Mũi Đại Lãnh, Phú Yên",
    },
    order: 7,
    contentStatus: "demo",
  },
  {
    id: "dest_dam_o_loan",
    slug: "dam-o-loan",
    name: "Đầm Ô Loan",
    province: "Phú Yên",
    region: "quy-nhon-phu-yen",
    summary: "Đầm nước lợ rộng, nổi tiếng với sò huyết và cảnh quan bình yên.",
    image: {
      src: "/images/destinations/dam-o-loan.jpg",
      alt: "Đầm Ô Loan, Phú Yên",
    },
    order: 8,
    contentStatus: "demo",
  },

  // --- Miền Bắc -------------------------------------------------------------
  {
    id: "dest_ha_noi",
    slug: "ha-noi",
    name: "Hà Nội",
    province: "Hà Nội",
    region: "mien-bac",
    summary: "Thủ đô với phố cổ, hồ và lớp trầm tích văn hóa dày.",
    image: {
      src: "/images/destinations/ha-noi.jpg",
      alt: "Hồ Hoàn Kiếm, Hà Nội",
    },
    order: 1,
    contentStatus: "demo",
  },
  {
    id: "dest_vinh_ha_long",
    slug: "vinh-ha-long",
    name: "Vịnh Hạ Long",
    province: "Quảng Ninh",
    region: "mien-bac",
    summary:
      "Di sản thiên nhiên thế giới với hàng nghìn đảo đá vôi trên mặt nước.",
    image: {
      src: "/images/destinations/ha-long.jpg",
      alt: "Vịnh Hạ Long nhìn từ đảo Ti Tốp",
    },
    order: 2,
    contentStatus: "demo",
  },
  {
    id: "dest_sapa",
    slug: "sa-pa",
    name: "Sa Pa",
    province: "Lào Cai",
    region: "mien-bac",
    summary: "Thị trấn vùng cao với ruộng bậc thang và khí hậu mát quanh năm.",
    image: {
      src: "/images/destinations/sa-pa.jpg",
      alt: "Ruộng bậc thang và núi ở Sa Pa",
    },
    order: 3,
    contentStatus: "demo",
  },
  {
    id: "dest_ninh_binh",
    slug: "ninh-binh",
    name: "Ninh Bình",
    province: "Ninh Bình",
    region: "mien-bac",
    summary:
      "Núi đá vôi, sông nhỏ và những cánh đồng lúa đặc trưng đồng bằng Bắc Bộ.",
    image: {
      src: "/images/destinations/ninh-binh.jpg",
      alt: "Cảnh quan Tràng An, Ninh Bình",
    },
    order: 4,
    contentStatus: "demo",
  },

  // --- Miền Trung -----------------------------------------------------------
  {
    id: "dest_da_nang",
    slug: "da-nang",
    name: "Đà Nẵng",
    province: "Đà Nẵng",
    region: "mien-trung",
    summary: "Thành phố biển hiện đại, cửa ngõ tới Hội An và Bà Nà Hills.",
    image: {
      src: "/images/destinations/da-nang.jpg",
      alt: "Cầu Rồng bắc qua sông Hàn, Đà Nẵng",
    },
    order: 1,
    contentStatus: "demo",
  },
  {
    id: "dest_hoi_an",
    slug: "hoi-an",
    name: "Hội An",
    province: "Quảng Nam",
    region: "mien-trung",
    summary: "Phố cổ đèn lồng, di sản văn hóa thế giới bên bờ sông Hoài.",
    image: {
      src: "/images/destinations/hoi-an.jpg",
      alt: "Phố cổ Hội An bên sông Hoài",
    },
    order: 2,
    contentStatus: "demo",
  },
  {
    id: "dest_hue",
    slug: "hue",
    name: "Huế",
    province: "Huế",
    region: "mien-trung",
    summary: "Cố đô với đại nội, lăng tẩm và ẩm thực cung đình.",
    image: {
      src: "/images/destinations/hue.jpg",
      alt: "Ngọ Môn, Hoàng thành Huế",
    },
    order: 3,
    contentStatus: "demo",
  },

  // --- Miền Nam -------------------------------------------------------------
  {
    id: "dest_phu_quoc",
    slug: "phu-quoc",
    name: "Phú Quốc",
    province: "Kiên Giang",
    region: "mien-nam",
    summary: "Đảo lớn nhất Việt Nam với bãi cát trắng và rừng quốc gia.",
    image: {
      src: "/images/destinations/phu-quoc.jpg",
      alt: "Bãi biển Phú Quốc",
    },
    order: 1,
    contentStatus: "demo",
  },
  {
    id: "dest_mien_tay",
    slug: "mien-tay",
    name: "Miền Tây – Cần Thơ",
    province: "Cần Thơ",
    region: "mien-nam",
    summary: "Chợ nổi, vườn trái cây và hệ thống sông nước Cửu Long.",
    image: {
      src: "/images/destinations/mien-tay.jpg",
      alt: "Thuyền hàng trên chợ nổi Cái Răng, Cần Thơ",
    },
    order: 2,
    contentStatus: "demo",
  },

  // --- Tây Nguyên -----------------------------------------------------------
  {
    id: "dest_da_lat",
    slug: "da-lat",
    name: "Đà Lạt",
    province: "Lâm Đồng",
    region: "tay-nguyen",
    summary: "Thành phố cao nguyên với đồi thông, hồ và khí hậu se lạnh.",
    image: {
      src: "/images/destinations/da-lat.jpg",
      alt: "Hồ Xuân Hương nhìn từ Dalat Palace",
    },
    order: 1,
    contentStatus: "demo",
  },
  {
    id: "dest_buon_ma_thuot",
    slug: "buon-ma-thuot",
    name: "Buôn Ma Thuột",
    province: "Đắk Lắk",
    region: "tay-nguyen",
    summary: "Thủ phủ cà phê với thác nước và văn hóa cồng chiêng.",
    image: {
      src: "/images/destinations/buon-ma-thuot.jpg",
      alt: "Thác Đray Nur, Đắk Lắk",
    },
    order: 2,
    contentStatus: "demo",
  },
] as const;
