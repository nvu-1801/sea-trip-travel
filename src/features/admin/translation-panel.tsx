"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  TRANSLATION_LIMITS,
  applyTranslationResults,
  collectTranslationFields,
  createTranslationSnapshot,
  existingTranslationCount,
  isLandingTranslationSection,
  translationCharacterCount,
  translationSourceSignature,
  type TranslationKind,
  type TranslationResult,
} from "@/domain/translation";

type Status =
  | { tone: "idle"; message: string }
  | { tone: "busy"; message: string }
  | { tone: "success"; message: string }
  | { tone: "warning"; message: string }
  | { tone: "error"; message: string };

/** Free-tier counters echoed by the API so the owner sees what is left. */
type BudgetLine = { used: number; limit: number; remaining: number | null };
type Usage = { characters: number; day: BudgetLine; month: BudgetLine };

const number = (value: number) => value.toLocaleString("vi-VN");

function parseUsage(payload: unknown): Usage | null {
  if (!payload || typeof payload !== "object") return null;
  const usage = (payload as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return null;

  const line = (value: unknown): BudgetLine | null => {
    if (!value || typeof value !== "object") return null;
    const { used, limit, remaining } = value as {
      used?: unknown;
      limit?: unknown;
      remaining?: unknown;
    };
    if (typeof used !== "number" || typeof limit !== "number") return null;
    if (remaining !== null && typeof remaining !== "number") return null;
    return { used, limit, remaining: remaining as number | null };
  };

  const day = line((usage as { day?: unknown }).day);
  const month = line((usage as { month?: unknown }).month);
  const characters = (usage as { characters?: unknown }).characters;
  if (!day || !month || typeof characters !== "number") return null;
  return { characters, day, month };
}

function budgetSummary(usage: Usage): string | null {
  if (usage.day.remaining === null) return null;
  return (
    `Còn ${number(usage.day.remaining)} ký tự miễn phí hôm nay ` +
    `(đã dùng ${number(usage.day.used)}/${number(usage.day.limit)}).`
  );
}

const IDLE_MESSAGE =
  "Chỉ dịch khi bạn bấm nút. Kết quả điền vào các trường EN của form, không tự lưu, xuất bản hay đánh dấu đã duyệt.";

function responseError(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }
  return fallback;
}

/**
 * Admin translation control. It is intentionally a single shared component so
 * every form gets the same confirm, busy/error states and race protection.
 *
 * The request carries only `{ path, value }` leaves from the domain allowlist.
 * Nothing is written to the CMS here — the caller merges the returned English
 * values into the unsaved form state.
 */
export function TranslationPanel({
  kind,
  section,
  data,
  csrf,
  onChange,
  disabled = false,
}: {
  kind: TranslationKind;
  section?: string;
  data: Record<string, unknown>;
  csrf: string;
  onChange: (next: Record<string, unknown>) => void;
  disabled?: boolean;
}) {
  const titleId = useId();
  const [status, setStatus] = useState<Status>({
    tone: "idle",
    message: IDLE_MESSAGE,
  });
  const [baseline, setBaseline] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [busy, setBusy] = useState(false);
  const dataRef = useRef(data);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const fields = collectTranslationFields(kind, data, section);
  const existing = existingTranslationCount(kind, data, section);
  const sourceSignature = translationSourceSignature(kind, data, section);
  const stale = baseline !== null && baseline !== sourceSignature;
  const characters = translationCharacterCount(fields.map((field) => field.value));
  const budgetNote = usage ? budgetSummary(usage) : null;
  const overLimit =
    fields.length > TRANSLATION_LIMITS.maxFields ||
    characters > TRANSLATION_LIMITS.maxTotalChars ||
    fields.some((field) => field.value.length > TRANSLATION_LIMITS.maxFieldChars);
  const available =
    !disabled && Boolean(csrf) && fields.length > 0 && !overLimit && !busy;

  async function translate() {
    if (!available) return;
    if (
      existing > 0 &&
      typeof window !== "undefined" &&
      !window.confirm(
        `${existing} trường tiếng Anh đã có nội dung. Ghi đè bằng bản dịch mới? Bạn có thể huỷ và tự sửa bản EN.`,
      )
    ) {
      setStatus({
        tone: "warning",
        message:
          "Đã giữ nguyên bản tiếng Anh hiện có; không có trường nào bị ghi đè.",
      });
      return;
    }

    const current = dataRef.current;
    const requestFields = collectTranslationFields(kind, current, section);
    if (requestFields.length === 0) {
      setStatus({
        tone: "warning",
        message: "Chưa có nội dung tiếng Việt để dịch.",
      });
      return;
    }
    const snapshot = createTranslationSnapshot(kind, current, section);
    const baselineAtSend = translationSourceSignature(kind, current, section);
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setBusy(true);
    setStatus({
      tone: "busy",
      message:
        "Đang dịch… Bạn vẫn có thể sửa nội dung; kết quả chỉ áp cho trường chưa bị thay đổi.",
    });

    try {
      const response = await fetch("/api/admin/translate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify({
          kind,
          ...(section ? { section } : {}),
          fields: requestFields.map((field) => ({
            path: field.path,
            value: field.value,
          })),
        }),
        signal: controller.signal,
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          responseError(
            payload,
            "Không thể dịch lúc này. Nội dung trong form được giữ nguyên.",
          ),
        );
      }

      const raw =
        payload &&
        typeof payload === "object" &&
        Array.isArray(
          (payload as { translations?: unknown }).translations,
        )
          ? (payload as { translations: unknown[] }).translations
          : null;
      if (!raw) throw new Error("Phản hồi dịch không hợp lệ. Không có dữ liệu nào bị thay đổi.");

      const wanted = new Set(requestFields.map((field) => field.path));
      const received = new Map<string, string>();
      for (const item of raw) {
        if (
          !item ||
          typeof item !== "object" ||
          typeof (item as { path?: unknown }).path !== "string" ||
          typeof (item as { value?: unknown }).value !== "string"
        ) {
          throw new Error("Phản hồi dịch không hợp lệ. Không có dữ liệu nào bị thay đổi.");
        }
        const { path, value } = item as { path: string; value: string };
        if (!wanted.has(path) || received.has(path) || !value.trim()) {
          throw new Error("Phản hồi dịch không hợp lệ. Không có dữ liệu nào bị thay đổi.");
        }
        received.set(path, value);
      }
      if (requestFields.some((field) => !received.has(field.path))) {
        throw new Error(
          "Phản hồi dịch thiếu trường. Không có dữ liệu nào bị thay đổi.",
        );
      }

      const results: TranslationResult[] = [...received].map(([path, value]) => ({
        path,
        value,
      }));
      const applied = applyTranslationResults(
        kind,
        dataRef.current,
        section,
        results,
        snapshot,
      );
      const nextUsage = parseUsage(payload);
      if (nextUsage) setUsage(nextUsage);

      if (applied.stale) {
        setBaseline(baselineAtSend);
        setStatus({
          tone: "warning",
          message:
            "Nội dung đã đổi cấu trúc trong lúc dịch nên không áp dụng bản dịch. Dữ liệu bạn vừa sửa được giữ nguyên; hãy bấm dịch lại.",
        });
        return;
      }

      if (applied.applied === 0) {
        setBaseline(baselineAtSend);
        setStatus({
          tone: "warning",
          message:
            "Bạn đã sửa các trường liên quan trong lúc chờ nên bản dịch không được ghi đè. Dữ liệu mới nhất trong form được giữ nguyên.",
        });
        return;
      }

      onChange(applied.data);
      setBaseline(baselineAtSend);
      setStatus({
        tone: "success",
        message:
          `Đã điền bản dịch vào ${applied.applied} trường.` +
          (applied.skipped > 0
            ? ` Giữ nguyên ${applied.skipped} trường bạn vừa sửa.`
            : "") +
          " Kiểm tra, sửa trực tiếp bản EN rồi lưu như bình thường." +
          (nextUsage && nextUsage.day.remaining !== null
            ? ` Còn ${number(nextUsage.day.remaining)} ký tự miễn phí hôm nay.`
            : ""),
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Không thể dịch lúc này. Nội dung trong form được giữ nguyên.",
      });
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  const role = status.tone === "error" ? "alert" : "status";

  return (
    <section className="adm-translate" aria-labelledby={titleId}>
      <div className="adm-translate-head">
        <div>
          <p className="adm-eyebrow">Trợ giúp biên tập</p>
          <h3 id={titleId}>Dịch nội dung sang tiếng Anh</h3>
          <p className="adm-hint">
            Dịch {fields.length} trường tiếng Việt đang có nội dung (
            {number(characters)} ký tự). Slug, URL, mã, giá, số liệu, ID và
            đường dẫn ảnh không được gửi đi.
          </p>
          {budgetNote ? <p className="adm-hint">{budgetNote}</p> : null}
        </div>
        <button
          type="button"
          className="adm-primary adm-translate-button"
          disabled={!available}
          aria-busy={busy}
          onClick={() => void translate()}
        >
          {busy ? "Đang dịch…" : "Dịch sang tiếng Anh"}
        </button>
      </div>

      {stale ? (
        <p className="adm-translate-note" data-tone="warning" role="status">
          Nội dung tiếng Việt đã thay đổi sau lần dịch. Bản tiếng Anh có thể cần
          cập nhật — chỉ dịch lại khi bạn muốn ghi đè.
        </p>
      ) : null}

      <p className="adm-translate-note" data-tone={status.tone} role={role}>
        {status.message}
      </p>

      {!csrf ? (
        <p className="adm-hint">
          Phiên làm việc chưa sẵn sàng. Tải lại trang quản trị rồi thử lại.
        </p>
      ) : fields.length === 0 ? (
        <p className="adm-hint">
          Chưa có trường tiếng Việt nào để dịch trong phần này.
        </p>
      ) : overLimit ? (
        <p className="adm-translate-note" data-tone="warning" role="status">
          Phần này có {fields.length} trường / {characters.toLocaleString("vi-VN")}{" "}
          ký tự, vượt giới hạn một lần dịch (
          {TRANSLATION_LIMITS.maxFields} trường,{" "}
          {TRANSLATION_LIMITS.maxTotalChars.toLocaleString("vi-VN")} ký tự). Hãy
          rút gọn hoặc dịch theo từng phần nhỏ hơn.
        </p>
      ) : null}

      {kind === "landing" && section && !isLandingTranslationSection(section) ? (
        <p className="adm-hint">Phần này không có bản tiếng Anh tương ứng.</p>
      ) : null}
    </section>
  );
}
