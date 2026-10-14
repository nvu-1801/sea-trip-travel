"use client";

import { useEffect, useId, useRef, useState } from "react";
import { leadInputSchema, type LeadResponse, type UtmParams } from "@/domain/lead";
import type { Locale } from "@/i18n/config";
import { siteConfig } from "@/config/site";
import { CheckCircleIcon, AlertIcon, SendIcon, SpinnerIcon } from "@/components/ui/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { DatePicker, type DatePickerLabels } from "@/components/ui/date-picker";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import { setFormDirty } from "./draft-guard";

/**
 * Consultation request form.
 *
 * Shared by the contact page and the tour detail page (`tourSlug`/`tourTitle`
 * pre-fill the form). Validation reuses the *same* Zod schema the API route
 * uses, so client and server can never disagree about what is valid.
 *
 * The visitor's language travels with the request (`locale`) and every visible
 * string comes from `labels`, so the server never has to send Vietnamese copy to
 * an English form.
 */

export type LeadFormLabels = {
  optional: string;
  company: string;
  fields: {
    fullName: string;
    phone: string;
    email: string;
    interest: string;
    travelDate: string;
    partySize: string;
    message: string;
  };
  hints: { phone: string; travelDate: string; partySize: string; message: string };
  placeholders: {
    fullName: string;
    phone: string;
    email: string;
    interest: string;
    partySize: string;
    message: string;
  };
  consent: { pre: string; link: string; post: string; hint: string };
  submit: string;
  submitting: string;
  submittingSr: string;
  errorSr: string;
  footnote: string;
  genericError: string;
  networkError: string;
  success: {
    title: string;
    requestId: string;
    body: string;
    callHotline: string;
    sendAnother: string;
  };
  validation: {
    fullName: string;
    phone: string;
    email: string;
    interest: string;
    travelDate: string;
    partySize: string;
    message: string;
    consent: string;
    form: string;
  };
  /** API error code → template (may contain `{phone}`). */
  errors: Record<string, string>;
  hotline: string;
  /** Localized privacy-policy path. */
  privacyHref: string;
  datePicker: DatePickerLabels;
};

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
  locale,
  labels,
  tourSlug,
  defaultInterest,
  className,
  compact = false,
}: {
  locale: Locale;
  labels: LeadFormLabels;
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

  /** Map a Zod issue path to the localized message for that field. */
  const messageFor = (field: string): string => {
    const key = field as keyof LeadFormLabels["validation"];
    return labels.validation[key] ?? labels.validation.form;
  };

  const update = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setFormDirty(true);
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
      locale,
      ...(tourSlug ? { tourSlug } : {}),
      ...collectContext(),
    };

    // 1. Client validation with the shared schema.
    const parsed = clientSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        errors[key] = [...(errors[key] ?? []), messageFor(key)];
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
        setFormDirty(false);
        return;
      }

      // 3. Failure — keep every value the customer entered. Messages are
      //    localized on the client from the structured error code, never from
      //    the (Vietnamese) server string.
      const error = data && !data.ok ? data.error : null;
      if (error?.fieldErrors) {
        const mapped: Record<string, string[]> = {};
        for (const field of Object.keys(error.fieldErrors)) {
          mapped[field] = [messageFor(field)];
        }
        setFieldErrors(mapped);
      }
      const template = error ? labels.errors[error.code] : undefined;
      setSystemMessage(
        (template ?? labels.genericError).replace("{phone}", siteConfig.contact.hotline),
      );
      setStatus("error");
      if (error?.fieldErrors) focusFirstError(error.fieldErrors);
    } catch {
      setSystemMessage(labels.networkError);
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
          <h3 className="text-xl font-bold text-foreground">{labels.success.title}</h3>
          {requestId ? (
            <p className="mt-1 text-sm text-foreground-muted">
              {labels.success.requestId}{" "}
              <strong className="font-semibold text-foreground">{requestId}</strong>
            </p>
          ) : null}
        </div>
        <p className="text-[0.9375rem] leading-relaxed text-foreground-muted">
          {labels.success.body}
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            href={siteConfig.contact.hotlineHref}
            variant="secondary"
            size="md"
            external
          >
            {labels.success.callHotline}
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
            {labels.success.sendAnother}
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
        <label htmlFor={id("company")}>{labels.company}</label>
        <input
          id={id("company")}
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          id={id("fullName")}
          label={labels.fields.fullName}
          required
          optionalLabel={labels.optional}
          error={errorFor("fullName")}
        >
          <Input
            id={id("fullName")}
            name="fullName"
            autoComplete="name"
            value={values.fullName}
            invalid={Boolean(errorFor("fullName"))}
            aria-describedby={`${id("fullName")}-message`}
            onChange={(event) => update("fullName", event.target.value)}
            placeholder={labels.placeholders.fullName}
          />
        </Field>

        <Field
          id={id("phone")}
          label={labels.fields.phone}
          required
          optionalLabel={labels.optional}
          error={errorFor("phone")}
          hint={labels.hints.phone}
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
            placeholder={labels.placeholders.phone}
          />
        </Field>

        <Field
          id={id("email")}
          label={labels.fields.email}
          optionalLabel={labels.optional}
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
            placeholder={labels.placeholders.email}
          />
        </Field>

        <Field
          id={id("interest")}
          label={labels.fields.interest}
          optionalLabel={labels.optional}
          error={errorFor("interest")}
        >
          <Input
            id={id("interest")}
            name="interest"
            value={values.interest}
            invalid={Boolean(errorFor("interest"))}
            aria-describedby={`${id("interest")}-message`}
            onChange={(event) => update("interest", event.target.value)}
            placeholder={labels.placeholders.interest}
          />
        </Field>

        <Field
          id={id("travelDate")}
          label={labels.fields.travelDate}
          optionalLabel={labels.optional}
          error={errorFor("travelDate")}
          hint={labels.hints.travelDate}
        >
          <DatePicker
            id={id("travelDate")}
            value={values.travelDate}
            invalid={Boolean(errorFor("travelDate"))}
            describedBy={`${id("travelDate")}-message`}
            labels={labels.datePicker}
            onChange={(next) => update("travelDate", next)}
          />
        </Field>

        <Field
          id={id("partySize")}
          label={labels.fields.partySize}
          optionalLabel={labels.optional}
          error={errorFor("partySize")}
          hint={labels.hints.partySize}
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
            placeholder={labels.placeholders.partySize}
          />
        </Field>
      </div>

      <Field
        id={id("message")}
        label={labels.fields.message}
        optionalLabel={labels.optional}
        error={errorFor("message")}
        hint={labels.hints.message}
      >
        <Textarea
          id={id("message")}
          name="message"
          rows={compact ? 3 : 4}
          value={values.message}
          invalid={Boolean(errorFor("message"))}
          aria-describedby={`${id("message")}-message`}
          onChange={(event) => update("message", event.target.value)}
          placeholder={labels.placeholders.message}
        />
      </Field>

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
            {labels.consent.pre}{" "}
            <a
              href={labels.privacyHref}
              className="font-semibold text-primary-strong underline underline-offset-2"
            >
              {labels.consent.link}
            </a>
            {labels.consent.post}
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
          {errorFor("consent") ?? labels.consent.hint}
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
              {labels.submitting}
            </>
          ) : (
            <>
              <SendIcon className="h-4 w-4" />
              {labels.submit}
            </>
          )}
        </Button>
        <p className="text-xs leading-relaxed text-foreground-subtle">{labels.footnote}</p>
      </div>

      <div aria-live="polite" className="sr-only">
        {status === "submitting" ? labels.submittingSr : ""}
        {status === "error" ? labels.errorSr : ""}
      </div>
    </form>
  );
}
