import type { TourCategoryInput } from "@/domain/category";
import { CATEGORY_SEO } from "./seo";

/**
 * Category tree. `path` values are the canonical URLs and must not change
 * after launch (they are referenced by the required menu and by SEO).
 */
export const tourCategories: readonly TourCategoryInput[] = [
  {
    id: "cat_quy_nhon_phu_yen",
    image: {
      src: "/images/tours/d7233006cc4fd0f9.jpeg",
      alt: "Bãi biển Kỳ Co",
    },
    slug: "tour-quy-nhon-phu-yen",
    path: "/tour-quy-nhon-phu-yen",
    name: "Tour Quy Nhơn - Phú Yên",
    parentId: null,
    region: "quy-nhon-phu-yen",
    tagline: "Tuyến trọng tâm được SEA TRIP chọn lọc kỹ",
    description:
      "Quy Nhơn – Phú Yên là tuyến trọng tâm của SEA TRIP TRAVEL: biển xanh, đá bazan, hải đăng và hải sản miền Trung. Nhóm tour dưới đây chia theo thời lượng để bạn chọn nhanh theo quỹ thời gian.",
    seo: CATEGORY_SEO.cat_quy_nhon_phu_yen,
    order: 1,
    contentStatus: "demo",
  },
  {
    id: "cat_quy_nhon_1_ngay",
    image: {
      src: "/images/tours/e16bd7abd194bb4a.jpeg",
      alt: "Du khách lội nước trong veo ở Hòn Khô, núi đá phía sau",
    },
    slug: "tour-quy-nhon-1-ngay",
    path: "/tour-quy-nhon-phu-yen/tour-quy-nhon-1-ngay",
    name: "Tour Quy Nhơn 1 Ngày",
    parentId: "cat_quy_nhon_phu_yen",
    region: "quy-nhon-phu-yen",
    tagline: "Phù hợp lịch trình ngắn, khởi hành trong ngày",
    description:
      "Các tour trong ngày dành cho khách có ít thời gian: tập trung vào một cụm điểm chính như Kỳ Co – Eo Gió, Hòn Khô hoặc Cù Lao Xanh, khởi hành và kết thúc trong ngày.",
    seo: CATEGORY_SEO.cat_quy_nhon_1_ngay,
    order: 1,
    contentStatus: "demo",
  },
  {
    id: "cat_quy_nhon_dai_ngay",
    image: {
      src: "/images/tours/afdf37ef08e566b9.png",
      alt: "Đảo Cù Lao Xanh",
    },
    slug: "tour-quy-nhon-dai-ngay",
    path: "/tour-quy-nhon-phu-yen/tour-quy-nhon-dai-ngay",
    name: "Tour Quy Nhơn dài Ngày",
    parentId: "cat_quy_nhon_phu_yen",
    region: "quy-nhon-phu-yen",
    tagline: "Ghép Quy Nhơn với Phú Yên trong 2–5 ngày",
    description:
      "Các tour dài ngày kết hợp Quy Nhơn với Phú Yên trong cùng một hành trình, có nghỉ đêm và thời gian tham quan thoải mái hơn.",
    seo: CATEGORY_SEO.cat_quy_nhon_dai_ngay,
    order: 2,
    contentStatus: "demo",
  },
  {
    id: "cat_tour_trong_nuoc",
    image: {
      src: "/images/hero/island-panorama.webp",
      alt: "Toàn cảnh đảo xanh và làng chài nhìn từ trên cao",
    },
    slug: "tour-trong-nuoc",
    path: "/tour-trong-nuoc",
    name: "Tour Trong Nước",
    parentId: null,
    region: "mien-trung",
    tagline: "Chọn lọc theo bốn vùng miền",
    description:
      "Danh mục tour trong nước được chia theo vùng miền để bạn dễ hình dung hành trình và chọn đúng mùa. Mỗi vùng gồm các tuyến phổ biến với thời lượng từ 2 đến 5 ngày.",
    seo: CATEGORY_SEO.cat_tour_trong_nuoc,
    order: 2,
    contentStatus: "demo",
  },
  {
    id: "cat_mien_bac",
    image: {
      src: "/images/destinations/ha-long.jpg",
      alt: "Vịnh Hạ Long nhìn từ đảo Ti Tốp",
    },
    slug: "tour-mien-bac",
    path: "/tour-trong-nuoc/tour-mien-bac",
    name: "Tour Miền Bắc",
    parentId: "cat_tour_trong_nuoc",
    region: "mien-bac",
    tagline: "Hà Nội, Vịnh Hạ Long, Sa Pa, Ninh Bình",
    description:
      "Miền Bắc phù hợp cho hành trình văn hóa kết hợp cảnh quan núi đá vôi: phố cổ Hà Nội, Vịnh Hạ Long, ruộng bậc thang Sa Pa và quần thể Ninh Bình.",
    order: 1,
    contentStatus: "demo",
  },
  {
    id: "cat_mien_trung",
    image: {
      src: "/images/destinations/hoi-an.jpg",
      alt: "Phố cổ Hội An bên sông Hoài",
    },
    slug: "tour-mien-trung",
    path: "/tour-trong-nuoc/tour-mien-trung",
    name: "Tour Miền Trung",
    parentId: "cat_tour_trong_nuoc",
    region: "mien-trung",
    tagline: "Đà Nẵng, Hội An, Huế",
    description:
      "Miền Trung là tuyến di sản: Đà Nẵng – Hội An – Huế kết nối thuận tiện bằng đường bộ, phù hợp cả nghỉ dưỡng lẫn khám phá văn hóa.",
    seo: CATEGORY_SEO.cat_mien_trung,
    order: 2,
    contentStatus: "demo",
  },
  {
    id: "cat_mien_nam",
    image: {
      src: "/images/destinations/phu-quoc.jpg",
      alt: "Bãi biển Phú Quốc",
    },
    slug: "tour-mien-nam",
    path: "/tour-trong-nuoc/tour-mien-nam",
    name: "Tour Miền Nam",
    parentId: "cat_tour_trong_nuoc",
    region: "mien-nam",
    tagline: "Phú Quốc, miền Tây sông nước",
    description:
      "Miền Nam có hai hướng chính: nghỉ dưỡng biển đảo tại Phú Quốc và khám phá sông nước miền Tây với chợ nổi, vườn trái cây.",
    order: 3,
    contentStatus: "demo",
  },
  {
    id: "cat_tay_nguyen",
    image: {
      src: "/images/destinations/da-lat.jpg",
      alt: "Hồ Xuân Hương nhìn từ Dalat Palace",
    },
    slug: "tour-tay-nguyen",
    path: "/tour-trong-nuoc/tour-tay-nguyen",
    name: "Tour Tây Nguyên",
    parentId: "cat_tour_trong_nuoc",
    region: "tay-nguyen",
    tagline: "Đà Lạt, Buôn Ma Thuột",
    description:
      "Tây Nguyên mang khí hậu cao nguyên se lạnh: Đà Lạt với đồi thông và hồ, Buôn Ma Thuột với cà phê, thác nước và văn hóa cồng chiêng.",
    order: 4,
    contentStatus: "demo",
  },
] as const;
