import { z } from "zod";

const localTime = z.union([z.literal(""), z.iso.datetime({ local: true, precision: -1 }).refine((value) => !value.endsWith("Z"))]);
const color = z.string().regex(/^#[0-9a-f]{6}$/i);

export const promotionSchema = z.object({
  id: z.string().regex(/^promo_[a-z0-9_]+$/),
  name: z.string().trim().min(1, "Nhập tên chiến dịch").max(100),
  title: z.string().trim().max(120),
  intro: z.string().trim().max(500),
  terms: z.string().trim().max(2000),
  button: z.string().trim().min(1).max(50),
  confirmation: z.string().trim().min(1).max(250),
  image: z.string().max(400).refine((value) => !value || (/^\/(?!\/)/.test(value) && !value.includes("..") && !/[\\\x00-\x1f]/.test(value)), "Đường dẫn ảnh không hợp lệ"),
  alt: z.string().trim().max(200),
  background: color,
  buttonColor: color,
  accent: color,
  starts: localTime,
  ends: localTime,
  home: z.boolean(),
  featured: z.boolean(),
  tours: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(100),
  floating: z.boolean(),
  autoOpen: z.boolean(),
  selectionMode: z.enum(["random", "manual"]).optional(),
  winnerCount: z.number().int().min(1, "Cần ít nhất một phần quà").max(100).optional(),
  reserveCount: z.number().int().min(0).max(100).optional(),
  entriesPerWinner: z.number().int().min(1, "Nhập ít nhất một lượt mỗi suất").max(10000).optional(),
});

export const publishedPromotionSchema = promotionSchema.superRefine((item, ctx) => {
  const required = {
    title: "Nhập tiêu đề quà",
    intro: "Nhập lời giới thiệu",
    image: "Chọn ảnh quà",
    alt: "Nhập mô tả ảnh",
    starts: "Chọn thời điểm bắt đầu",
    ends: "Chọn thời điểm kết thúc",
  } as const;
  for (const [path, message] of Object.entries(required))
    if (!item[path as keyof typeof required]) ctx.addIssue({ code: "custom", path: [path], message });
  if (item.starts && item.ends && item.starts >= item.ends)
    ctx.addIssue({ code: "custom", path: ["ends"], message: "Thời điểm kết thúc phải sau thời điểm bắt đầu" });
  if (!item.home && !item.tours.length)
    ctx.addIssue({ code: "custom", path: ["tours"], message: "Chọn trang chủ hoặc ít nhất một tour" });
  if (item.selectionMode === "manual" && item.reserveCount)
    ctx.addIssue({ code: "custom", path: ["reserveCount"], message: "Chế độ chọn thủ công không tự chọn dự phòng" });
});

export type Promotion = z.infer<typeof promotionSchema>;
export type PublicPromotion = Omit<Promotion, "name">;

export const promotionTime = (value: string) => Date.parse(`${value}:00+07:00`);

export function activePromotion<T extends PublicPromotion>(items: readonly T[], tour: string | null, now: number) {
  return items.filter((item) =>
    promotionTime(item.starts) <= now && now < promotionTime(item.ends) &&
    (tour === null ? item.home : item.tours.includes(tour)),
  ).sort((a, b) => (tour === null ? Number(b.featured) - Number(a.featured) : 0) ||
    b.starts.localeCompare(a.starts) || a.id.localeCompare(b.id))[0];
}

export function promotionWinnerCount(eligible: number, fixed: number, entriesPerWinner?: number) {
  return entriesPerWinner ? Math.min(100, Math.floor(eligible / entriesPerWinner)) : fixed;
}

function luminance(color: string) {
  const [r, g, b] = [1, 3, 5].map((offset) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

export function contrast(first: string, second: string) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export const readableText = (color: string) => contrast(color, "#ffffff") >= 4.5 ? "#ffffff" : "#000000";
