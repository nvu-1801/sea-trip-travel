import "server-only";

import { audit, db, type AuditContext, type AuditMeta } from "./db";

/**
 * Request-aware audit helpers.
 *
 * The CMS has a single administrator account, so the actor is the username in
 * the `admin` row. We still store it per event: if the account is renamed later,
 * old entries keep the name that was actually used at the time.
 */

export function requestIp(request: Request): string {
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return value.slice(0, 80);
  }
  return "local";
}

export function adminUsername(): string | null {
  try {
    const row = db()
      .prepare("SELECT username FROM admin WHERE id=1")
      .get() as { username?: string } | undefined;
    return row?.username?.trim() || null;
  } catch {
    return null;
  }
}

export function auditContext(request: Request): AuditContext {
  return { actor: adminUsername(), ip: requestIp(request) };
}

/** Success event for an authenticated request. */
export function auditRequest(
  request: Request,
  action: string,
  target: string,
  meta: Omit<AuditMeta, "actor" | "ip"> = {},
) {
  audit(action, target, { ...auditContext(request), ...meta });
}

/** Failure event for an authenticated request. */
export function auditFailure(
  request: Request,
  action: string,
  target: string,
  reason: string,
  details: Record<string, unknown> = {},
) {
  auditRequest(request, action, target, {
    status: "failure",
    details: { ...details, reason: reason.slice(0, 300) },
  });
}
