"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { AlertIcon } from "@/components/ui/icons";
import { Container, Section } from "@/components/ui/layout";

/**
 * Route-level error boundary.
 *
 * Next.js 16 renamed the recovery callback to `retry` (it was `reset` in
 * earlier versions). The fallback keeps the site header/footer visible and
 * always leaves the visitor a way to reach a human.
 */
export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Log the digest only — never the message, which may contain customer data.
    console.error(`[error-boundary] digest=${error.digest ?? "n/a"}`);
  }, [error]);

  return (
    <Section tone="default" spacing="loose">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft">
            <AlertIcon className="h-8 w-8 text-danger" />
          </span>
          <h1 className="mt-6 text-display-sm font-extrabold text-foreground">
            Có lỗi xảy ra khi tải trang
          </h1>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-foreground-muted">
            Bạn thử tải lại. Nếu lỗi vẫn tiếp diễn, vui lòng gọi hotline để được hỗ trợ trực tiếp.
          </p>

          {error.digest ? (
            <p className="mt-3 text-xs text-foreground-subtle">
              Mã lỗi kỹ thuật: <code className="font-mono">{error.digest}</code>
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => retry()}>
              Thử lại
            </Button>
            <ButtonLink href="/" variant="secondary" size="lg">
              Về trang chủ
            </ButtonLink>
            <ButtonLink href="/lien-he" variant="ghost" size="lg">
              Liên hệ tư vấn
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}
