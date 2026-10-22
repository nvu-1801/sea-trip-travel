import test from "node:test";
import assert from "node:assert/strict";
import {
  CHATGPT_HOME_URL,
  CHATGPT_PREFILL_LIMIT,
  DEFAULT_TOUR_CHATGPT_FOCUS,
  TOUR_CHATGPT_FOCUS,
  buildChatGptComposerUrl,
  buildTourChatGptPrompt,
} from "../src/features/admin/tour-chatgpt-prompt";

const draft = {
  title: "Quy Nhơn – Phú Yên 3 ngày 2 đêm",
  summary: "Biển xanh, ghềnh đá và hải sản trong một hành trình ngắn.",
  categoryIds: ["cat_mien_trung"],
  destinationIds: ["dest_quy_nhon"],
  duration: { days: 3, nights: 2 },
  priceFrom: { amount: 2450000, currency: "VND" },
  pricingOptions: [
    { id: "price_1", label: "Gói tiêu chuẩn", adultPrice: 2450000, childPrice: 1200000 },
  ],
  overview: ["Tour dành cho khách thích biển và ẩm thực địa phương."],
  highlights: ["Ngắm bình minh ở Kỳ Co"],
  itinerary: [
    {
      id: "day_1",
      index: 1,
      title: "Quy Nhơn – Kỳ Co",
      activities: ["Đón khách tại sân bay", "Tắm biển Kỳ Co"],
      meals: ["Sáng", "Trưa"],
      places: ["Eo Gió"],
      accommodation: "Nghỉ đêm tại Quy Nhơn",
    },
  ],
  included: ["Xe đưa đón"],
  excluded: ["Chi phí cá nhân"],
  notes: ["Mang giày bám tốt"],
  policies: [],
  tags: ["3 ngày"],
};

const references = {
  categories: [{ value: "cat_mien_trung", label: "Miền Trung" }],
  destinations: [{ value: "dest_quy_nhon", label: "Quy Nhơn" }],
};

test("prompt carries the draft, the reference labels and the CMS targets", () => {
  const prompt = buildTourChatGptPrompt(draft, { references });
  assert.match(prompt, /Quy Nhơn – Phú Yên 3 ngày 2 đêm/);
  assert.match(prompt, /Danh mục: Miền Trung/);
  assert.match(prompt, /Điểm đến: Quy Nhơn/);
  assert.match(prompt, /2\.450\.000 ₫/);
  assert.match(prompt, /Ngày 1: Quy Nhơn – Kỳ Co/);
  assert.match(prompt, /Đã bao gồm:\n- Xe đưa đón/);
  assert.match(prompt, /\(chưa có — cần gợi ý\)/);
  assert.match(prompt, /dán vào ô "Đoạn giới thiệu"/);
  assert.ok(!prompt.includes("undefined"));
});

test("focus selection limits both the asks and the answer outline", () => {
  const prompt = buildTourChatGptPrompt(draft, {
    focus: ["itinerary"],
    references,
  });
  assert.match(prompt, /CÁC PHẦN CẦN GỢI Ý \(1 phần\)/);
  assert.match(prompt, /### 2\. Lịch trình từng ngày/);
  assert.ok(!/### \d+\. SEO & chia sẻ/.test(prompt));
  assert.ok(!/### \d+\. Điểm nổi bật/.test(prompt));
});

test("an empty focus list falls back to the defaults", () => {
  const prompt = buildTourChatGptPrompt(draft, { focus: [], references });
  for (const key of DEFAULT_TOUR_CHATGPT_FOCUS) {
    const label = TOUR_CHATGPT_FOCUS.find((item) => item.key === key)?.label;
    assert.ok(label && prompt.includes(label));
  }
  assert.ok(!/### \d+\. SEO & chia sẻ/.test(prompt));
});

test("composer url prefills short prompts and falls back to the homepage", () => {
  const short = buildChatGptComposerUrl("Xin chào ChatGPT");
  assert.equal(short.prefilled, true);
  assert.ok(short.url.startsWith(`${CHATGPT_HOME_URL}?q=`));
  assert.ok(short.url.includes(encodeURIComponent("Xin chào ChatGPT")));

  const long = buildChatGptComposerUrl("a".repeat(CHATGPT_PREFILL_LIMIT));
  assert.equal(long.prefilled, false);
  assert.equal(long.url, CHATGPT_HOME_URL);
});
