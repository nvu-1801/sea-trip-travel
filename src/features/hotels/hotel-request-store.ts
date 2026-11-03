"use client";

/**
 * One hotel the visitor attached to the consultation form.
 *
 * The site has no basket and no hold: this is just the choice travelling with
 * the visitor from a hotel page to `/lien-he`, kept in `sessionStorage` so a
 * refresh keeps it and closing the tab drops it. No id, no server state.
 *
 * The snapshot is cached and the store is subscribable, so the form can read it
 * with `useSyncExternalStore` instead of syncing via an effect (which would
 * render twice and fight hydration).
 */
export type HotelRequestDraft = {
  id: string;
  slug: string;
  name: string;
  priceFrom: number | null;
  roomId?: string;
  roomName?: string;
};

const KEY = "stt:hotel-request";
const listeners = new Set<() => void>();
let cached: HotelRequestDraft | null = null;
let loaded = false;

function parse(raw: string): HotelRequestDraft | null {
  try {
    const value = JSON.parse(raw) as Partial<HotelRequestDraft>;
    if (
      typeof value?.id !== "string" ||
      typeof value?.slug !== "string" ||
      typeof value?.name !== "string"
    )
      return null;
    return {
      id: value.id,
      slug: value.slug,
      name: value.name,
      priceFrom: typeof value.priceFrom === "number" ? value.priceFrom : null,
      ...(typeof value.roomId === "string" ? { roomId: value.roomId } : {}),
      ...(typeof value.roomName === "string"
        ? { roomName: value.roomName }
        : {}),
    };
  } catch {
    return null;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

/** Stable snapshot: the same object identity until the stored value changes. */
export function getHotelRequest(): HotelRequestDraft | null {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      const raw = window.sessionStorage.getItem(KEY);
      cached = raw ? parse(raw) : null;
    } catch {
      cached = null;
    }
  }
  return cached;
}

/** Hydration renders the server's empty form first, then the client snapshot. */
export function getHotelRequestServerSnapshot(): null {
  return null;
}

export function subscribeHotelRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function rememberHotelRequest(draft: HotelRequestDraft): void {
  cached = draft;
  loaded = true;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      // Private mode / blocked storage: the form starts without a hotel.
    }
  }
  emit();
}

export function forgetHotelRequest(): void {
  cached = null;
  loaded = true;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(KEY);
    } catch {
      // Nothing to clean up when storage is unavailable.
    }
  }
  emit();
}
