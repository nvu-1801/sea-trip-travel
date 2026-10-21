import { z } from "zod";

const suggestionSchema = z.object({
  label: z.string().min(1).max(60),
  query: z.string().min(1).max(100),
});

const storyTripSchema = z.object({
  days: z.string().min(1).max(10),
  title: z.string().min(1).max(120),
  titleEn: z.string().max(120).default(""),
  body: z.string().min(1).max(300),
  bodyEn: z.string().max(300).default(""),
});

const faqSchema = z.object({
  q: z.string().min(1).max(200),
  qEn: z.string().max(200).default(""),
  a: z.string().min(1).max(1000),
  aEn: z.string().max(1000).default(""),
  tag: z.string().max(40).default(""),
  tagEn: z.string().max(40).default(""),
});

const trustItemSchema = z.object({
  icon: z.enum(["calendar", "shield", "compass", "users"]),
  title: z.string().min(1).max(120),
  titleEn: z.string().max(120).default(""),
  body: z.string().min(1).max(300),
  bodyEn: z.string().max(300).default(""),
});

const principleSchema = z.object({
  title: z.string().min(1).max(120),
  titleEn: z.string().max(120).default(""),
  body: z.string().min(1).max(600),
  bodyEn: z.string().max(600).default(""),
});

const storyCopy = z.object({
  eyebrow: z.string().max(120).default("DÀNH THỜI GIAN CHO MỘT CHUYẾN ĐI"),
  eyebrowEn: z.string().max(120).default("MAKE TIME FOR A JOURNEY"),
  titleA: z.string().max(150).default("Không cần đi thật xa."),
  titleAEn: z.string().max(150).default("No need to go far."),
  titleB: z.string().max(150).default("Chỉ cần thấy mình thật khác."),
  titleBEn: z.string().max(150).default("Just somewhere that feels different."),
  body: z
    .string()
    .max(1000)
    .default(
      "Bắt đầu từ số ngày bạn có. Tìm một hành trình vừa vặn, đủ để nghỉ ngơi và mang về những câu chuyện mới.",
    ),
  bodyEn: z
    .string()
    .max(1000)
    .default(
      "Start with the time you have. We will help you find a journey that fits.",
    ),
  photoSrc: z
    .string()
    .startsWith("/")
    .default("/images/hero/coastal-sunset.webp"),
  photoAlt: z.string().max(300).default("Ảnh minh hoạ hoàng hôn ven biển"),
  photoAltEn: z.string().max(300).default("Illustration of a coastal sunset"),
  cta: z.string().max(80).default("Xem hành trình"),
  ctaEn: z.string().max(80).default("Find a journey"),
});
const planningCopy = z.object({
  eyebrow: z.string().max(120).default("TRƯỚC KHI LÊN ĐƯỜNG"),
  eyebrowEn: z.string().max(120).default("BEFORE YOU GO"),
  titleA: z.string().max(150).default("Chuẩn bị một chút."),
  titleAEn: z.string().max(150).default("A little planning."),
  titleB: z.string().max(150).default("Thảnh thơi cả chuyến đi."),
  titleBEn: z.string().max(150).default("A more relaxed trip."),
  body: z
    .string()
    .max(1000)
    .default(
      "Những điều nhỏ giúp bạn dễ chọn tour và yên tâm hơn trước mỗi hành trình.",
    ),
  bodyEn: z
    .string()
    .max(1000)
    .default("A few useful answers, so you can focus on the journey ahead."),
  steps: z
    .array(z.string().min(1).max(120))
    .max(6)
    .default([
      "Chọn số ngày & điểm đến",
      "Nhắn để được tư vấn",
      "Chuẩn bị & thảnh thơi",
    ]),
  stepsEn: z
    .array(z.string().min(1).max(120))
    .max(6)
    .default(["Pick days & place", "Chat for advice", "Pack & relax"]),
  cta: z.string().max(120).default("Cần trả lời nhanh?"),
  ctaEn: z.string().max(120).default("Need a quick answer?"),
  ctaDescription: z
    .string()
    .max(300)
    .default("Nhắn SEA TRIP — phản hồi trong ngày."),
  ctaDescriptionEn: z
    .string()
    .max(300)
    .default("Chat with SEA TRIP — replies within the day."),
  href: z
    .string()
    .regex(/^\/(?!\/)[a-z0-9/-]*$/)
    .default("/lien-he"),
});
export const homeSectionKeys = [
  "hero",
  "finder",
  "explore",
  "featured",
  "trust",
  "story",
  "regions",
  "values",
  "guides",
  "planning",
  "consult",
] as const;
const displaySchema = z.object(
  Object.fromEntries(
    homeSectionKeys.map((key) => [key, z.boolean().default(true)]),
  ) as Record<(typeof homeSectionKeys)[number], z.ZodDefault<z.ZodBoolean>>,
);
const sectionLink = (href: string) =>
  z
    .object({
      href: z
        .string()
        .max(300)
        .refine(
          (value) =>
            /^\/(?!\/)/.test(value) &&
            !value.includes("..") &&
            !/[\\\x00-\x20]/.test(value),
          "Chọn đường dẫn nội bộ bắt đầu bằng /",
        )
        .default(href),
    })
    .default({ href });
const sectionLinks = z.object({
  explore: sectionLink("/tour-quy-nhon-phu-yen"),
  featured: sectionLink("/tour-quy-nhon-phu-yen"),
  regions: sectionLink("/tour-trong-nuoc"),
  values: sectionLink("/lien-he"),
  guides: sectionLink("/cam-nang-du-lich"),
});
export const landingSchema = z.object({
  links: sectionLinks.default(() => sectionLinks.parse({})),
  sectionOrder: z
    .array(z.enum(homeSectionKeys))
    .length(homeSectionKeys.length)
    .refine(
      (keys) => new Set(keys).size === homeSectionKeys.length,
      "Mỗi phần trang chủ chỉ xuất hiện một lần",
    )
    .default([...homeSectionKeys]),
  display: displaySchema.default(() => displaySchema.parse({})),
  id: z.literal("home-sections"),
  finder: z.object({
    suggestions: z.array(suggestionSchema).min(1).max(8).default([]),
  }),
  story: storyCopy.extend({
    trips: z.array(storyTripSchema).min(1).max(6).default([]),
  }),
  planning: planningCopy.extend({
    questions: z.array(faqSchema).min(1).max(8).default([]),
  }),
  explore: z.object({
    eyebrow: z.string().max(80).default(""),
    eyebrowEn: z.string().max(80).default(""),
    titleA: z.string().max(120).default(""),
    titleAEn: z.string().max(120).default(""),
    titleB: z.string().max(120).default(""),
    titleBEn: z.string().max(120).default(""),
    body: z.string().max(600).default(""),
    bodyEn: z.string().max(600).default(""),
    footnote: z.string().max(200).default(""),
    footnoteEn: z.string().max(200).default(""),
  }),
  regions: z.object({
    eyebrow: z.string().max(80).default(""),
    eyebrowEn: z.string().max(80).default(""),
    titleA: z.string().max(120).default(""),
    titleAEn: z.string().max(120).default(""),
    titleB: z.string().max(120).default(""),
    titleBEn: z.string().max(120).default(""),
    intro: z.string().max(600).default(""),
    introEn: z.string().max(600).default(""),
    moods: z.array(z.string().max(60)).max(8).default([]),
    moodsEn: z.array(z.string().max(60)).max(8).default([]),
  }),
  values: z.object({
    photoSrc: z
      .string()
      .startsWith("/")
      .max(300)
      .default("/images/hero/island-panorama.webp"),
    photoAlt: z
      .string()
      .max(300)
      .default("Toàn cảnh vịnh biển và đảo Quy Nhơn"),
    photoAltEn: z
      .string()
      .max(300)
      .default("Panoramic view of Quy Nhon bay islands"),
    badge: z.string().max(120).default("Đi chậm, chọn kỹ, nhớ lâu"),
    badgeEn: z.string().max(120).default("Handpicked, unhurried journeys"),
    principles: z.array(principleSchema).max(6).default([]),
  }),
  trust: z
    .object({
      items: z.array(trustItemSchema).max(6).default([]),
    })
    .default({ items: [] }),
  featured: z
    .object({
      tourIds: z.array(z.string().min(1).max(80)).max(8).default([]),
    })
    .default({ tourIds: [] }),
  guides: z
    .object({
      featuredSlug: z.string().max(120).default(""),
      picks: z.array(z.string().min(1).max(120)).max(3).default([]),
    })
    .default({ featuredSlug: "", picks: [] }),
});

export type LandingSections = z.infer<typeof landingSchema>;

export const defaultLanding: LandingSections = landingSchema.parse({
  id: "home-sections",
  finder: {
    suggestions: [
      { label: "Quy Nhơn", query: "quy nhon" },
      { label: "Phú Yên", query: "phu yen" },
      { label: "Kỳ Co", query: "ky co" },
    ],
  },
  story: {
    trips: [
      {
        days: "1",
        title: "Một ngày đổi gió",
        titleEn: "A day to reset",
        body: "Chạm biển, ghé một điểm đến mới rồi trở về trong ngày.",
        bodyEn: "A coastal escape, with time to return in the evening.",
      },
      {
        days: "2",
        title: "Cuối tuần cho riêng mình",
        titleEn: "A weekend for yourself",
        body: "Rời phố, ngủ một giấc ngon và đón buổi sáng ở một nơi khác.",
        bodyEn: "Leave the city behind and make room for a slower morning.",
      },
      {
        days: "4+",
        title: "Ở lại thêm chút nữa",
        titleEn: "Stay a little longer",
        body: "Nối những miền đất, dành nhiều thời gian hơn cho khám phá.",
        bodyEn:
          "Connect more destinations, with time to explore along the way.",
      },
    ],
  },
  planning: {
    questions: [
      {
        q: "Chọn chuyến đi thế nào cho phù hợp?",
        qEn: "How do I choose the right trip?",
        a: "Bắt đầu từ số ngày bạn có và nơi muốn đến. Mỗi trang tour có lịch trình và thông tin dịch vụ để bạn so sánh trước khi trao đổi thêm với tư vấn viên.",
        aEn: "Start with your available days and preferred destination. Each tour page lists its itinerary and included services so you can compare before asking for advice.",
        tag: "Chọn tour",
        tagEn: "Choose",
      },
      {
        q: "Gia đình hoặc nhóm riêng có thể đi được không?",
        qEn: "Can I travel with my family or a private group?",
        a: "Bạn hãy chia sẻ số người, độ tuổi và nhịp đi mong muốn. Đội ngũ tư vấn sẽ trao đổi phương án phù hợp và xác nhận khả năng phục vụ trước khi bạn quyết định.",
        aEn: "Share your group size, ages and preferred pace. Our team will discuss suitable arrangements and confirm availability before you decide.",
        tag: "Nhóm riêng",
        tagEn: "Group",
      },
      {
        q: "Gửi yêu cầu có đồng nghĩa đã đặt tour?",
        qEn: "Does submitting a request confirm a booking?",
        a: "Chưa. Biểu mẫu chỉ gửi yêu cầu tư vấn. Ngày khởi hành, tình trạng chỗ, dịch vụ và giá cuối cùng cần được xác nhận lại với đội ngũ tư vấn.",
        aEn: "No. The form sends a consultation request. Dates, availability, services and the final price need to be confirmed with the team.",
        tag: "Đặt chỗ",
        tagEn: "Booking",
      },
      {
        q: "Cần chuẩn bị gì cho chuyến đi biển?",
        qEn: "What should I check before a coastal trip?",
        a: "Trao đổi trước về thời tiết và điểm đón. Mang theo đồ chống nắng, giày dép phù hợp; các hoạt động canô hoặc tàu có thể thay đổi theo điều kiện biển.",
        aEn: "Check the weather and departure arrangements with your advisor. Bring sun protection and suitable footwear; boat activities may change with sea conditions.",
        tag: "Đi biển",
        tagEn: "Beach",
      },
    ],
  },
  explore: {
    eyebrow: "01 / CÓ HẸN VỚI BIỂN",
    eyebrowEn: "01 / THE COAST IS CALLING",
    titleA: "Chạm vào một miền",
    titleAEn: "A little closer to",
    titleB: "bình yên rất khác.",
    titleBEn: "somewhere beautiful.",
    body: "Qua những cung đường ôm biển, ghé làng chài nhỏ, để một ngày trôi theo nhịp sóng. Chọn nơi khiến bạn muốn dừng chân lâu hơn một chút.",
    bodyEn:
      "Rocky headlands, quiet fishing villages and turquoise bays. Start with a place that makes you want to slow down.",
    footnote: "Đi chậm một chút. Nhớ lâu một chút.",
    footnoteEn: "Your pace. Your kind of journey.",
  },
  regions: {
    eyebrow: "03 / ĐI XA HƠN MỘT CHÚT",
    eyebrowEn: "03 / A LITTLE FURTHER",
    titleA: "Một Việt Nam.",
    titleAEn: "One country.",
    titleB: "Muôn điều để nhớ.",
    titleBEn: "Endless discoveries.",
    intro:
      "Từ sớm mai nơi núi cao đến chiều lộng gió bên bờ biển. Mỗi miền đất là một cách khác để yêu những chuyến đi.",
    introEn:
      "From mountain mornings to coastal afternoons, find a different rhythm in every region.",
    moods: [
      "Non nước & di sản",
      "Biển xanh & phố cổ",
      "Đảo ngọc & sông nước",
      "Rừng thông & sớm cao nguyên",
    ],
    moodsEn: [
      "Mountains & heritage",
      "Coast & ancient towns",
      "Islands & waterways",
      "Pines & highland mornings",
    ],
  },
  values: {
    photoSrc: "/images/hero/island-panorama.webp",
    photoAlt: "Toàn cảnh vịnh biển và đảo Quy Nhơn",
    photoAltEn: "Panoramic view of Quy Nhon bay islands",
    badge: "Đi chậm, chọn kỹ, nhớ lâu",
    badgeEn: "Handpicked, unhurried journeys",
    principles: [
      {
        title: "Chọn ít điểm, đi sâu hơn",
        titleEn: "Fewer places, deeper stays",
        body: "Mỗi hành trình tập trung vào một cụm điểm thay vì chạy qua nhiều nơi. Thời gian di chuyển được tính trước để bạn có thời gian thật ở mỗi điểm.",
        bodyEn:
          "Each journey focuses on one cluster of places instead of rushing through many. Travel time is planned up front so you get real time at each stop.",
      },
      {
        title: "Lịch trình nói rõ bao gồm gì",
        titleEn: "Itineraries that say what is included",
        body: "Mỗi tour đều liệt kê dịch vụ bao gồm và không bao gồm. Giá chưa xác nhận sẽ hiển thị “Liên hệ tư vấn”, không hiển thị số 0.",
        bodyEn:
          "Every tour lists what is and is not included. A price that is not confirmed shows “Contact us for pricing”, never a zero.",
      },
      {
        title: "Tư vấn trực tiếp, không ép",
        titleEn: "Direct advice, no pressure",
        body: "Website chỉ tiếp nhận yêu cầu. Bạn trao đổi với tư vấn viên, xem giá và điều kiện, rồi mới quyết định.",
        bodyEn:
          "This website only takes requests. You talk to an advisor, see the price and the conditions, then decide.",
      },
      {
        title: "Nói thật khi chưa chắc",
        titleEn: "Honest when we are unsure",
        body: "Những nội dung cần xác nhận như giá, chính sách huỷ hay thời điểm tàu chạy sẽ được kiểm tra lại trước khi gửi cho bạn.",
        bodyEn:
          "Anything that needs confirming — prices, cancellation terms, boat schedules — is checked again before we send it to you.",
      },
    ],
  },
  trust: {
    items: [
      {
        icon: "calendar",
        title: "Lịch trình rõ từng ngày",
        titleEn: "Day-by-day itinerary",
        body: "Mỗi trang tour ghi rõ ngày nào đi đâu.",
        bodyEn: "Every tour page lists what happens each day.",
      },
      {
        icon: "shield",
        title: "Giá công khai",
        titleEn: "Upfront pricing",
        body: "Niêm yết giá trước khi tư vấn.",
        bodyEn: "Published prices before you ask for advice.",
      },
      {
        icon: "compass",
        title: "Tư vấn miễn phí",
        titleEn: "Free consultation",
        body: "Gợi ý tuyến và thời điểm, không mất phí.",
        bodyEn: "Route and timing advice costs nothing.",
      },
      {
        icon: "users",
        title: "Đồng hành suốt chuyến",
        titleEn: "Support on the road",
        body: "Đội ngũ thật theo sát hành trình của bạn.",
        bodyEn: "A real team follows your trip with you.",
      },
    ],
  },
  featured: {
    tourIds: [],
  },
  guides: {
    featuredSlug: "",
    picks: [],
  },
});
