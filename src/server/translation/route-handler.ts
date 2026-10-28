import { z } from "zod";
import {
  LANDING_SECTIONS,
  TRANSLATION_KINDS,
  TRANSLATION_LIMITS,
  isAllowedTranslationPath,
  isLandingTranslationSection,
  translationCharacterCount,
  type TranslationKind,
} from "@/domain/translation";
import type { TranslationBudgetDecision } from "@/domain/translation-budget";
import { requireSession } from "@/server/cms/auth";
import { HttpError } from "@/server/cms/auth";
import { handle, jsonBody, reply } from "@/server/cms/http";
import { consumeLimit } from "@/server/cms/store";
import {
  TranslationInvalidResponseError,
  TranslationNotConfiguredError,
  TranslationTimeoutError,
  TranslationUpstreamError,
  translateWithGoogle,
} from "./google-cloud";
import {
  consumeTranslationBudget,
  refundTranslationBudget,
} from "./budget";

export type TranslationHandlerDeps = {
  requireSession: (request: Request) => Promise<{ hash: string }>;
  consumeLimit: (key: string, max: number, windowMs: number) => boolean;
  consumeBudget: (characters: number) => TranslationBudgetDecision;
  refundBudget: (characters: number) => void;
  translate: (values: readonly string[]) => Promise<string[]>;
};

const fieldSchema = z.object({
  path: z.string().min(1).max(120),
  value: z
    .string()
    .min(1)
    .max(TRANSLATION_LIMITS.maxFieldChars),
});

const requestSchema = z
  .object({
    kind: z.enum(TRANSLATION_KINDS),
    section: z.enum(LANDING_SECTIONS).optional(),
    fields: z
      .array(fieldSchema)
      .min(1)
      .max(TRANSLATION_LIMITS.maxFields),
  })
  .strict();

const defaultDeps: TranslationHandlerDeps = {
  requireSession,
  consumeLimit,
  consumeBudget: (characters) => consumeTranslationBudget(characters),
  refundBudget: (characters) => refundTranslationBudget(characters),
  translate: (values) =>
    translateWithGoogle(values, {
      apiKey: process.env.GOOGLE_TRANSLATE_API_KEY ?? "",
    }),
};

const formatNumber = (value: number) => value.toLocaleString("vi-VN");

/**
 * The message names the exact counter, the spent amount and the env var, so the
 * owner can decide between waiting for the reset and raising the limit.
 */
function budgetExceededMessage(budget: TranslationBudgetDecision): string {
  if (budget.reason === "month") {
    return (
      `Đã dùng ${formatNumber(budget.usage.monthChars)}/${formatNumber(budget.limits.monthlyChars)} ` +
      `ký tự dịch miễn phí của tháng này; lần dịch này cần ${formatNumber(budget.characters)} ký tự. ` +
      "Hạn mức đặt lại vào đầu tháng sau (giờ Việt Nam). Muốn dịch thêm thì tăng TRANSLATION_MONTHLY_CHAR_LIMIT trên máy chủ."
    );
  }
  return (
    `Hạn mức ${formatNumber(budget.limits.dailyChars)} ký tự dịch mỗi ngày đã dùng ${formatNumber(budget.usage.dayChars)}; ` +
    `lần dịch này cần ${formatNumber(budget.characters)} ký tự. ` +
    "Hạn mức đặt lại sau 0h giờ Việt Nam. Muốn dịch thêm hôm nay thì tăng TRANSLATION_DAILY_CHAR_LIMIT trên máy chủ."
  );
}

/**
 * Auth, CSRF/origin, rate limit, Zod allowlist and provider call for the
 * Studio translation button. Dependencies are injectable so tests never touch
 * Google or a session cookie.
 */
export function handleTranslate(
  request: Request,
  deps: TranslationHandlerDeps = defaultDeps,
): Promise<Response> {
  return handle(async () => {
    const session = await deps.requireSession(request);

    if (
      !deps.consumeLimit(
        `translate:${session.hash}`,
        TRANSLATION_LIMITS.requestsPerMinute,
        60_000,
      ) ||
      !deps.consumeLimit(
        "translate:global",
        TRANSLATION_LIMITS.globalRequestsPerMinute,
        60_000,
      )
    ) {
      throw new HttpError(
        429,
        "Bạn đã dịch quá nhiều lần. Vui lòng thử lại sau một phút.",
      );
    }

    const input = requestSchema.parse(
      await jsonBody(request, TRANSLATION_LIMITS.maxRequestBodyBytes),
    );

    if (input.kind === "landing") {
      if (!input.section || !isLandingTranslationSection(input.section)) {
        throw new HttpError(400, "Phần nội dung cần dịch không hợp lệ.");
      }
    } else if (input.section) {
      throw new HttpError(400, "Phần nội dung cần dịch không hợp lệ.");
    }

    const seen = new Set<string>();
    let characters = 0;
    for (const field of input.fields) {
      if (!isAllowedTranslationPath(input.kind, field.path, input.section)) {
        throw new HttpError(400, "Trường nội dung không được phép dịch.");
      }
      if (seen.has(field.path)) {
        throw new HttpError(400, "Danh sách trường dịch bị trùng.");
      }
      seen.add(field.path);
      characters += [...field.value].length;
    }

    if (characters > TRANSLATION_LIMITS.maxTotalChars) {
      throw new HttpError(
        413,
        `Nội dung cần dịch vượt quá ${TRANSLATION_LIMITS.maxTotalChars.toLocaleString("vi-VN")} ký tự. Hãy dịch theo từng phần.`,
      );
    }

    // Reserve the characters before the provider call: the free tier is billed
    // per character, so the guard must never let a burst slip past the quota.
    const budget = deps.consumeBudget(characters);
    if (!budget.allowed) {
      throw new HttpError(429, budgetExceededMessage(budget));
    }

    let translations: string[];
    try {
      translations = await deps.translate(input.fields.map((field) => field.value));
    } catch (error) {
      if (error instanceof TranslationNotConfiguredError) {
        // No key means no request ever left the server, so nothing was billed.
        deps.refundBudget(budget.characters);
        throw new HttpError(
          503,
          "Chưa cấu hình Google Translate trên máy chủ. Liên hệ người quản trị website.",
        );
      }
      if (error instanceof TranslationTimeoutError) {
        throw new HttpError(
          504,
          "Dịch vụ dịch phản hồi quá lâu. Nội dung trong form được giữ nguyên; hãy thử lại.",
        );
      }
      if (error instanceof TranslationUpstreamError) {
        if (error.status === 429) {
          throw new HttpError(
            429,
            "Dịch vụ dịch đang giới hạn tần suất. Vui lòng thử lại sau.",
          );
        }
        throw new HttpError(
          502,
          "Dịch vụ dịch tạm thời không khả dụng. Nội dung trong form được giữ nguyên.",
        );
      }
      if (error instanceof TranslationInvalidResponseError) {
        throw new HttpError(
          502,
          "Bản dịch trả về không hợp lệ. Nội dung trong form được giữ nguyên; hãy thử lại.",
        );
      }
      throw error;
    }

    if (
      !Array.isArray(translations) ||
      translations.length !== input.fields.length ||
      translations.some(
        (value) => typeof value !== "string" || !value.trim(),
      )
    ) {
      throw new HttpError(
        502,
        "Bản dịch trả về không hợp lệ. Nội dung trong form được giữ nguyên.",
      );
    }

    console.info(
      `[translate] kind=${input.kind as TranslationKind} fields=${input.fields.length} chars=${translationCharacterCount(
        input.fields.map((field) => field.value),
      )} day=${budget.usage.dayChars}/${budget.limits.dailyChars} month=${budget.usage.monthChars}/${budget.limits.monthlyChars}`,
    );

    return reply({
      translations: input.fields.map((field, index) => ({
        path: field.path,
        value: translations[index],
      })),
      usage: {
        characters: budget.characters,
        day: {
          used: budget.usage.dayChars,
          limit: budget.limits.dailyChars,
          remaining: budget.remaining.day,
        },
        month: {
          used: budget.usage.monthChars,
          limit: budget.limits.monthlyChars,
          remaining: budget.remaining.month,
        },
      },
    });
  });
}
