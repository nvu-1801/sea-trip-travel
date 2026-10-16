import { createHash, randomBytes } from "node:crypto";
import { SESSION_COOKIE } from "./cookie-name";

/** Session token helpers — shared by route handlers, server actions and the CLI. */

export { SESSION_COOKIE };
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Salted, non-reversible fingerprint — used for context, never as a secret. */
export function fingerprint(value: string | undefined | null): string | null {
  if (!value) return null;
  const salt = process.env.ADMIN_SESSION_SECRET ?? "sea-trip-admin-local";
  return createHash("sha256").update(`${salt}|${value}`).digest("hex").slice(0, 32);
}

export function sessionExpiry(from: Date = new Date()): string {
  return new Date(from.getTime() + SESSION_TTL_MS).toISOString();
}

export function isExpired(expiresAt: string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

/** Cookie attributes, tightened automatically on https deployments. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
