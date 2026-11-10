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

export function GiftArtwork({ item, children }: { item: PublicPromotion; children: ReactNode }) {
  return <div className="stt-gift-art" style={{ background: item.background, color: readableText(item.background) }}>
    <div className="stt-gift-image">
      {item.image ? <Image src={item.image} alt={item.alt} fill sizes="(max-width: 640px) 100vw, 420px" /> : <GiftIcon />}
    </div>
    <div className="stt-gift-copy">
      <p className="stt-gift-eyebrow"><span style={{ background: item.accent }} /> QUÀ TẶNG SEA TRIP</p>
      <h2>{item.title || "Tiêu đề quà tặng"}</h2>
      {item.intro && <p>{item.intro}</p>}
      {item.terms && <div><h3>Điều kiện nhận quà</h3><p className="stt-gift-terms">{item.terms}</p></div>}
      {children}
    </div>
  </div>;
}

export function GiftButton({ item, children, ...props }: { item: PublicPromotion; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className="stt-gift-primary" style={{ background: item.buttonColor, color: readableText(item.buttonColor) }}>{children}</button>;
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

export function Promotions({ children }: { children: ReactNode }) {
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
  }, [page, tour]);
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
    {item && opened === `${item.id}:${page}` &&
      <GiftDialog key={opened} item={item} tour={tour} source={path} storageKey={key} onClose={() => setOpened("")} />}
  </Gifts.Provider>;
}

function GiftDialog({ item, tour, source, storageKey, onClose }: {
  item: PublicPromotion; tour?: string; source: string; storageKey: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submission = useRef("");
  const inFlight = useRef(false);
  const [register, setRegister] = useState(false);
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
    submission.current ||= read(`${storageKey}:submission`) || crypto.randomUUID();
    write(`${storageKey}:submission`, submission.current);
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setFailure("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: fields.get("fullName"), phone: fields.get("phone"),
          consent: fields.get("consent") === "on", company: fields.get("company"),
          promotionId: item.id, tourSlug: tour, sourcePage: source,
          locale: source.startsWith("/en") ? "en" : "vi", submissionId: submission.current,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setErrors(result.error?.fieldErrors ?? {});
        throw new Error(result.error?.message ?? "Chưa gửi được đăng ký");
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
      {done ? <p role="status">{item.confirmation}</p> : register ? (
        <form className="stt-gift-form" onSubmit={submit}>
          <label>Họ và tên<input autoComplete="name" name="fullName" required maxLength={100} aria-invalid={Boolean(errors.fullName)} />
            {errors.fullName && <small>{errors.fullName[0]}</small>}
          </label>
          <label>Số điện thoại<input autoComplete="tel" type="tel" name="phone" required maxLength={24} aria-invalid={Boolean(errors.phone)} />
            {errors.phone && <small>{errors.phone[0]}</small>}
          </label>
          <input name="company" hidden tabIndex={-1} autoComplete="off" />
          <label className="stt-gift-consent"><input name="consent" type="checkbox" required />
            <span>Tôi đồng ý để Sea Trip liên hệ và đã đọc <a href={source.startsWith("/en") ? "/en/chinh-sach-bao-mat" : "/chinh-sach-bao-mat"}>chính sách bảo mật</a>.</span>
          </label>
          {failure && <p role="alert">{failure}</p>}
          <GiftButton item={item} type="submit" disabled={busy}>{busy ? "Đang gửi…" : "Gửi đăng ký"}</GiftButton>
        </form>
      ) : <GiftButton item={item} type="button" onClick={() => setRegister(true)}>{item.button}</GiftButton>}
    </GiftArtwork>
  </dialog>;
}
