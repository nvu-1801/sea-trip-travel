"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { AlertIcon } from "@/components/ui/icons";
import { Container, Section } from "@/components/ui/layout";

/**
 * Route-level error boundary.
 *
 * Next.js 16 renamed the recovery callback to `retry` (it was `reset` in
 * earlier versions). The fallback keeps the site header/footer visible and
 * always leaves the visitor a way to reach a human.
 *
 * A Client Component cannot read the server catalog, so the (small) error copy
 * is kept as a two-language map here rather than shipping the whole dictionary.
 * `error.digest` is the only thing logged — never the message, which may contain
 * customer data.
 */
const COPY = {
  vi: {
    title: "Có lỗi xảy ra khi tải trang",
    description:
      "Bạn thử tải lại. Nếu lỗi vẫn tiếp diễn, vui lòng gọi hotline để được hỗ trợ trực tiếp.",
    codeLabel: "Mã lỗi kỹ thuật:",
    retry: "Thử lại",
    home: "Về trang chủ",
    contact: "Liên hệ tư vấn",
    homeHref: "/",
    contactHref: "/lien-he",
  },
  en: {
    title: "Something went wrong while loading the page",
    description:
      "Please try reloading. If the problem continues, call our hotline for direct help.",
    codeLabel: "Technical error code:",
    retry: "Try again",
    home: "Back to home",
    contact: "Contact us",
    homeHref: "/en",
    contactHref: "/en/lien-he",
  },
} as const;

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const t = params?.locale === "en" ? COPY.en : COPY.vi;

  useEffect(() => {
    console.error(`[error-boundary] digest=${error.digest ?? "n/a"}`);
  }, [error]);

  return (
    <Section tone="default" spacing="loose">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft">
            <AlertIcon className="h-8 w-8 text-danger" />
          </span>
          <h1 className="mt-6 text-display font-display font-semibold text-foreground">{t.title}</h1>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-foreground-muted">
            {t.description}
          </p>

          {error.digest ? (
            <p className="mt-3 text-xs text-foreground-subtle">
              {t.codeLabel} <code className="font-mono">{error.digest}</code>
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => retry()}>
              {t.retry}
            </Button>
            <ButtonLink href={t.homeHref} variant="secondary" size="lg">
              {t.home}
            </ButtonLink>
            <ButtonLink href={t.contactHref} variant="ghost" size="lg">
              {t.contact}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}
