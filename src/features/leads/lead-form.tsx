"use client";

import { useEffect, useId, useRef, useState } from "react";
import { leadInputSchema, type LeadResponse, type UtmParams } from "@/domain/lead";
import { siteConfig } from "@/config/site";
import { CheckCircleIcon, AlertIcon, SendIcon, SpinnerIcon } from "@/components/ui/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

/**
 * Consultation request form.
 *
 * Shared by the contact page and the tour detail page (`tourSlug`/`tourTitle`
 * pre-fill the form). Validation reuses the *same* Zod schema the API route
 * uses, so client and server can never disagree about what is valid.
 *
 * Behaviour required by the brief, implemented here:
 *  - loading, per-field errors, system error and success states
 *  - double-submit blocked (disabled control + in-flight guard + idempotency key)
 *  - on failure every value the customer typed is kept
 *  - never claims an email was sent; reports that the request was received
 */

const clientSchema = leadInputSchema.omit({ company: true, submissionId: true });

type Values = {
  fullName: string;
  phone: string;
  email: string;
  interest: string;
  travelDate: string;
  partySize: string;
  message: string;
  consent: boolean;
};

const EMPTY: Values = {
  fullName: "",
  phone: "",
  email: "",
  interest: "",
  travelDate: "",
  partySize: "",
  message: "",
  consent: false,
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/** Pathname only, plus whitelisted UTM keys — never the raw query string. */
function collectContext(): { sourcePage?: string; utm?: UtmParams } {
  if (typeof window === "undefined") return {};
  const { pathname, searchParams } = new URL(window.location.href);
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = searchParams.get(key);
    if (value) utm[key.replace("utm_", "")] = value.slice(0, 120);
  }
  return {
    sourcePage: pathname,
    ...(Object.keys(utm).length > 0 ? { utm: utm as UtmParams } : {}),
  };
}

export function LeadForm({
  tourSlug,
  defaultInterest,
  className,
  compact = false,
}: {
  /** Pre-fills and links the request to a specific tour. */
  tourSlug?: string;
  defaultInterest?: string;
  className?: string;
  compact?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `lead-${uid}-${name}`;

  const [values, setValues] = useState<Values>({
    ...EMPTY,
    interest: defaultInterest ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const submittingRef = useRef(false);
  const submissionIdRef = useRef<string | null>(null);

  // Client-only value, generated after hydration so SSR and client agree.
  useEffect(() => {
    submissionIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sub-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }, []);

  const update = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    // Clear the field error as soon as the customer edits that field.
    setFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key as string];
      return next;
    });
  };

  const focusFirstError = (errors: Record<string, string[]>) => {
    const first = Object.keys(errors)[0];
    if (!first) return;
    const element = document.getElementById(id(first));
    element?.focus();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const payload = {
      ...values,
      ...(tourSlug ? { tourSlug } : {}),
      ...collectContext(),
    };

    // 1. Client validation with the shared schema.
    const parsed = clientSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        errors[key] = [...(errors[key] ?? []), issue.message];
      }
      setFieldErrors(errors);
      setStatus("idle");
      setSystemMessage(null);
      focusFirstError(errors);
      return;
    }

    // 2. Submit.
    submittingRef.current = true;
    setStatus("submitting");
    setSystemMessage(null);
    setFieldErrors({});

    const honeypot = (event.currentTarget.elements.namedItem("company") as HTMLInputElement | null)
      ?.value;

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          company: honeypot ?? "",
          ...(submissionIdRef.current ? { submissionId: submissionIdRef.current } : {}),
        }),
      });

      const data = (await response.json().catch(() => null)) as LeadResponse | null;

      if (response.ok && data?.ok) {
        setRequestId(data.requestId);
        setStatus("success");
        setValues({ ...EMPTY, interest: defaultInterest ?? "" });
        return;
      }

      // 3. Failure — keep every value the customer entered.
      const error = data && !data.ok ? data.error : null;
      if (error?.fieldErrors) setFieldErrors(error.fieldErrors);
      setSystemMessage(
        error?.message ??
          "Chưa gửi được yêu cầu. Vui lòng kiểm tra kết nối và thử lại, hoặc gọi hotline để được hỗ trợ.",
      );
      setStatus("error");
      if (error?.fieldErrors) focusFirstError(error.fieldErrors);
    } catch {
      setSystemMessage(
        "Không kết nối được tới hệ thống. Vui lòng kiểm tra đường truyền và thử lại.",
      );
      setStatus("error");
    } finally {
      submittingRef.current = false;
    }
  };

  const errorFor = (name: keyof Values) => fieldErrors[name]?.[0];

  if (status === "success") {
    return (
      <div
        className={cn(
          "flex flex-col items-start gap-4 rounded-2xl border border-success/25 bg-success-soft p-6 sm:p-8",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <CheckCircleIcon className="h-10 w-10 text-success" />
        <div>
          <h3 className="text-xl font-bold text-foreground">Đã tiếp nhận yêu cầu của bạn</h3>
          {requestId ? (
            <p className="mt-1 text-sm text-foreground-muted">
              Mã yêu cầu: <strong className="font-semibold text-foreground">{requestId}</strong>
            </p>
          ) : null}
        </div>
        <p className="text-[0.9375rem] leading-relaxed text-foreground-muted">
          Bộ phận tư vấn của SEA TRIP sẽ liên hệ trong giờ làm việc. Nếu cần trao đổi ngay, bạn có
          thể gọi hotline để được hỗ trợ sớm hơn.
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            href={siteConfig.contact.hotlineHref}
            variant="secondary"
            size="md"
            external
          >
            Gọi hotline
          </ButtonLink>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              setStatus("idle");
              setRequestId(null);
              setSystemMessage(null);
            }}
          >
            Gửi yêu cầu khác
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={status === "submitting"}
      className={cn("flex flex-col gap-5", className)}
    >
      {/* Honeypot: off-screen, not announced, not tabbable. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor={id("company")}>Công ty</label>
        <input
          id={id("company")}
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id("fullName")} label="Họ tên" required error={errorFor("fullName")}>
          <Input
            id={id("fullName")}
            name="fullName"
            autoComplete="name"
            value={values.fullName}
            invalid={Boolean(errorFor("fullName"))}
            aria-describedby={`${id("fullName")}-message`}
            onChange={(event) => update("fullName", event.target.value)}
            placeholder="Nguyễn Văn A"
          />
        </Field>

        <Field
          id={id("phone")}
          label="Số điện thoại"
          required
          error={errorFor("phone")}
          hint="Sẽ gọi qua số này"
        >
          <Input
            id={id("phone")}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            invalid={Boolean(errorFor("phone"))}
            aria-describedby={`${id("phone")}-message`}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="0987 654 321"
          />
        </Field>

        <Field
          id={id("email")}
          label="Email"
          error={errorFor("email")}
        >
          <Input
            id={id("email")}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            invalid={Boolean(errorFor("email"))}
            aria-describedby={`${id("email")}-message`}
            onChange={(event) => update("email", event.target.value)}
            placeholder="ban@email.com"
          />
        </Field>

        <Field id={id("interest")} label="Tour / điểm đến" error={errorFor("interest")}>
          <Input
            id={id("interest")}
            name="interest"
            value={values.interest}
            invalid={Boolean(errorFor("interest"))}
            aria-describedby={`${id("interest")}-message`}
            onChange={(event) => update("interest", event.target.value)}
            placeholder="Quy Nhơn – Phú Yên 3 ngày"
          />
        </Field>

        <Field
          id={id("travelDate")}
          label="Ngày dự kiến"
          error={errorFor("travelDate")}
          hint="Bỏ trống nếu chưa chắc"
        >
          <DatePicker
            id={id("travelDate")}
            value={values.travelDate}
            invalid={Boolean(errorFor("travelDate"))}
            describedBy={`${id("travelDate")}-message`}
            onChange={(next) => update("travelDate", next)}
          />
        </Field>

        <Field
          id={id("partySize")}
          label="Số người"
          error={errorFor("partySize")}
          hint="Tối đa 60 khách"
        >
          <Input
            id={id("partySize")}
            name="partySize"
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            value={values.partySize}
            invalid={Boolean(errorFor("partySize"))}
            aria-describedby={`${id("partySize")}-message`}
            onChange={(event) => update("partySize", event.target.value)}
            placeholder="2"
          />
        </Field>
      </div>

      <Field
        id={id("message")}
        label="Nội dung yêu cầu"
        error={errorFor("message")}
        hint="Thời gian rảnh, ngân sách, yêu cầu riêng…"
      >
        <Textarea
          id={id("message")}
          name="message"
          rows={compact ? 3 : 4}
          value={values.message}
          invalid={Boolean(errorFor("message"))}
          aria-describedby={`${id("message")}-message`}
          onChange={(event) => update("message", event.target.value)}
          placeholder="Ví dụ: Gia đình 4 người, muốn đi 3 ngày 2 đêm, ưu tiên biển và hải sản."
        />
      </Field>

      {/* Consent gets its own layout (no separate field label — the sentence IS
          the label) and tints once checked. */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={id("consent")}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-strong bg-surface p-3.5 text-sm leading-relaxed text-foreground-muted transition-colors duration-200 hover:border-brand-200 has-checked:border-brand-300 has-checked:bg-primary-soft/70 has-checked:text-foreground"
        >
          <Checkbox
            id={id("consent")}
            name="consent"
            checked={values.consent}
            invalid={Boolean(errorFor("consent"))}
            aria-describedby={`${id("consent")}-message`}
            onChange={(event) => update("consent", event.target.checked)}
          />
          <span>
            Tôi đồng ý để SEA TRIP TRAVEL liên hệ tư vấn qua số điện thoại hoặc email đã cung cấp,
            và đã đọc{" "}
            <a
              href="/chinh-sach-bao-mat"
              className="font-semibold text-primary-strong underline underline-offset-2"
            >
              chính sách xử lý thông tin liên hệ
            </a>
            .
          </span>
        </label>
        <p
          id={`${id("consent")}-message`}
          role={errorFor("consent") ? "alert" : undefined}
          className={cn(
            "flex min-h-4 items-start gap-1.5 text-xs leading-4",
            errorFor("consent") ? "font-medium text-danger" : "text-foreground-subtle",
          )}
        >
          {errorFor("consent") ? (
            <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
          ) : null}
          {errorFor("consent") ?? "Bắt buộc để SEA TRIP được phép liên hệ bạn"}
        </p>
      </div>

      {systemMessage ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-foreground"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p>{systemMessage}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="submit"
          size="lg"
          disabled={status === "submitting"}
          className="w-full sm:w-auto"
        >
          {status === "submitting" ? (
            <>
              <SpinnerIcon className="h-4 w-4" />
              Đang gửi…
            </>
          ) : (
            <>
              <SendIcon className="h-4 w-4" />
              Gửi yêu cầu tư vấn
            </>
          )}
        </Button>
        <p className="text-xs leading-relaxed text-foreground-subtle">
          SEA TRIP chỉ dùng thông tin này để liên hệ tư vấn. Không đăng ký nhận tin quảng cáo.
        </p>
      </div>

      <div aria-live="polite" className="sr-only">
        {status === "submitting" ? "Đang gửi yêu cầu" : ""}
        {status === "error" ? "Gửi yêu cầu chưa thành công" : ""}
      </div>
    </form>
  );
}
