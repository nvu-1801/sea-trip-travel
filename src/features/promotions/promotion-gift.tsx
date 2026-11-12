"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { readableText, type PublicPromotion } from "@/domain/promotion";
import "./promotion-gift.css";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const Gifts = createContext<{ item: PublicPromotion; open: () => void } | null>(null);

function read(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

export function GiftIcon() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 11v9h16v-9M3 7h18v4H3zM12 7v13M12 7C7 7 6 6 6 4.5a2 2 0 0 1 4-.5l2 3Zm0 0c5 0 6-1 6-2.5a2 2 0 0 0-4-.5l-2 3Z" />
  </svg>;
}

function GiftArtwork({ item, children }: { item: PublicPromotion; children: ReactNode }) {
  const customBackground = item.background !== "#fff8ec" && item.background !== "#f8f4f1";
  return <div className="stt-gift-art" style={customBackground ? { background: item.background, color: readableText(item.background) } : undefined}>
    <div className="stt-gift-image">
      {item.image ? <Image src={item.image} alt={item.alt} fill sizes="(max-width: 720px) 100vw, (max-width: 1104px) 50vw, 528px" /> : <GiftIcon />}
    </div>
    <div className="stt-gift-copy">
      <p className="stt-gift-eyebrow"><span aria-hidden="true" style={item.accent === "#b97842" ? undefined : { background: item.accent }} /> Quà tặng Sea Trip</p>
      <h2>{item.title || "Tiêu đề quà tặng"}</h2>
      {item.intro && <p className="stt-gift-intro">{item.intro}</p>}
      <p className="stt-gift-conditions">Điền họ tên và số điện thoại để tham gia. Mỗi số điện thoại được tính một lượt.</p>
      {item.terms && <details className="stt-gift-conditions stt-gift-eligibility">
        <summary>Điều kiện nhận quà</summary>
        <p>{item.terms}</p>
      </details>}
      {(item.entriesPerWinner || item.winnerCount) && <p className="stt-gift-details">{item.entriesPerWinner ? `Mỗi ${item.entriesPerWinner} lượt hợp lệ có 1 suất (tối đa 100 suất)` : `${item.winnerCount} phần quà`} · {item.selectionMode === "manual" ? "Ban tổ chức chọn" : "Bốc thăm ngẫu nhiên"}</p>}
      {children}
    </div>
  </div>;
}

function GiftButton({ item, children, ...props }: { item: PublicPromotion; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const customColor = item.buttonColor !== "#6c3b22" && item.buttonColor !== "#a81455";
  return <button {...props} className="stt-gift-primary" style={customColor ? { background: item.buttonColor, color: readableText(item.buttonColor) } : undefined}>{children}</button>;
}

export function PromotionTrigger({ placement }: { placement: "home" | "tour" | "floating" }) {
  const gift = useContext(Gifts);
  if (!gift || (placement === "floating" && !gift.item.floating)) return null;
  return placement === "floating" ? (
    <button type="button" className="stt-gift-fab pointer-events-auto" onClick={gift.open}><GiftIcon /> Quà tặng</button>
  ) : (
    <div className={`stt-gift-banner stt-gift-banner--${placement}`}>
      <GiftIcon />
      <p>{placement === "home" ? gift.item.title : "Có quà tặng khi đặt tour"}</p>
      <button type="button" onClick={gift.open}>Xem quà</button>
    </div>
  );
}

export function Promotions({ children, version }: { children: ReactNode; version?: string | null }) {
  const path = usePathname();
  const page = path.replace(/^\/(vi|en)(?=\/|$)/, "").replace(/\/$/, "");
  const tour = /^\/tour\/([a-z0-9-]+)$/.exec(page)?.[1];
  const [selection, setSelection] = useState<{ page: string; item: PublicPromotion | null }>();
  const [opened, setOpened] = useState("");
  const openedHere = useRef(new Set<string>());
  useEffect(() => {
    if (page && !tour) return;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch(tour ? `/api/promotions?tour=${encodeURIComponent(tour)}` : "/api/promotions", { signal: controller.signal });
        if (!response.ok) throw new Error("Không tải được quà tặng");
        const item = await response.json();
        if (!controller.signal.aborted) setSelection({ page, item });
      } catch {
        if (!controller.signal.aborted) setSelection({ page, item: null });
      }
    }
    void refresh();
    const timer = setInterval(refresh, 15_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [page, tour, version]);
  const item = selection?.page === page ? selection.item : null;
  const key = item ? `seatrip:gift:${item.id}` : "";
  const open = () => {
    if (!item) return;
    openedHere.current.add(item.id);
    write(`${key}:manual`, "1");
    setOpened(`${item.id}:${page}`);
  };

  useEffect(() => {
    if (!item?.autoOpen || page || opened || openedHere.current.has(item.id)) return;
    function check() {
      if (!item || openedHere.current.has(item.id) || read(`${key}:manual`) || read(`${key}:done`) ||
          Date.now() - Number(read(`${key}:auto`) ?? 0) < WEEK) return;
      const active = document.activeElement;
      if (active?.closest("form, [contenteditable='true'], dialog, [role='dialog']") || document.querySelector("dialog[open], [aria-modal='true']")) return;
      const scrollable = document.documentElement.scrollHeight - innerHeight;
      if (scrollable <= 0 || scrollY / scrollable < 1 / 3) return;
      if (!write(`${key}:auto`, String(Date.now()))) return;
      openedHere.current.add(item.id);
      setOpened(`${item.id}:${page}`);
    }
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [item, key, opened, page]);

  return <Gifts.Provider value={item ? { item, open } : null}>
    {children}
    <PromotionTrigger placement="floating" />
    {item && opened === `${item.id}:${page}` &&
      <GiftDialog key={opened} item={item} tour={tour} source={path} storageKey={key} onClose={() => setOpened("")} />}
  </Gifts.Provider>;
}

function GiftDialog({ item, tour, source, storageKey, onClose }: {
  item: PublicPromotion; tour?: string; source: string; storageKey: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const inFlight = useRef(false);
  const [done, setDone] = useState(() => Boolean(read(`${storageKey}:done`)));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState("");
  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement;
    node?.showModal();
    return () => {
      node?.close();
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || done) return;
    const fields = new FormData(event.currentTarget);
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFailure("");
    try {
      const response = await fetch("/api/promotions/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: fields.get("fullName"), phone: fields.get("phone"),
          consent: fields.get("consent") === "on", company: fields.get("company"),
          promotionId: item.id, tourSlug: tour,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        const issues = (result.issues ?? []) as { path: string; message: string }[];
        setErrors(Object.fromEntries(issues.map(({ path, message }) => [path, [message]])));
        throw new Error(issues.length ? "Kiểm tra các ô được đánh dấu rồi gửi lại." : result.error ?? "Chưa gửi được đăng ký");
      }
      write(`${storageKey}:done`, "1");
      setDone(true);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Chưa gửi được đăng ký");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <dialog ref={dialog} className="stt-gift-dialog" aria-label={item.title}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="stt-gift-close-bar">
      <button type="button" className="stt-gift-close" aria-label="Đóng quà tặng" onClick={onClose}>×</button>
    </div>
    <GiftArtwork item={item}>
      {done ? <p role="status">{item.confirmation}</p> : (
        <GiftRegistration item={item} source={source} busy={busy} errors={errors} failure={failure} onSubmit={submit}
          onEdit={(name) => setErrors((current) => { const next = { ...current }; delete next[name]; return next; })} />
      )}
    </GiftArtwork>
  </dialog>;
}

function GiftRegistration({ item, source = "", busy = false, errors = {}, failure, onSubmit, onEdit }: {
  item: PublicPromotion;
  source?: string;
  busy?: boolean;
  errors?: Record<string, string[]>;
  failure?: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onEdit?: (name: string) => void;
}) {
  const preview = !onSubmit;
  const fields = <>
      <label>Họ và tên<input autoComplete="name" name="fullName" disabled={preview} required maxLength={100} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "gift-name-error" : undefined} onChange={() => onEdit?.("fullName")} />
        {errors.fullName && <small id="gift-name-error">{errors.fullName[0]}</small>}
      </label>
      <label>Số điện thoại<input autoComplete="tel" type="tel" name="phone" disabled={preview} required maxLength={24} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "gift-phone-error" : undefined} onChange={() => onEdit?.("phone")} />
        {errors.phone && <small id="gift-phone-error">{errors.phone[0]}</small>}
      </label>
      <input name="company" hidden tabIndex={-1} autoComplete="off" />
      <label className="stt-gift-consent"><input name="consent" type="checkbox" disabled={preview} required aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "gift-consent-error" : undefined} onChange={() => onEdit?.("consent")} />
        <span>Tôi đồng ý để Sea Trip liên hệ và đã đọc {preview ? "chính sách bảo mật" : <a href={source.startsWith("/en") ? "/en/chinh-sach-bao-mat" : "/chinh-sach-bao-mat"}>chính sách bảo mật</a>}.</span>
      </label>
      {errors.consent && <small id="gift-consent-error">{errors.consent[0]}</small>}
      {failure && <p role="alert">{failure}</p>}
      <GiftButton item={item} type="submit" disabled={busy || preview}>{busy ? "Đang gửi…" : item.button || "Gửi đăng ký"}</GiftButton>
    </>;
  return preview ? <div className="stt-gift-form">{fields}</div> :
    <form className="stt-gift-form" onSubmit={onSubmit} noValidate>{fields}</form>;
}

export function GiftPreview({ item }: { item: PublicPromotion }) {
  return <GiftArtwork item={item}><GiftRegistration item={item} /></GiftArtwork>;
}
