/**
 * SEO copy for the pages the owner asked us to target.
 *
 * These are defaults only: a non-empty `seo.title` / `seo.description` saved in
 * the CMS always wins. New installs also write the category/tour values into
 * the seed records, while the existing production database can be updated with
 * `scripts/apply-seo-content.ts` (dry-run by default, never overwrites an
 * edited field).
 */

export const HOME_SEO = {
  vi: {
    title: "Du lịch Quy Nhơn Phú Yên | SEA TRIP TRAVEL",
    description:
      "Khám phá Quy Nhơn – Phú Yên cùng SEA TRIP TRAVEL. Tham khảo tour Kỳ Co – Eo Gió, Hòn Khô, Ghềnh Đá Đĩa và lịch trình phù hợp cho chuyến đi của bạn.",
  },
  en: {
    title: "Quy Nhon – Phu Yen Travel | SEA TRIP TRAVEL",
    description:
      "Explore Quy Nhon and Phu Yen with SEA TRIP TRAVEL. Compare Ky Co – Eo Gio, Hon Kho and Ghenh Da Dia tours, with itineraries that fit your time.",
  },
} as const;

type SeoDefault = { title: string; description: string };

/** Category defaults keyed by the stable category id (not the public URL). */
export const CATEGORY_SEO: Record<string, SeoDefault> = {
  cat_quy_nhon_phu_yen: {
    title: "Tour Quy Nhơn Phú Yên trọn gói: lịch trình & lựa chọn",
    description:
      "Chọn tour Quy Nhơn – Phú Yên theo thời gian: 1 ngày cho Kỳ Co – Eo Gió, Hòn Khô; 3–5 ngày ghép Quy Nhơn với Phú Yên. Xem lịch trình, điểm đón và dịch vụ thực tế trước khi liên hệ.",
  },
  cat_quy_nhon_1_ngay: {
    title: "Tour Quy Nhơn 1 ngày: Kỳ Co, Hòn Khô, Cù Lao Xanh",
    description:
      "Tour trong ngày từ Quy Nhơn: Kỳ Co – Eo Gió, Hòn Khô lặn biển, Cù Lao Xanh hoặc Phú Yên. So sánh thời gian, điểm đón và dịch vụ của từng tour.",
  },
  cat_quy_nhon_dai_ngay: {
    title: "Tour Quy Nhơn Phú Yên 3–5 ngày: lịch trình & điểm đón",
    description:
      "Tour Quy Nhơn – Phú Yên 3 ngày 2 đêm, 4 ngày 3 đêm hoặc 5 ngày 4 đêm, có Kỳ Co – Eo Gió, Ghềnh Đá Đĩa và đầm Ô Loan. So sánh lịch trình, điểm đón và dịch vụ.",
  },
  cat_tour_trong_nuoc: {
    title: "Tour trong nước: biển miền Trung, miền Bắc, miền Nam",
    description:
      "Tour trong nước chọn lọc theo vùng: biển miền Trung, miền Bắc, miền Nam và Tây Nguyên. Xem tuyến, thời lượng và điểm đón để chọn đúng hành trình.",
  },
  cat_mien_trung: {
    title: "Du lịch biển miền Trung: Quy Nhơn, Đà Nẵng, Hội An",
    description:
      "Tour biển miền Trung 4–5 ngày: Quy Nhơn – Phú Yên, Đà Nẵng – Hội An – Huế và tuyến di sản. Xem lịch trình, điểm đón và dịch vụ thực tế.",
  },
};

/** Tour defaults keyed by the published slug; CMS `seo` overrides them. */
export const TOUR_SEO: Record<string, SeoDefault> = {
  "ky-co-eo-gio-hon-kho-1-ngay": {
    title: "Tour Kỳ Co – Eo Gió – Hòn Khô 1 ngày",
    description:
      "Tour 1 ngày từ Quy Nhơn đi Kỳ Co, Eo Gió và Hòn Khô, phù hợp khách muốn gom các điểm biển chính trong một ngày. Xem lịch trình, điểm đón và dịch vụ.",
  },
  "quy-nhon-cu-lao-xanh-1-ngay": {
    title: "Tour Cù Lao Xanh 1 ngày từ Quy Nhơn",
    description:
      "Tour Cù Lao Xanh trong ngày: ra đảo, tham quan hải đăng và làng chài, phù hợp khách thích biển đảo yên bình. Xem thời gian, điểm đón và dịch vụ.",
  },
  "quy-nhon-phu-yen-ghenh-da-dia-1-ngay": {
    title: "Tour Quy Nhơn – Ghềnh Đá Đĩa 1 ngày",
    description:
      "Tour 1 ngày kết hợp Quy Nhơn và Ghềnh Đá Đĩa: điểm địa chất bazan nổi bật của Phú Yên. Xem lịch trình, thời gian di chuyển và dịch vụ.",
  },
  "quy-nhon-hon-kho-lan-bien-1-ngay": {
    title: "Tour Hòn Khô lặn biển 1 ngày",
    description:
      "Tour Hòn Khô trong ngày, dành thời gian tắm biển và lặn ngắm san hô. Xem thời gian, điểm đón và các dịch vụ đi kèm trước khi đặt.",
  },
  "quy-nhon-phu-yen-3-ngay-2-dem": {
    title: "Tour Quy Nhơn Phú Yên 3 ngày 2 đêm",
    description:
      "Tour Quy Nhơn – Phú Yên 3 ngày 2 đêm với Kỳ Co – Eo Gió, Ghềnh Đá Đĩa và đầm Ô Loan. Xem lịch trình từng ngày, điểm đón và dịch vụ.",
  },
  "quy-nhon-phu-yen-4-ngay-3-dem": {
    title: "Tour Quy Nhơn Phú Yên 4 ngày 3 đêm",
    description:
      "Tour Quy Nhơn – Phú Yên 4 ngày 3 đêm, đón tiễn tại Quy Nhơn, có thời gian tham quan Kỳ Co – Eo Gió, Ghềnh Đá Đĩa và đầm Ô Loan. Xem lịch trình và dịch vụ.",
  },
  "quy-nhon-phu-yen-4-ngay-3-dem-tien-phu-yen": {
    title: "Tour Quy Nhơn Phú Yên 4 ngày 3 đêm: đón Quy Nhơn, tiễn Phú Yên",
    description:
      "Tour 4 ngày 3 đêm đi từ Quy Nhơn đến Phú Yên, phù hợp khách muốn kết hợp hai điểm với điểm đón và tiễn khác nhau. Xem lịch trình, điểm đón và dịch vụ.",
  },
};
