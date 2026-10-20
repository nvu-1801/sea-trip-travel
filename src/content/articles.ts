import type { TravelArticleInput } from "@/domain/article";

/**
 * Cẩm nang du lịch — demo content.
 *
 * The bodies are written as structured blocks (see `domain/article.ts`), not
 * raw HTML or MDX, so rendering never needs `dangerouslySetInnerHTML` and a
 * future CMS can serve the same shape over the wire.
 */
export const articles: readonly TravelArticleInput[] = [
  {
    id: "art_kinh_nghiem_qn_py",
    slug: "kinh-nghiem-du-lich-quy-nhon-phu-yen",
    title: "Kinh nghiệm du lịch Quy Nhơn – Phú Yên cho người đi lần đầu",
    excerpt:
      "Tổng hợp những điều cần biết trước chuyến đi Quy Nhơn – Phú Yên: thời điểm, di chuyển, điểm nên đi và cách sắp lịch trình.",
    destinationIds: ["dest_quy_nhon", "dest_ghenh_da_dia", "dest_ky_co_eo_gio"],
    relatedTourSlugs: [
      "quy-nhon-phu-yen-3-ngay-2-dem",
      "quy-nhon-ky-co-eo-gio-1-ngay",
    ],
    tags: ["Quy Nhơn", "Phú Yên", "Kinh nghiệm"],
    readingMinutes: 6,
    cover: {
      src: "/images/hero/island-panorama.webp",
      alt: "Toàn cảnh đảo và vịnh biển Quy Nhơn – Phú Yên",
    },
    author: "SEA TRIP TRAVEL",
    publishedAt: "2026-01-10",
    featured: true,
    body: [
      {
        type: "paragraph",
        text: "Quy Nhơn và Phú Yên nằm cạnh nhau, cách nhau khoảng 100 km theo đường bộ. Vì vậy hai điểm này thường được ghép trong cùng một hành trình, kể cả khi bạn chỉ có ba ngày.",
      },
      { type: "heading", level: 2, text: "Nên đi vào thời điểm nào?" },
      {
        type: "paragraph",
        text: "Khu vực duyên hải Nam Trung Bộ có hai mùa tương đối rõ. Giai đoạn biển lặng thường thuận lợi cho các hoạt động ra đảo và lặn biển; giai đoạn mưa bão nhiều hơn thì nên ưu tiên các điểm trên đất liền.",
      },
      {
        type: "callout",
        tone: "info",
        title: "Lưu ý về mùa mưa",
        text: "Lịch trình có hoạt động trên biển nên được kiểm tra lại thời tiết trước ngày khởi hành. Các đơn vị khai thác thường có phương án thay thế nếu biển động.",
      },
      { type: "heading", level: 2, text: "Di chuyển tới Quy Nhơn" },
      {
        type: "list",
        ordered: false,
        items: [
          "Máy bay: sân bay Phù Cát cách trung tâm Quy Nhơn khoảng 30 km.",
          "Tàu hoả: ga Diêu Trì nằm trên tuyến Bắc – Nam.",
          "Xe khách: nhiều tuyến từ các tỉnh phía Nam và phía Bắc.",
        ],
      },
      { type: "heading", level: 2, text: "Những điểm nên dành thời gian" },
      { type: "heading", level: 3, text: "Cụm Kỳ Co – Eo Gió" },
      {
        type: "paragraph",
        text: "Đây là cụm điểm nổi tiếng nhất của Quy Nhơn, phù hợp cho một ngày trọn vẹn. Bạn nên ra bãi sớm để có nước trong và tránh nắng gắt.",
      },
      { type: "heading", level: 3, text: "Ghềnh Đá Đĩa và Bãi Xép" },
      {
        type: "paragraph",
        text: "Hai điểm này nằm ở Phú Yên và thường được ghép chung trong nửa ngày. Ghềnh Đá Đĩa nổi bật với các cột đá bazan xếp lớp; Bãi Xép có hai phiến đá nhô ra biển rất dễ nhận ra.",
      },
      {
        type: "image",
        alt: "Các cột đá bazan xếp lớp tại Ghềnh Đá Đĩa",
        src: "/images/tours/e58a823508e08a30.jpeg",
        caption: "Ghềnh Đá Đĩa — điểm nhấn địa chất của Phú Yên.",
      },
      { type: "heading", level: 2, text: "Gợi ý lịch trình ba ngày" },
      {
        type: "list",
        ordered: true,
        items: [
          "Ngày 1: Kỳ Co – Eo Gió, nghỉ đêm tại Quy Nhơn.",
          "Ngày 2: di chuyển sang Phú Yên, tham quan Ghềnh Đá Đĩa – Bãi Xép – Đầm Ô Loan.",
          "Ngày 3: đón bình minh ở Mũi Điện rồi quay lại Quy Nhơn.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        title: "Mẹo nhỏ",
        text: "Nếu có bốn ngày, hãy thêm một buổi sáng ở đảo thay vì nhồi thêm điểm trên đất liền. Nhịp chậm sẽ dễ chịu hơn.",
      },
    ],
    contentStatus: "demo",
  },
  {
    id: "art_thoi_diem_qn",
    slug: "thoi-diem-dep-nhat-de-di-quy-nhon",    title: "Thời điểm nào đi Quy Nhơn đẹp nhất?",
    excerpt:
      "Phân tích ưu và nhược điểm từng giai đoạn trong năm để bạn chọn thời điểm phù hợp với kiểu chuyến đi của mình.",
    destinationIds: ["dest_quy_nhon", "dest_ky_co_eo_gio"],
    relatedTourSlugs: ["quy-nhon-ky-co-eo-gio-1-ngay"],
    tags: ["Quy Nhơn", "Thời điểm", "Kinh nghiệm"],
    readingMinutes: 4,
    cover: {
      src: "/images/hero/emerald-bay.webp",
      alt: "Vịnh biển xanh ngọc Quy Nhơn",
    },
    author: "SEA TRIP TRAVEL",
    publishedAt: "2026-01-08",
    body: [
      {
        type: "paragraph",
        text: 'Không có một câu trả lời duy nhất cho câu hỏi "đi Quy Nhơn tháng nào đẹp nhất", vì nó phụ thuộc vào việc bạn muốn tắm biển, ra đảo hay chỉ dạo thành phố.',
      },
      { type: "heading", level: 2, text: "Nếu bạn muốn ra đảo và lặn biển" },
      {
        type: "paragraph",
        text: "Hãy ưu tiên giai đoạn biển lặng. Đây là điều kiện quan trọng nhất, vì tàu và cano có thể tạm hoãn khi biển động bất kể bạn đã đặt lịch trước.",
      },
      { type: "heading", level: 2, text: "Nếu bạn muốn tránh đông" },
      {
        type: "paragraph",
        text: "Các dịp lễ lớn thường khiến giá phòng tăng và bãi biển đông. Đi lệch dịp lễ vài ngày thường cho trải nghiệm dễ chịu hơn nhiều.",
      },
      {
        type: "callout",
        tone: "warning",
        title: "Đừng chỉ nhìn vào nhiệt độ",
        text: "Nắng ở miền Trung khá mạnh vào giữa trưa. Dù trời không quá nóng theo dự báo, bạn vẫn nên sắp hoạt động ngoài trời vào sáng sớm và chiều muộn.",
      },
      { type: "heading", level: 2, text: "Cách kiểm tra trước khi chốt lịch" },
      {
        type: "list",
        ordered: true,
        items: [
          "Xem dự báo thời tiết khoảng một tuần trước ngày đi.",
          "Hỏi đơn vị tổ chức về phương án thay thế nếu biển động.",
          "Chọn khách sạn có chính sách hoàn/huỷ rõ ràng nếu đi mùa mưa.",
        ],
      },
    ],
    contentStatus: "demo",
  },
  {
    id: "art_an_gi_o_qn",
    slug: "an-gi-o-quy-nhon",
    title: "Ăn gì ở Quy Nhơn: những món nên thử",
    excerpt:
      "Danh sách món ăn địa phương và gợi ý cách sắp bữa trong ngày để không bỏ lỡ đặc sản Quy Nhơn.",
    destinationIds: ["dest_quy_nhon"],
    relatedTourSlugs: ["quy-nhon-ky-co-eo-gio-1-ngay"],
    tags: ["Quy Nhơn", "Ẩm thực"],
    readingMinutes: 4,
    cover: {
      src: "/images/hero/coastal-sunset.webp",
      alt: "Hoàng hôn trên bờ biển Quy Nhơn",
    },
    author: "SEA TRIP TRAVEL",
    publishedAt: "2026-01-06",
    body: [
      {
        type: "paragraph",
        text: "Ẩm thực Quy Nhơn xoay quanh hải sản tươi và các món ăn kèm đậm vị miền Trung. Giá có thể thay đổi theo mùa và theo điểm bán, nên nên hỏi trước khi gọi.",
      },
      { type: "heading", level: 2, text: "Buổi sáng" },
      {
        type: "list",
        ordered: false,
        items: [
          "Bánh xèo tôm nhảy — đặc sản nổi tiếng của Quy Nhơn.",
          "Bún chả cá, một lựa chọn nhẹ cho buổi sáng.",
        ],
      },
      { type: "heading", level: 2, text: "Buổi trưa và tối" },
      {
        type: "list",
        ordered: false,
        items: [
          "Hải sản nướng tại các quán ven biển.",
          "Cơm gà và các món cơm địa phương.",
          "Chè và các món tráng miệng đường phố.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        title: "Hỏi giá trước",
        text: "Với hải sản bán theo cân, hãy hỏi giá và khối lượng trước khi chế biến để tránh phát sinh ngoài dự kiến.",
      },
    ],
    contentStatus: "demo",
  },
  {
    id: "art_di_chuyen_qn",
    slug: "di-chuyen-den-quy-nhon-bang-cach-nao",
    title: "Di chuyển đến Quy Nhơn bằng cách nào?",
    excerpt:
      "So sánh máy bay, tàu hoả và xe khách khi tới Quy Nhơn, kèm lưu ý về thời gian và khoảng cách tới trung tâm.",
    destinationIds: ["dest_quy_nhon"],
    relatedTourSlugs: ["quy-nhon-phu-yen-3-ngay-2-dem"],
    tags: ["Quy Nhơn", "Di chuyển"],
    readingMinutes: 5,
    cover: {
      src: "/images/hero/lighthouse-coast.webp",
      alt: "Hải đăng trên bờ biển Quy Nhơn – Phú Yên",
    },
    author: "SEA TRIP TRAVEL",
    publishedAt: "2026-01-04",
    body: [
      {
        type: "paragraph",
        text: "Có ba cách chính để tới Quy Nhơn. Mỗi cách phù hợp với một kiểu hành trình khác nhau về thời gian và ngân sách.",
      },
      { type: "heading", level: 2, text: "Máy bay" },
      {
        type: "paragraph",
        text: "Nhanh nhất, phù hợp khi bạn có ít ngày. Sân bay Phù Cát cách trung tâm thành phố khoảng 30 km, cần thêm thời gian di chuyển bằng xe.",
      },
      { type: "heading", level: 2, text: "Tàu hoả" },
      {
        type: "paragraph",
        text: "Ga Diêu Trì nằm trên tuyến Bắc – Nam. Đi tàu phù hợp nếu bạn muốn ngắm cảnh dọc đường và không ngại thời gian di chuyển dài.",
      },
      { type: "heading", level: 2, text: "Xe khách" },
      {
        type: "paragraph",
        text: "Linh hoạt về giờ và điểm đón, nhưng thời gian di chuyển dài hơn. Nên chọn nhà xe có giường nằm cho chặng dài.",
      },
      {
        type: "callout",
        tone: "info",
        title: "Về việc ghép Quy Nhơn và Phú Yên",
        text: "Nếu đi cả hai tỉnh, hãy xác định trước bạn bay vào và bay ra ở đâu để tránh quay lại điểm xuất phát.",
      },
    ],
    contentStatus: "demo",
  },
  {
    id: "art_ghenh_da_dia_bai_xep",
    slug: "ghenh-da-dia-va-bai-xep-trong-mot-ngay",
    title: "Ghềnh Đá Đĩa và Bãi Xép trong một ngày",
    excerpt:
      "Cách sắp hai điểm biểu tượng của Phú Yên trong cùng một ngày mà không vội, kèm gợi ý giờ đi.",
    destinationIds: ["dest_ghenh_da_dia", "dest_bai_xep", "dest_dam_o_loan"],
    relatedTourSlugs: [
      "quy-nhon-phu-yen-3-ngay-2-dem",
      "quy-nhon-phu-yen-4-ngay-3-dem",
    ],
    tags: ["Phú Yên", "Lịch trình"],
    readingMinutes: 4,
    cover: {
      src: "/images/destinations/bai-xep.jpg",
      alt: "Bãi Xép, An Chấn, Phú Yên",
    },
    author: "SEA TRIP TRAVEL",
    publishedAt: "2026-01-02",
    body: [
      {
        type: "paragraph",
        text: "Ghềnh Đá Đĩa và Bãi Xép nằm khá gần nhau, nên hoàn toàn có thể ghé cả hai trong một ngày nếu sắp giờ hợp lý.",
      },
      { type: "heading", level: 2, text: "Buổi sáng: Ghềnh Đá Đĩa" },
      {
        type: "paragraph",
        text: "Nên tới sớm vì khu vực này khá trống trải và nắng lên nhanh. Đi lại trên đá cần chú ý vì bề mặt có thể trơn.",
      },
      { type: "heading", level: 2, text: "Buổi chiều: Bãi Xép" },
      {
        type: "paragraph",
        text: "Bãi Xép nhỏ và dễ chịu hơn vào buổi chiều. Đây cũng là điểm phù hợp để nghỉ và ăn hải sản gần đó.",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Sáng sớm: Ghềnh Đá Đĩa.",
          "Giữa trưa: ăn tại khu vực Đầm Ô Loan.",
          "Chiều: Bãi Xép, sau đó về lại nơi lưu trú.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        title: "An toàn trên đá",
        text: "Không đứng quá gần mép nước khi sóng lớn. Khu vực đá bazan có thể trơn sau mưa.",
      },
    ],
    contentStatus: "demo",
  },
] as const;
