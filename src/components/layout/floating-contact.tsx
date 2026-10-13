"use client";

import { useSyncExternalStore } from "react";
import { useState } from "react";
import { siteConfig } from "@/config/site";
import { facebookLink, zaloLink } from "@/config/social-links";
import { cn } from "@/lib/utils";
import {
  ArrowUpIcon,
  ChatIcon,
  CloseIcon,
  FacebookIcon,
  PhoneIcon,
} from "@/components/ui/icons";
import {
  getScrollSnapshot,
  getServerScrollSnapshot,
  subscribeToScroll,
} from "./header-state";

/**
 * Floating contact rail, bottom-right.
 *
 * A single collapsible FAB keeps the corner quiet while still putting Zalo,
 * Facebook and the hotline one tap away — the three channels a Vietnamese
 * travel customer actually uses. Items fan upward with a staggered transition;
 * labels appear to the left on pointer devices.
 *
 * Zalo/Messenger brand colours are third-party identities, so they are declared
 * locally rather than as part of our semantic token set.
 *
 * On the tour detail page a fixed bottom bar exists on mobile, so the rail sits
 * above it (`bottom-24`).
 */
const ZALO_BLUE = "#0068ff";
const FACEBOOK_BLUE = "#1877f2";

type ContactItem = {
  key: string;
  label: string;
  href: string;
  /** Inline background, because third-party brand colours are not tokens. */
  background?: string;
  className?: string;
  icon: React.ReactNode;
};

export function FloatingContact() {
  const [open, setOpen] = useState(false);
  const { progress } = useSyncExternalStore(
    subscribeToScroll,
    getScrollSnapshot,
    getServerScrollSnapshot,
  );
  const showBackToTop = progress > 0.06;

  const items: readonly ContactItem[] = [
    {
      key: "zalo",
      label: "Chat Zalo",
      href: zaloLink.url,
      background: ZALO_BLUE,
      icon: <span className="text-[0.6875rem] font-extrabold tracking-tight">Zalo</span>,
    },
    {
      key: "facebook",
      label: "Facebook",
      href: facebookLink.url,
      background: FACEBOOK_BLUE,
      icon: <FacebookIcon className="h-5 w-5" />,
    },
    {
      key: "phone",
      label: `Gọi ${siteConfig.contact.hotline}`,
      href: siteConfig.contact.hotlineHref,
      className: "bg-primary-strong hover:bg-primary-strong-hover",
      icon: <PhoneIcon className="h-5 w-5" />,
    },
  ];

  const scrollToTop = () => {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2.5 lg:bottom-6 lg:right-6">
      {/* Back to top — appears once the visitor has committed to the page. */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Về đầu trang"
        tabIndex={showBackToTop ? 0 : -1}
        aria-hidden={!showBackToTop}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/95 text-foreground shadow-card backdrop-blur-sm",
          "transition-[opacity,transform,visibility] duration-300 ease-out hover:border-primary hover:text-primary-strong",
          showBackToTop
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible translate-y-2 scale-90 opacity-0",
        )}
      >
        <ArrowUpIcon className="h-4 w-4" />
      </button>

      {/* Contact channels */}
      <ul className="flex flex-col items-end gap-2.5">
        {items.map((item, index) => (
          <li key={item.key} className="group relative flex items-center">
            <span
              className={cn(
                "pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity duration-200",
                "group-hover:opacity-100 group-focus-within:opacity-100 lg:block",
              )}
            >
              {item.label}
            </span>

            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.label}
              tabIndex={open ? 0 : -1}
              style={{
                ...(item.background ? { backgroundColor: item.background } : {}),
                // Nearest item (last in the list) arrives first on expand.
                transitionDelay: open ? `${(items.length - 1 - index) * 55}ms` : "0ms",
              }}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-full text-white shadow-card",
                "transition-[opacity,transform,background-color] duration-300 ease-out",
                item.className,
                open
                  ? "translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none translate-y-3 scale-90 opacity-0",
              )}
            >
              {item.icon}
            </a>
          </li>
        ))}
      </ul>

      {/* Toggle */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="floating-contact-list"
        aria-label={open ? "Đóng liên hệ nhanh" : "Mở liên hệ nhanh"}
        data-focus-ring=""
        className="relative inline-flex h-13 w-13 items-center justify-center rounded-full brand-gradient text-white shadow-lifted transition-transform duration-300 ease-out hover:scale-105 active:scale-95"
      >
        {!open ? (
          <span
            aria-hidden="true"
            className="stt-pulse-ring absolute inset-0 rounded-full bg-brand-400/45"
          />
        ) : null}
        {open ? <CloseIcon className="h-5 w-5" /> : <ChatIcon className="h-6 w-6" />}
      </button>
    </div>
  );
}
