"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AssetImage } from "@/components/ui/asset-image";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";
import { localizePath } from "@/i18n/routing";
import { searchKey } from "@/lib/search";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import type { DestinationSearchItem } from "@/lib/data/destination-search";

/**
 * Header search: a 44px icon that opens a floating "travel concierge" panel.
 *
 * The panel is deliberately not an inline input — the header has three other
 * actions and an inline field squeezes the navigation at 1024–1280px. The icon
 * keeps the bar calm; click, focus or the `/` shortcut reveals the search when
 * the guest wants it.
 *
 * Only destinations with at least one published tour are indexed, so a
 * suggestion always has something to sell. The panel opens on click/focus, not
 * hover: a sticky header receives accidental pointer passes, and an unprompted
 * panel is disorienting for older guests.
 */
export function HeaderSearch({
  locale,
  items,
  labels,
}: {
  locale: Locale;
  items: readonly DestinationSearchItem[];
  labels: Messages["header"]["search"];
}) {
  const router = useRouter();
  const baseId = useId().replace(/:/g, "");
  const listId = `${baseId}-results`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const trimmed = query.trim();
  const filtered = trimmed
    ? items
        .filter((item) => item.searchText.includes(searchKey(trimmed)))
        .slice(0, 6)
    : [];
  const popular = items.slice(0, 6);

  function openPanel() {
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }

  function closePanel(returnFocus = false) {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    if (returnFocus)
      requestAnimationFrame(() => buttonRef.current?.focus());
  }

  // Move focus into the input as soon as the panel paints.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Close on an outside pointer press.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closePanel();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Mobile sheet: lock background scrolling while it is open.
  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia("(max-width: 639px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // `/` or Ctrl/⌘ K opens search from anywhere; Escape closes it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        closePanel(true);
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPanel();
        return;
      }
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        openPanel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filtered.length)
        setActiveIndex((current) => (current + 1) % filtered.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length)
        setActiveIndex(
          (current) => (current - 1 + filtered.length) % filtered.length,
        );
    } else if (event.key === "Enter") {
      const target = filtered[activeIndex];
      if (!target) return;
      event.preventDefault();
      setOpen(false);
      router.push(target.href);
    }
  }

  const activeOption =
    filtered[activeIndex] !== undefined
      ? `${baseId}-option-${filtered[activeIndex].id}`
      : undefined;

  return (
    <div className="stt-header-search" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="stt-header-search-button"
        aria-label={labels.open}
        aria-expanded={open}
        aria-controls={`${baseId}-panel`}
        aria-keyshortcuts="/ Control+K Meta+K"
        title={`${labels.open} · ${labels.shortcut}`}
        onClick={() => (open ? closePanel(true) : openPanel())}
      >
        <SearchIcon className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div
            id={`${baseId}-panel`}
            className="stt-search-panel"
            role="dialog"
            aria-label={labels.open}
          >
            <span className="stt-search-hairline" aria-hidden="true" />

            <div className="stt-search-head">
              <div>
                <p className="stt-search-eyebrow">SEA TRIP</p>
                <h2>{labels.title}</h2>
              </div>
              <button
                type="button"
                className="stt-search-close"
                aria-label={labels.close}
                onClick={() => closePanel(true)}
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="stt-search-field">
              <SearchIcon className="h-5 w-5 shrink-0" />
              <input
                ref={inputRef}
                type="search"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeOption}
                aria-label={labels.open}
                placeholder={labels.placeholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onInputKeyDown}
                autoComplete="off"
                spellCheck={false}
              />
              {query ? (
                <button
                  type="button"
                  className="stt-search-clear"
                  aria-label={labels.clear}
                  onClick={() => {
                    setQuery("");
                    setActiveIndex(0);
                    inputRef.current?.focus();
                  }}
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <p className="sr-only" aria-live="polite">
              {trimmed
                ? filtered.length
                  ? labels.results.replace("{count}", String(filtered.length))
                  : labels.noResults
                : ""}
            </p>

            {trimmed === "" ? (
              <div className="stt-search-popular">
                <p className="stt-search-label">{labels.popular}</p>
                <div className="stt-search-chips">
                  {popular.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="stt-search-chip"
                      onClick={() => setOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : filtered.length > 0 ? (
              <>
                <p className="stt-search-count">
                  {labels.results.replace(
                    "{count}",
                    String(filtered.length),
                  )}
                </p>
                <ul id={listId} role="listbox" className="stt-search-results">
                  {filtered.map((item, index) => (
                    <li key={item.id} role="presentation">
                      <Link
                        id={`${baseId}-option-${item.id}`}
                        href={item.href}
                        role="option"
                        aria-selected={index === activeIndex}
                        data-active={index === activeIndex || undefined}
                        className="stt-search-result"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => setOpen(false)}
                      >
                        <span className="stt-search-thumb" aria-hidden="true">
                          <AssetImage
                            image={item.image}
                            altFallback={item.name}
                            sizes="40px"
                            variant="plain"
                          />
                        </span>
                        <span className="stt-search-result-copy">
                          <strong>{item.name}</strong>
                          <small>
                            {[item.province, item.regionLabel]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        </span>
                        <span className="stt-search-result-count">
                          {item.tourCount} tour
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="stt-search-empty">
                <strong>
                  {labels.emptyTitle.replace("{q}", trimmed)}
                </strong>
                <p>{labels.emptyBody}</p>
                <div className="stt-search-empty-actions">
                  <Link
                    href={localizePath(locale, "/lien-he")}
                    className="stt-search-cta"
                    onClick={() => setOpen(false)}
                  >
                    {labels.consult}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setActiveIndex(0);
                      inputRef.current?.focus();
                    }}
                  >
                    {labels.tryPopular}
                  </button>
                </div>
              </div>
            )}

            <Link
              href={localizePath(locale, "/tim-tour")}
              className="stt-search-all"
              onClick={() => setOpen(false)}
            >
              {labels.viewAll} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
