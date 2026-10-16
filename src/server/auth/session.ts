import "server-only";

import { cookies } from "next/headers";
import {
  clearAttempts,
  createSession,
  getAdminById,
  getAdminByUsername,
  getAttempt,
  bumpAttempt,
  getSessionByTokenHash,
  purgeExpiredSessions,
  revokeAllSessionsForUser,
  revokeSession,
} from "@/server/repo/admin";
import { verifyPassword } from "./password";
import {
  SESSION_COOKIE,
  fingerprint,
  hashToken,
  isExpired,
  newSessionToken,
  sessionCookieOptions,
  sessionExpiry,
} from "./tokens";
import { contentSourceKind } from "@/server/db/connection";

/** Admin sessions: login, logout, current-user resolution and route guards. */

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

export type CurrentAdmin = {
  id: string;
  username: string;
  sessionId: string;
};

/** Admin is only meaningful where the database lives (the VPS profile). */
export function isAdminEnabled(): boolean {
  if (contentSourceKind() === "remote") return false;
  return (process.env.ADMIN_ENABLED ?? "true").toLowerCase() !== "false";
}

export function adminLoginPath(): string {
  return "/admin/login";
}

/** Resolve the signed-in admin, or null. Never throws. */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  if (!isAdminEnabled()) return null;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = getSessionByTokenHash(hashToken(token));
  if (!session) return null;
  if (session.revoked_at) return null;
  if (isExpired(session.expires_at)) return null;

  const user = getAdminById(session.user_id);
  if (!user) return null;
  return { id: user.id, username: user.username, sessionId: session.id };
}

/**
 * Route-handler / server-action guard: no redirect, just a decision.
 *
 * Pages do not use a redirecting guard: under Cache Components a `redirect()`
 * thrown inside the streamed admin subtree renders an error page instead of a
 * 307, so the guarded shell renders the sign-in card for anonymous visitors.
 */
export async function requireAdminApi(): Promise<CurrentAdmin | null> {
  return getCurrentAdmin();
}

export type LoginResult =
  | { ok: true; admin: CurrentAdmin }
  | { ok: false; code: "INVALID" | "RATE_LIMITED"; message: string; retryAfterSeconds?: number };

export async function login(
  username: string,
  password: string,
  context: { userAgent?: string; ip?: string } = {},
): Promise<LoginResult> {
  const normalized = username.trim().toLowerCase();
  const ipKey = fingerprint(context.ip ?? "unknown") ?? "unknown";
  const attemptKey = `login:${normalized}:${ipKey}`;

  purgeExpiredSessions();

  const attempt = getAttempt(attemptKey);
  if (attempt && Date.now() - new Date(attempt.window_start).getTime() <= LOGIN_WINDOW_MS) {
    if (attempt.count >= LOGIN_MAX_ATTEMPTS) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(
          (LOGIN_WINDOW_MS - (Date.now() - new Date(attempt.window_start).getTime())) / 1000,
        ),
      );
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: "Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau.",
        retryAfterSeconds,
      };
    }
  }

  const user = getAdminByUsername(normalized);
  // Always run a hash comparison so a wrong username and a wrong password take
  // a similar amount of time.
  const storedHash = user?.passwordHash ?? "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA";
  const passwordOk = verifyPassword(password, storedHash);

  if (!user || !passwordOk) {
    bumpAttempt(attemptKey, LOGIN_WINDOW_MS);
    return { ok: false, code: "INVALID", message: "Tên đăng nhập hoặc mật khẩu không đúng." };
  }

  clearAttempts(attemptKey);

  const token = newSessionToken();
  const sessionId = createSession({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: sessionExpiry(),
    uaHash: fingerprint(context.userAgent),
    ipHash: fingerprint(context.ip),
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());

  return { ok: true, admin: { id: user.id, username: user.username, sessionId } };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const session = getSessionByTokenHash(hashToken(token));
    if (session) revokeSession(session.id);
  }
  store.delete(SESSION_COOKIE);
}

/** Change the password and revoke every other session (this one keeps working). */
export async function changePassword(
  admin: CurrentAdmin,
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  const { updateAdminPassword } = await import("@/server/repo/admin");
  const user = getAdminById(admin.id);
  if (!user) throw new Error("Tài khoản không tồn tại");
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error("Mật khẩu hiện tại không đúng");
  }
  const { hashPassword, passwordProblem } = await import("./password");
  const problem = passwordProblem(nextPassword);
  if (problem) throw new Error(problem);
  updateAdminPassword(user.id, hashPassword(nextPassword));
  revokeAllSessionsForUser(user.id, admin.sessionId);
}

export function adminIpFromHeaders(headerList: Headers): string | undefined {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip") ?? undefined;
}
