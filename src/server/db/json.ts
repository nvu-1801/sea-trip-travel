import { randomUUID } from "node:crypto";

/** JSON column helpers + id minting for the SQLite layer. */

export function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function parseJsonArray(text: string | null | undefined): string[] {
  if (!text) return [];
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/** `tour_…`, `art_…`, `media_…` — prefixed, collision-proof ids. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** SQLite has no boolean type; store 0/1 explicitly. */
export function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

export function intToBool(value: number | null | undefined): boolean {
  return value === 1;
}

/** SQLite cannot bind `undefined`; normalise optional values to `null`. */
export function nullable<T>(value: T | undefined | null): T | null {
  return value === undefined || value === null ? null : value;
}
