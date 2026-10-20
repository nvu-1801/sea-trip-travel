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

export const landingSchema = z.object({
  id: z.literal("home-sections"),
  finder: z.object({
    suggestions: z.array(suggestionSchema).min(1).max(8).default([]),
  }),
  story: z.object({
    trips: z.array(storyTripSchema).min(1).max(6).default([]),
  }),
  planning: z.object({
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
    photoSrc: z.string().startsWith("/").max(300).default("/images/hero/sea-kayaking.webp"),
    photoAlt: z.string().max(300).default("Ảnh minh hoạ chèo thuyền trên biển"),
    photoAltEn: z.string().max(300).default("Illustration of kayaking on the sea"),
    badge: z.string().max(120).default("Đi chậm, chọn kỹ, nhớ lâu"),
    badgeEn: z.string().max(120).default("Handpicked, unhurried journeys"),
  }),
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
      { days: "1", title: "Một ngày đổi gió", titleEn: "A day to reset", body: "Chạm biển, ghé một điểm đến mới rồi trở về trong ngày.", bodyEn: "A coastal escape, with time to return in the evening." },
      { days: "2", title: "Cuối tuần cho riêng mình", titleEn: "A weekend for yourself", body: "Rời phố, ngủ một giấc ngon và đón buổi sáng ở một nơi khác.", bodyEn: "Leave the city behind and make room for a slower morning." },
      { days: "4+", title: "Ở lại thêm chút nữa", titleEn: "Stay a little longer", body: "Nối những miền đất, dành nhiều thời gian hơn cho khám phá.", bodyEn: "Connect more destinations, with time to explore along the way." },
    ],
  },
  planning: {
    questions: [
      { q: "Chọn chuyến đi thế nào cho phù hợp?", qEn: "How do I choose the right trip?", a: "Bắt đầu từ số ngày bạn có và nơi muốn đến. Mỗi trang tour có lịch trình và thông tin dịch vụ để bạn so sánh trước khi trao đổi thêm với tư vấn viên.", aEn: "Start with your available days and preferred destination. Each tour page lists its itinerary and included services so you can compare before asking for advice.", tag: "Chọn tour", tagEn: "Choose" },
      { q: "Gia đình hoặc nhóm riêng có thể đi được không?", qEn: "Can I travel with my family or a private group?", a: "Bạn hãy chia sẻ số người, độ tuổi và nhịp đi mong muốn. Đội ngũ tư vấn sẽ trao đổi phương án phù hợp và xác nhận khả năng phục vụ trước khi bạn quyết định.", aEn: "Share your group size, ages and preferred pace. Our team will discuss suitable arrangements and confirm availability before you decide.", tag: "Nhóm riêng", tagEn: "Group" },
      { q: "Gửi yêu cầu có đồng nghĩa đã đặt tour?", qEn: "Does submitting a request confirm a booking?", a: "Chưa. Biểu mẫu chỉ gửi yêu cầu tư vấn. Ngày khởi hành, tình trạng chỗ, dịch vụ và giá cuối cùng cần được xác nhận lại với đội ngũ tư vấn.", aEn: "No. The form sends a consultation request. Dates, availability, services and the final price need to be confirmed with the team.", tag: "Đặt chỗ", tagEn: "Booking" },
      { q: "Cần chuẩn bị gì cho chuyến đi biển?", qEn: "What should I check before a coastal trip?", a: "Trao đổi trước về thời tiết và điểm đón. Mang theo đồ chống nắng, giày dép phù hợp; các hoạt động canô hoặc tàu có thể thay đổi theo điều kiện biển.", aEn: "Check the weather and departure arrangements with your advisor. Bring sun protection and suitable footwear; boat activities may change with sea conditions.", tag: "Đi biển", tagEn: "Beach" },
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
    bodyEn: "Rocky headlands, quiet fishing villages and turquoise bays. Start with a place that makes you want to slow down.",
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
    intro: "Từ sớm mai nơi núi cao đến chiều lộng gió bên bờ biển. Mỗi miền đất là một cách khác để yêu những chuyến đi.",
    introEn: "From mountain mornings to coastal afternoons, find a different rhythm in every region.",
    moods: ["Non nước & di sản", "Biển xanh & phố cổ", "Đảo ngọc & sông nước", "Rừng thông & sớm cao nguyên"],
    moodsEn: ["Mountains & heritage", "Coast & ancient towns", "Islands & waterways", "Pines & highland mornings"],
  },
  values: {
    photoSrc: "/images/hero/sea-kayaking.webp",
    photoAlt: "Ảnh minh hoạ chèo thuyền trên biển",
    photoAltEn: "Illustration of kayaking on the sea",
    badge: "Đi chậm, chọn kỹ, nhớ lâu",
    badgeEn: "Handpicked, unhurried journeys",
  },
});
