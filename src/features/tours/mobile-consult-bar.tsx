"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { PhoneIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Mobile sticky CTA.
 *
 * Two deliberate behaviours:
 *  - it only appears once the visitor has scrolled past the intro, so it does
 *    not crowd the first screen;
 *  - it hides while the consultation section is on screen, so it never covers
 *    the form or fight with the on-screen keyboard.
 */
export function MobileConsultBar({
  tourTitle,
  priceLabel,
}: {
  tourTitle: string;
  priceLabel: string;
}) {
  const [pastIntro, setPastIntro] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastIntro(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const target = document.getElementById("tu-van");
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setFormVisible(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const visible = pastIntro && !formVisible;

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(122,0,49,0.18)] backdrop-blur-md transition-transform duration-300 ease-out lg:hidden",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-foreground-subtle">
            {tourTitle}
          </p>
          <p className="truncate text-base font-extrabold text-foreground">{priceLabel}</p>
        </div>
        <a
          href={siteConfig.contact.hotlineHref}
          aria-label={`Gọi hotline ${siteConfig.contact.hotline}`}
          tabIndex={visible ? 0 : -1}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-primary-strong"
        >
          <PhoneIcon className="h-5 w-5" />
        </a>
        <ButtonLink
          href="#tu-van"
          size="md"
          className="shrink-0"
          tabIndex={visible ? 0 : -1}
        >
          Nhận tư vấn
        </ButtonLink>
      </div>
    </div>
  );
}
