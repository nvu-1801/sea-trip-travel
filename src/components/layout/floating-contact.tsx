"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
 * ## Pointer events
 *
 * The wrapper is a `fixed` flex column, so its box is as large as its tallest
 * state (~268px) even while the items are collapsed and invisible. A plain
 * `<div>` is still hit-tested over that whole box, which used to swallow taps in
 * a 52×268px strip down the right edge — over the hero CTA, gallery thumbnails
 * and footer links. The wrapper is therefore `pointer-events-none` and each
 * interactive child re-enables events with `pointer-events-auto`. Re-enabling on
 * a descendant overrides an ancestor, so the buttons keep working; everything
 * else in the box is transparent to pointer input.
 *
 * A useful side effect: `:hover` cannot fire on the collapsed list any more, so
 * the labels no longer appear while the rail is closed.
 *
 * ## Keyboard
 *
 * Disclosure pattern: the toggle owns `aria-expanded`/`aria-controls` and opening
 * does not steal focus. `Escape` closes and returns focus to the toggle; focus
 * leaving the rail also closes it. Collapsed links are `tabIndex={-1}`, so a
 * closed rail contributes nothing to the Tab order.
 *
 * Zalo/Facebook brand colours are third-party identities, so they are declared
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

export type FloatingContactLabels = {
  zalo: string;
  facebook: string;
  /** Template with a `{phone}` placeholder. */
  phone: string;
  open: string;
  close: string;
  backToTop: string;
};

export function FloatingContact({ labels }: { labels: FloatingContactLabels }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const { progress } = useSyncExternalStore(
    subscribeToScroll,
    getScrollSnapshot,
    getServerScrollSnapshot,
  );
  const showBackToTop = progress > 0.06;

  const items: readonly ContactItem[] = [
    {
      key: "zalo",
      label: labels.zalo,
      href: zaloLink.url,
      background: ZALO_BLUE,
      icon: <span className="text-[0.6875rem] font-extrabold tracking-tight">Zalo</span>,
    },
    {
      key: "facebook",
      label: labels.facebook,
      href: facebookLink.url,
      background: FACEBOOK_BLUE,
      icon: <FacebookIcon className="h-5 w-5" />,
    },
    {
      key: "phone",
      label: labels.phone.replace("{phone}", siteConfig.contact.hotline),
      href: siteConfig.contact.hotlineHref,
      className: "bg-primary-strong hover:bg-primary-strong-hover",
      icon: <PhoneIcon className="h-5 w-5" />,
    },
  ];

  // Close when the visitor presses outside the rail.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = () => setOpen(false);

  const closeAndReturnFocus = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  const scrollToTop = () => {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <div
      ref={wrapperRef}
      // `pointer-events-none` here is the fix for the dead strip: only the
      // buttons below opt back in.
      className="pointer-events-none fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2.5 lg:bottom-6 lg:right-6"
      data-print-hidden=""
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          closeAndReturnFocus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      {/* Back to top — appears once the visitor has committed to the page. */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={labels.backToTop}
        tabIndex={showBackToTop ? 0 : -1}
        aria-hidden={!showBackToTop}
        className={cn(
          "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/95 text-foreground shadow-card backdrop-blur-sm",
          "transition-[opacity,transform,visibility] duration-300 ease-out hover:border-primary hover:text-primary-strong",
          showBackToTop
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible translate-y-2 scale-90 opacity-0",
        )}
      >
        <ArrowUpIcon className="h-4 w-4" />
      </button>

      {/* Contact channels. The id is the target of the toggle's aria-controls. */}
      <ul id="floating-contact-list" className="flex flex-col items-end gap-2.5">
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
                "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full text-white shadow-card",
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
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="floating-contact-list"
        aria-label={open ? labels.close : labels.open}
        data-focus-ring=""
        className={cn(
          "pointer-events-auto relative inline-flex h-13 w-13 items-center justify-center rounded-full brand-gradient text-white shadow-lifted transition-transform duration-300 ease-out hover:scale-105 active:scale-95",
          // Pulse on a pseudo-element so it can never affect layout or overflow.
          !open &&
            "after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:content-[''] after:animate-[stt-pulse-ring_2.8s_var(--ease-out-soft)_infinite]",
        )}
      >
        {open ? <CloseIcon className="h-5 w-5" /> : <ChatIcon className="h-6 w-6" />}
      </button>
    </div>
  );
}
