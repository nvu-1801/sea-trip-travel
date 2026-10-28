import "server-only";
import {
  TRANSLATION_LIMITS,
  batchTranslationTexts,
} from "@/domain/translation";
import {
  decodeTranslationEntities,
  protectTranslationText,
  restoreTranslationText,
} from "@/domain/translation-protect";

/**
 * Google Cloud Translation Basic (v2) over REST.
 *
 * Deliberately SDK-free: the endpoint is a single JSON POST documented at
 * https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate
 * (`q` accepts at most 128 strings, `format=text`, `key` in the query string).
 * The key therefore never appears in a log line or an error message.
 */

export class TranslationNotConfiguredError extends Error {
  constructor() {
    super("Chưa cấu hình Google Translate.");
  }
}

export class TranslationTimeoutError extends Error {
  constructor() {
    super("Dịch vụ dịch phản hồi quá lâu.");
  }
}

export class TranslationUpstreamError extends Error {
  constructor(public readonly status: number) {
    super("Dịch vụ dịch trả về lỗi.");
  }
}

export class TranslationInvalidResponseError extends Error {
  constructor() {
    super("Bản dịch trả về không hợp lệ.");
  }
}

export type GoogleTranslateOptions = {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Aborted when the admin closes the request; timeout also aborts. */
  signal?: AbortSignal;
};

const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";

function timeoutOf(value: number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.min(value, 60_000);
  }
  return TRANSLATION_LIMITS.timeoutMs;
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

type GooglePayload = {
  data?: {
    translations?: { translatedText?: unknown }[];
  };
};

/** Translate plain-text leaves VI → EN, restoring tokens that must not change. */
export async function translateWithGoogle(
  values: readonly string[],
  options: GoogleTranslateOptions = {},
): Promise<string[]> {
  const apiKey = (options.apiKey ?? process.env.GOOGLE_TRANSLATE_API_KEY ?? "").trim();
  if (!apiKey) throw new TranslationNotConfiguredError();
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = timeoutOf(
    options.timeoutMs ??
      Number(process.env.GOOGLE_TRANSLATE_TIMEOUT_MS || TRANSLATION_LIMITS.timeoutMs),
  );

  const output: string[] = [];
  for (const batch of batchTranslationTexts(values)) {
    const protectedBatch = batch.map(protectTranslationText);
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout;
    const url = new URL(ENDPOINT);
    url.searchParams.set("key", apiKey);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          q: protectedBatch.map((item) => item.text),
          source: "vi",
          target: "en",
          format: "text",
        }),
        signal,
        cache: "no-store",
      });
    } catch (error) {
      if (isAbort(error) || timeout.aborted) throw new TranslationTimeoutError();
      throw new TranslationUpstreamError(0);
    }

    if (!response.ok) throw new TranslationUpstreamError(response.status);

    let payload: GooglePayload;
    try {
      payload = (await response.json()) as GooglePayload;
    } catch {
      if (timeout.aborted) throw new TranslationTimeoutError();
      throw new TranslationInvalidResponseError();
    }

    const translations = payload?.data?.translations;
    if (!Array.isArray(translations) || translations.length !== batch.length) {
      throw new TranslationInvalidResponseError();
    }

    translations.forEach((entry, index) => {
      const raw = entry?.translatedText;
      if (typeof raw !== "string" || !raw.trim()) {
        throw new TranslationInvalidResponseError();
      }
      const restored = restoreTranslationText(
        decodeTranslationEntities(raw).trim(),
        protectedBatch[index].tokens,
      );
      if (!restored.restored || !restored.text.trim()) {
        throw new TranslationInvalidResponseError();
      }
      output.push(restored.text);
    });
  }

  return output;
}
