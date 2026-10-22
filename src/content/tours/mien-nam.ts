import type { TourInput } from "@/domain/tour";

/** Tour Miền Nam — demo content. Prices intentionally `null`. */
export const mienNamTours: readonly TourInput[] = [
  {
    id: "tour_mn_phu_quoc_4n3d",
    slug: "phu-quoc-4-ngay-3-dem",
    title: "Phú Quốc 4 ngày 3 đêm",
    summary:
      "Bốn ngày nghỉ dưỡng tại đảo lớn nhất Việt Nam: bãi biển, cáp treo Hòn Thơm và chợ đêm.",
    categoryIds: ["cat_mien_nam"],
    destinationIds: ["dest_phu_quoc"],
    duration: { days: 4, nights: 3 },
    departurePoints: ["Phú Quốc"],
    priceFrom: null,
    priceNote:
      "Giá phụ thuộc hạng resort và thời điểm (mùa cao điểm chênh lệch đáng kể).",
    highlights: [
      "Ba đêm tại một resort, không phải đổi chỗ ở giữa chuyến",
      "Đi cáp treo vượt biển tới Hòn Thơm",
      "Tham quan cơ sở nước mắm truyền thống và vườn tiêu",
      "Khám phá chợ đêm và hải sản địa phương",
      "Buổi chiều để trống cho khách tự do nghỉ dưỡng",
      "Phù hợp kỳ nghỉ ngắn với nhịp chậm",
    ],
    images: [
      { src: "/images/destinations/phu-quoc.jpg", alt: "Bãi biển Phú Quốc" },
      {
        src: "/images/destinations/phu-quoc-bai-sao.jpg",
        alt: "Bãi biển cát trắng Phú Quốc",
      },
      {
        src: "/images/destinations/phu-quoc-cap-treo.jpg",
        alt: "Cáp treo Hòn Thơm vượt biển",
      },
      {
        src: "/images/destinations/phu-quoc-cho-dem.jpg",
        alt: "Hải sản tại chợ đêm Phú Quốc",
      },
    ],
    overview: [
      "Phú Quốc phù hợp cho kỳ nghỉ ngắn với nhịp chậm. Chương trình giữ khoảng trống buổi chiều để khách tự do nghỉ dưỡng.",
    ],
    itinerary: [
      {
        id: "d1",
        index: 1,
        title: "Đón khách – Bãi biển",
        summary: "Nhận phòng và nghỉ ngơi.",
        activities: [
          "Đón khách tại sân bay Phú Quốc.",
          "Nhận phòng resort.",
          "Tự do tắm biển.",
        ],
        meals: ["Tối"],
        accommodation: "Nghỉ đêm tại Phú Quốc",
        places: ["Phú Quốc"],
      },
      {
        id: "d2",
        index: 2,
        title: "Nam đảo – Cáp treo Hòn Thơm",
        summary: "Khám phá phía nam đảo.",
        activities: [
          "Tham quan làng chài và cơ sở nước mắm truyền thống.",
          "Đi cáp treo vượt biển tới Hòn Thơm.",
          "Tắm biển và nghỉ tại bãi.",
          "Tự do buổi tối.",
        ],
        meals: ["Sáng", "Trưa"],
        accommodation: "Nghỉ đêm tại Phú Quốc",
        places: ["Hòn Thơm", "Nam đảo"],
      },
      {
        id: "d3",
        index: 3,
        title: "Bắc đảo – Chợ đêm",
        summary: "Khám phá phía bắc và ẩm thực đêm.",
        activities: [
          "Tham quan vườn tiêu và cơ sở nuôi cấy ngọc trai.",
          "Ghé bãi biển phía bắc.",
          "Dạo chợ đêm, ăn hải sản.",
        ],
        meals: ["Sáng", "Trưa"],
        accommodation: "Nghỉ đêm tại Phú Quốc",
        places: ["Bắc đảo", "Chợ đêm"],
      },
      {
        id: "d4",
        index: 4,
        title: "Phú Quốc – Kết thúc",
        summary: "Buổi sáng tự do và tiễn khách.",
        activities: [
          "Tự do buổi sáng.",
          "Trả phòng.",
          "Tiễn khách tại sân bay.",
        ],
        meals: ["Sáng"],
        places: ["Phú Quốc"],
      },
    ],
    included: [
      "Xe đưa đón theo chương trình",
      "03 đêm resort theo hạng đã chọn",
      "Các bữa ăn ghi trong lịch trình",
      "Vé cáp treo và vé tham quan",
      "Hướng dẫn viên đồng hành",
    ],
    excluded: [
      "Vé máy bay tới và rời Phú Quốc",
      "Chi phí cá nhân và đồ uống ngoài chương trình",
      "Phụ thu phòng đơn",
    ],
    notes: [
      "Mùa mưa ở Phú Quốc có thể ảnh hưởng hoạt động trên biển.",
      "Giờ cáp treo Hòn Thơm có thể thay đổi theo lịch vận hành.",
    ],
    tags: ["4 ngày", "Miền Nam", "Nghỉ dưỡng", "Biển đảo"],
    contentStatus: "demo",
    updatedAt: "2026-01-15T09:00:00+07:00",
  },
  {
    id: "tour_mn_mien_tay_3n2d",
    slug: "mien-tay-can-tho-3-ngay-2-dem",
    title: "Miền Tây – Cần Thơ 3 ngày 2 đêm",
    summary:
      "Ba ngày khám phá sông nước Cửu Long: chợ nổi Cái Răng, vườn trái cây và làng nghề.",
    categoryIds: ["cat_mien_nam"],
    destinationIds: ["dest_mien_tay"],
    duration: { days: 3, nights: 2 },
    departurePoints: ["TP. Hồ Chí Minh"],
    priceFrom: null,
    priceNote:
      "Giá phụ thuộc số khách và loại phương tiện di chuyển từ TP.HCM.",
    highlights: [
      "Đi thuyền tham quan chợ nổi Cái Răng lúc sáng sớm",
      "Đi thuyền quanh cù lao ở Mỹ Tho trên đường tới Cần Thơ",
      "Thăm vườn trái cây và thưởng thức trái cây theo mùa",
      "Tìm hiểu nghề truyền thống tại các làng nghề địa phương",
      "Khởi hành từ TP.HCM, phù hợp chuyến ngắn hai đêm",
      "Hai đêm tại Cần Thơ, thuận tiện cho buổi chợ nổi sớm",
    ],
    images: [
      {
        src: "/images/destinations/mien-tay.jpg",
        alt: "Thuyền hàng trên chợ nổi Cái Răng, Cần Thơ",
      },
      {
        src: "/images/destinations/can-tho-cho-noi.jpg",
        alt: "Chợ nổi Cái Răng buổi sớm",
      },
      {
        src: "/images/destinations/mien-tay-thuyen-nho.jpg",
        alt: "Thuyền nhỏ trên sông Cửu Long",
      },
      {
        src: "/images/destinations/mien-tay-vuon-dua.jpg",
        alt: "Dừa tươi miền Tây",
      },
    ],
    overview: [
      "Miền Tây là tuyến trải nghiệm văn hóa sông nước. Hoạt động chính diễn ra vào buổi sáng sớm, khi chợ nổi đông nhất.",
    ],
    itinerary: [
      {
        id: "d1",
        index: 1,
        title: "TP.HCM – Mỹ Tho – Cần Thơ",
        summary: "Di chuyển và ghé điểm đầu tiên.",
        activities: [
          "Khởi hành từ TP.HCM.",
          "Đi thuyền quanh cù lao ở Mỹ Tho.",
          "Ăn trưa đặc sản địa phương.",
          "Tiếp tục di chuyển tới Cần Thơ, nhận phòng.",
        ],
        meals: ["Trưa", "Tối"],
        accommodation: "Nghỉ đêm tại Cần Thơ",
        places: ["Mỹ Tho", "Cần Thơ"],
      },
      {
        id: "d2",
        index: 2,
        title: "Chợ nổi Cái Răng – Vườn trái cây",
        summary: "Điểm nhấn của chuyến đi.",
        activities: [
          "Đi thuyền tham quan chợ nổi Cái Răng sáng sớm.",
          "Ghé cơ sở làm bánh và làng nghề.",
          "Tham quan vườn trái cây, thưởng thức trái cây theo mùa.",
          "Về khách sạn, tự do buổi tối.",
        ],
        meals: ["Sáng", "Trưa"],
        accommodation: "Nghỉ đêm tại Cần Thơ",
        places: ["Cái Răng"],
      },
      {
        id: "d3",
        index: 3,
        title: "Cần Thơ – TP.HCM – Kết thúc",
        summary: "Buổi sáng tự do và trở về.",
        activities: [
          "Tham quan chùa hoặc tự do mua sắm.",
          "Trả phòng, ăn trưa.",
          "Trở về TP.HCM, kết thúc chương trình.",
        ],
        meals: ["Sáng", "Trưa"],
        places: ["Cần Thơ", "TP. Hồ Chí Minh"],
      },
    ],
    included: [
      "Xe đưa đón theo chương trình",
      "02 đêm khách sạn tại Cần Thơ",
      "Các bữa ăn ghi trong lịch trình",
      "Thuyền tham quan và vé vào điểm",
      "Hướng dẫn viên đồng hành",
    ],
    excluded: [
      "Chi phí cá nhân",
      "Đồ uống ngoài chương trình",
      "Bảo hiểm du lịch",
    ],
    notes: [
      "Nên dậy sớm để kịp đi chợ nổi; hoạt động kết thúc trước khi trời nắng gắt.",
    ],
    tags: ["3 ngày", "Miền Nam", "Sông nước", "Văn hóa"],
    contentStatus: "demo",
    updatedAt: "2026-01-15T09:00:00+07:00",
  },
] as const;
