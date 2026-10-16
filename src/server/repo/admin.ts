import { getDb } from "@/server/db/connection";
import { newId, nowIso } from "@/server/db/json";

/**
 * Admin identity, sessions, login throttling and a small audit trail.
 *
 * There is exactly one admin account and no public registration. Passwords are
 * hashed in `auth/password.ts` (scrypt); this module only ever stores the hash.
 * Sessions keep a hash of the cookie token, so a database leak cannot be replayed.
 */

export type AdminUser = {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  passwordChangedAt: string;
};

type AdminRow = {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  password_changed_at: string;
};

function toAdmin(row: AdminRow): AdminUser {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    passwordChangedAt: row.password_changed_at,
  };
}

export function listAdmins(): AdminUser[] {
  const rows = getDb().prepare("SELECT * FROM admin_user ORDER BY created_at ASC").all() as AdminRow[];
  return rows.map(toAdmin);
}

export function getAdminById(id: string): AdminUser | undefined {
  const row = getDb().prepare("SELECT * FROM admin_user WHERE id = ?").get(id) as AdminRow | undefined;
  return row ? toAdmin(row) : undefined;
}

export function getAdminByUsername(username: string): AdminUser | undefined {
  const row = getDb().prepare("SELECT * FROM admin_user WHERE username = ?").get(username) as
    | AdminRow
    | undefined;
  return row ? toAdmin(row) : undefined;
}

export function countAdmins(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM admin_user").get() as { n: number };
  return row.n;
}

export function createAdmin(record: { username: string; passwordHash: string }): AdminUser {
  const now = nowIso();
  const id = newId("usr");
  getDb()
    .prepare(
      `INSERT INTO admin_user (id, username, password_hash, created_at, updated_at, password_changed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, record.username, record.passwordHash, now, now, now);
  const created = getAdminById(id);
  if (!created) throw new Error("Không tạo được tài khoản admin");
  return created;
}

export function updateAdminPassword(id: string, passwordHash: string): void {
  const now = nowIso();
  getDb()
    .prepare("UPDATE admin_user SET password_hash = ?, updated_at = ?, password_changed_at = ? WHERE id = ?")
    .run(passwordHash, now, now, id);
}

/* --- Sessions ------------------------------------------------------------- */

export function createSession(record: {
  userId: string;
  tokenHash: string;
  expiresAt: string;
  uaHash?: string | null;
  ipHash?: string | null;
}): string {
  const id = newId("ses");
  getDb()
    .prepare(
      `INSERT INTO admin_session (id, token_hash, user_id, created_at, expires_at, revoked_at, ua_hash, ip_hash)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
    )
    .run(
      id,
      record.tokenHash,
      record.userId,
      nowIso(),
      record.expiresAt,
      record.uaHash ?? null,
      record.ipHash ?? null,
    );
  return id;
}

export type SessionRow = {
  id: string;
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
};

export function getSessionByTokenHash(tokenHash: string): SessionRow | undefined {
  return getDb()
    .prepare("SELECT id, user_id, expires_at, revoked_at FROM admin_session WHERE token_hash = ?")
    .get(tokenHash) as SessionRow | undefined;
}

export function revokeSession(id: string): void {
  getDb().prepare("UPDATE admin_session SET revoked_at = ? WHERE id = ?").run(nowIso(), id);
}

export function revokeAllSessionsForUser(userId: string, exceptSessionId?: string): void {
  if (exceptSessionId) {
    getDb()
      .prepare("UPDATE admin_session SET revoked_at = ? WHERE user_id = ? AND id <> ? AND revoked_at IS NULL")
      .run(nowIso(), userId, exceptSessionId);
    return;
  }
  getDb()
    .prepare("UPDATE admin_session SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
    .run(nowIso(), userId);
}

export function purgeExpiredSessions(): void {
  getDb().prepare("DELETE FROM admin_session WHERE expires_at < ?").run(nowIso());
}

/* --- Login throttling ----------------------------------------------------- */

export type AttemptRow = { count: number; window_start: string };

export function getAttempt(key: string): AttemptRow | undefined {
  return getDb()
    .prepare("SELECT count, window_start FROM login_attempt WHERE key = ?")
    .get(key) as AttemptRow | undefined;
}

export function bumpAttempt(key: string, windowMs: number): AttemptRow {
  const now = Date.now();
  const existing = getAttempt(key);
  if (!existing || now - new Date(existing.window_start).getTime() > windowMs) {
    const fresh = { count: 1, window_start: new Date(now).toISOString() };
    getDb()
      .prepare(
        `INSERT INTO login_attempt (key, count, window_start) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET count = excluded.count, window_start = excluded.window_start`,
      )
      .run(key, fresh.count, fresh.window_start);
    return fresh;
  }
  const next = { count: existing.count + 1, window_start: existing.window_start };
  getDb().prepare("UPDATE login_attempt SET count = ? WHERE key = ?").run(next.count, key);
  return next;
}

export function clearAttempts(key: string): void {
  getDb().prepare("DELETE FROM login_attempt WHERE key = ?").run(key);
}

/* --- Audit ---------------------------------------------------------------- */

export function recordAudit(record: {
  actor: string;
  action: string;
  entity?: string;
  entityId?: string;
  summary?: string;
}): void {
  getDb()
    .prepare(
      "INSERT INTO admin_audit (id, actor, action, entity, entity_id, summary, at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      newId("aud"),
      record.actor,
      record.action,
      record.entity ?? null,
      record.entityId ?? null,
      record.summary ?? null,
      nowIso(),
    );
}

export function listAudit(limit = 20): {
  action: string;
  entity: string | null;
  entity_id: string | null;
  summary: string | null;
  at: string;
}[] {
  return getDb()
    .prepare("SELECT action, entity, entity_id, summary, at FROM admin_audit ORDER BY at DESC LIMIT ?")
    .all(limit) as {
    action: string;
    entity: string | null;
    entity_id: string | null;
    summary: string | null;
    at: string;
  }[];
}
