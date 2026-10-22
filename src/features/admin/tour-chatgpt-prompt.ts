/**
 * Builds the prompt that the Studio hands to ChatGPT when an editor asks for
 * help finishing a tour. Everything here is pure (no React, no DOM) so the
 * text can be unit-tested and reused by any surface later.
 *
 * The prompt is deliberately CMS-shaped: it tells ChatGPT which field each
 * suggestion belongs to, so the editor can paste the answer straight back into
 * the form without re-reading a wall of prose.
 */

export type TourChatGptFocus =
  | "overview"
  | "highlights"
  | "itinerary"
  | "services"
  | "notes"
  | "seo";

export type TourChatGptReference = { value: string; label: string };

export type TourChatGptReferences = {
  categories?: readonly TourChatGptReference[];
  destinations?: readonly TourChatGptReference[];
};

export type TourChatGptOptions = {
  focus?: readonly TourChatGptFocus[];
  references?: TourChatGptReferences;
};

/** Order matters: it is the order of the checklist and of the answer. */
export const TOUR_CHATGPT_FOCUS: readonly {
  key: TourChatGptFocus;
  label: string;
  hint: string;
  /** Prompt wording: what ChatGPT should return for this section. */
  ask: string;
  /** Where the editor pastes the answer back in the form. */
  target: string;
}[] = [
  {
    key: "overview",
    label: "Giới thiệu",
    hint: "2–3 đoạn mở đầu",
    ask: "2–3 đoạn, mỗi đoạn một dòng, nêu tour dành cho ai, điều khác biệt và cảm giác chuyến đi mang lại.",
    target: "Đoạn giới thiệu",
  },
  {
    key: "highlights",
    label: "Điểm nổi bật",
    hint: "4–6 ý ngắn",
    ask: "4–6 dòng, mỗi dòng một ý ngắn (12–25 từ), nêu trải nghiệm cụ thể chứ không khen chung.",
    target: "Điểm nổi bật",
  },
  {
    key: "itinerary",
    label: "Lịch trình từng ngày",
    hint: "Hoạt động, bữa ăn, điểm dừng",
    ask: 'Với mỗi ngày: dòng "Ngày N: tiêu đề", rồi 3–5 hoạt động, 1 dòng bữa ăn, 1 dòng điểm tham quan. Không tự bịa giờ khởi hành cụ thể.',
    target: "Lịch trình",
  },
  {
    key: "services",
    label: "Dịch vụ bao gồm / không bao gồm",
    hint: "Hai danh sách rõ ràng",
    ask: 'Hai danh sách "Đã bao gồm" và "Không bao gồm", mỗi dòng một mục, dùng từ ngữ trung tính và dễ đối chiếu.',
    target: "Dịch vụ",
  },
  {
    key: "notes",
    label: "Lưu ý & chính sách",
    hint: "Dặn dò khách, điều kiện huỷ",
    ask: 'Hai danh sách "Lưu ý cho khách" và "Chính sách huỷ / thanh toán". Chỉ nêu quy định chung; chỗ nào cần số liệu thật (%, số ngày, phí) thì ghi [cần xác nhận: …].',
    target: "Lưu ý & chính sách",
  },
  {
    key: "seo",
    label: "SEO & chia sẻ",
    hint: "Tiêu đề, mô tả tìm kiếm",
    ask: 'Một tiêu đề tối đa 60 ký tự và một mô tả 140–160 ký tự, có từ khoá địa danh và loại tour, không viết hoa toàn bộ.',
    target: "SEO",
  },
];

export const DEFAULT_TOUR_CHATGPT_FOCUS: readonly TourChatGptFocus[] =
  TOUR_CHATGPT_FOCUS.map((item) => item.key).filter((key) => key !== "seo");

export const CHATGPT_HOME_URL = "https://chatgpt.com/";

/**
 * Browsers and ChatGPT both start dropping the `?q=` parameter on very long
 * URLs. Above this the helper copies the prompt instead of prefilling it.
 */
export const CHATGPT_PREFILL_LIMIT = 6000;

const focusEntry = (key: TourChatGptFocus) =>
  TOUR_CHATGPT_FOCUS.find((item) => item.key === key);

/* -------------------------------------------------------------------------- */
/* Defensive readers for the untyped CMS draft                                */
/* -------------------------------------------------------------------------- */

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function strings(value: unknown): string[] {
  return list(value)
    .map((item) => text(item))
    .filter((item) => item.length > 0);
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

const vnd = (amount: number) =>
  amount > 0 ? `${amount.toLocaleString("vi-VN")} ₫` : "";

const labelOf = (
  ids: readonly string[],
  options: readonly TourChatGptReference[] | undefined,
) =>
  ids
    .map((id) => options?.find((option) => option.value === id)?.label ?? id)
    .join(", ");

const bulletBlock = (
  title: string,
  items: readonly string[],
  needed = false,
) =>
  items.length
    ? `${title}:\n${items.map((item) => `- ${item}`).join("\n")}`
    : `${title}:\n- (chưa có${needed ? " — cần gợi ý" : ""})`;

/* -------------------------------------------------------------------------- */
/* Prompt                                                                     */
/* -------------------------------------------------------------------------- */

function tourSnapshot(
  data: unknown,
  references: TourChatGptReferences | undefined,
  focus: ReadonlySet<TourChatGptFocus>,
): string {
  const value = rec(data);
  const duration = rec(value.duration);
  const priceFrom = rec(value.priceFrom);
  const priceAmount = num(priceFrom.amount);
  const priceNote = text(value.priceNote);
  const isContact = value.priceFrom === null || value.priceFrom === undefined;

  const blocks: string[] = [];

  blocks.push(
    [
      `Tiêu đề: ${text(value.title) || "(chưa nhập)"}`,
      text(value.tourCode) ? `Mã tour: ${text(value.tourCode)}` : "",
      `Tóm tắt một câu: ${text(value.summary) || "(chưa nhập)"}`,
      `Thời lượng: ${num(duration.days)} ngày / ${num(duration.nights)} đêm`,
      `Giá: ${
        isContact
          ? "Liên hệ tư vấn (chưa công bố giá)"
          : vnd(priceAmount) || "(chưa nhập)"
      }`,
      priceNote ? `Ghi chú giá: ${priceNote}` : "",
      `Danh mục: ${
        labelOf(strings(value.categoryIds), references?.categories) || "(chưa chọn)"
      }`,
      `Điểm đến: ${
        labelOf(strings(value.destinationIds), references?.destinations) ||
        "(chưa chọn)"
      }`,
      `Nhãn lọc: ${strings(value.tags).join(", ") || "(chưa có)"}`,
      `Điểm khởi hành: ${
        strings(value.departurePoints).join(", ") || "(chưa có)"
      }`,
      `Điểm kết thúc: ${strings(value.returnPoints).join(", ") || "(chưa có)"}`,
      `Phương tiện: ${strings(value.transport).join(", ") || "(chưa có)"}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  blocks.push(
    bulletBlock(
      "Giới thiệu (mỗi dòng là một đoạn)",
      strings(value.overview),
      focus.has("overview"),
    ),
  );
  blocks.push(
    bulletBlock(
      "Điểm nổi bật",
      strings(value.highlights),
      focus.has("highlights"),
    ),
  );

  const days = list(value.itinerary).map(rec);
  if (days.length === 0) {
    blocks.push(
      `Lịch trình:\n- (chưa có ngày nào${
        focus.has("itinerary") ? " — cần gợi ý" : ""
      })`,
    );
  } else {
    const rendered = days.map((day, index) => {
      const head = `Ngày ${index + 1}: ${text(day.title) || "(chưa có tiêu đề)"}`;
      const details: string[] = [];
      if (text(day.summary)) details.push(`  Tóm tắt: ${text(day.summary)}`);
      const activities = strings(day.activities);
      if (activities.length)
        details.push(
          `  Hoạt động:\n${activities.map((item) => `  - ${item}`).join("\n")}`,
        );
      const meals = strings(day.meals);
      if (meals.length) details.push(`  Bữa ăn: ${meals.join(", ")}`);
      const places = strings(day.places);
      if (places.length) details.push(`  Điểm tham quan: ${places.join(", ")}`);
      if (text(day.accommodation))
        details.push(`  Lưu trú: ${text(day.accommodation)}`);
      return [head, ...details].join("\n");
    });
    blocks.push(`Lịch trình:\n${rendered.join("\n")}`);
  }

  const packages = list(value.pricingOptions).map(rec);
  if (packages.length) {
    blocks.push(
      `Các gói giá:\n${packages
        .map(
          (option) =>
            `- ${text(option.label) || "Gói"}: người lớn ${
              vnd(num(option.adultPrice)) || "(chưa nhập)"
            }, trẻ em ${vnd(num(option.childPrice)) || "(chưa nhập)"}`,
        )
        .join("\n")}`,
    );
  }

  blocks.push(bulletBlock("Quà tặng kèm", strings(value.gifts)));
  blocks.push(
    bulletBlock("Đã bao gồm", strings(value.included), focus.has("services")),
  );
  blocks.push(
    bulletBlock("Không bao gồm", strings(value.excluded), focus.has("services")),
  );
  blocks.push(
    bulletBlock("Lưu ý cho khách", strings(value.notes), focus.has("notes")),
  );
  blocks.push(
    bulletBlock(
      "Chính sách huỷ / thanh toán",
      strings(value.policies),
      focus.has("notes"),
    ),
  );

  const seo = rec(value.seo);
  if (text(seo.title) || text(seo.description)) {
    blocks.push(
      [
        "SEO hiện tại:",
        text(seo.title) ? `- Tiêu đề: ${text(seo.title)}` : "",
        text(seo.description) ? `- Mô tả: ${text(seo.description)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  } else if (focus.has("seo")) {
    blocks.push("SEO hiện tại:\n- (chưa có — cần gợi ý)");
  }

  return blocks.join("\n\n");
}

/**
 * Full prompt: role, the sections to improve, the output contract, then a
 * snapshot of the draft currently in the form.
 */
export function buildTourChatGptPrompt(
  data: unknown,
  options: TourChatGptOptions = {},
): string {
  const keys = (options.focus?.length
    ? options.focus
    : DEFAULT_TOUR_CHATGPT_FOCUS
  ).filter((key) => Boolean(focusEntry(key)));
  const entries = keys.map(focusEntry).filter((entry) => entry !== undefined);

  const wanted = entries.length ? entries : TOUR_CHATGPT_FOCUS.slice(0, 5);

  const asks = wanted
    .map(
      (entry, index) =>
        `${index + 1}. ${entry.label} → ${entry.ask}\n   (admin dán vào ô "${entry.target}")`,
    )
    .join("\n");

  return [
    "Bạn là biên tập viên nội dung du lịch của SEA TRIP — website bán tour trong nước Việt Nam.",
    'Tôi đang viết nội dung cho một tour trong CMS. Hãy đọc phần "NỘI DUNG TOUR HIỆN TẠI" ở cuối và giúp tôi hoàn thiện.',
    "",
    `CÁC PHẦN CẦN GỢI Ý (${wanted.length} phần):`,
    asks,
    "",
    "QUY TẮC BẮT BUỘC:",
    "- Viết tiếng Việt, giọng thân thiện – chuyên nghiệp, câu 12–25 từ, xưng \"chúng tôi\" với khách.",
    "- Không dùng từ đại ngôn hoặc sáo rỗng: \"tuyệt vời nhất\", \"số 1\", \"thiên đường\", \"không thể bỏ lỡ\".",
    "- Không bịa giá, giờ khởi hành, tên khách sạn, thời tiết hay chính sách. Thiếu dữ liệu thì ghi [cần xác nhận: …].",
    "- Tôn trọng dữ kiện đã có (số ngày, điểm đến, giá, dịch vụ). Không tự thêm dịch vụ tốn phí.",
    "- Mỗi ý là một dòng riêng để tôi dán thẳng vào CMS, không dùng bảng, không dùng HTML.",
    "",
    "ĐỊNH DẠNG TRẢ LỜI (giữ đúng thứ tự, in đậm tên phần):",
    "### 1. Nhận xét nhanh (tối đa 5 gạch đầu dòng, chỉ ra chỗ thiếu hoặc mâu thuẫn)",
    ...wanted.map(
      (entry, index) =>
        `### ${index + 2}. ${entry.label} — nội dung mới để dán vào ô "${entry.target}"`,
    ),
    "",
    "Kết thúc bằng: \"---\" rồi 3 câu hỏi ngắn nếu cần thêm thông tin thật để viết chính xác hơn.",
    "Không chào hỏi, không nhắc lại nguyên văn nội dung tôi đã gửi, không giải thích ngoài lề.",
    "",
    "=== NỘI DUNG TOUR HIỆN TẠI ===",
    tourSnapshot(data, options.references, new Set(keys)),
    "=== HẾT NỘI DUNG ===",
  ].join("\n");
}

/**
 * ChatGPT accepts the composer text through `?q=`. When the prompt is too long
 * for a URL we return the plain homepage and let the caller rely on the
 * clipboard instead.
 */
export function buildChatGptComposerUrl(prompt: string): {
  url: string;
  prefilled: boolean;
} {
  const candidate = `${CHATGPT_HOME_URL}?q=${encodeURIComponent(prompt)}`;
  if (candidate.length <= CHATGPT_PREFILL_LIMIT) {
    return { url: candidate, prefilled: true };
  }
  return { url: CHATGPT_HOME_URL, prefilled: false };
}
