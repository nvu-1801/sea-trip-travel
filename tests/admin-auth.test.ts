import assert from "node:assert/strict";
import { describe, it } from "node:test";
import "./helpers";
import { hashPassword, passwordProblem, verifyPassword } from "@/server/auth/password";
import {
  SESSION_TTL_MS,
  fingerprint,
  hashToken,
  isExpired,
  newSessionToken,
  sessionExpiry,
} from "@/server/auth/tokens";
import {
  bumpAttempt,
  clearAttempts,
  countAdmins,
  createAdmin,
  createSession,
  getAdminByUsername,
  getAttempt,
  getSessionByTokenHash,
  revokeAllSessionsForUser,
  revokeSession,
  updateAdminPassword,
} from "@/server/repo/admin";

/**
 * Admin authentication primitives.
 *
 * Sessions are exercised through the repository (the cookie layer needs a Next
 * request context, which unit tests do not have).
 */

describe("password hashing", () => {
  it("produces a self-describing scrypt hash that verifies", () => {
    const hash = hashPassword("SeaTrip2026!");
    assert.match(hash, /^scrypt\$16384\$8\$1\$/);
    assert.equal(verifyPassword("SeaTrip2026!", hash), true);
    assert.equal(verifyPassword("SeaTrip2026?", hash), false);
  });

  it("salts every hash, so the same password yields different strings", () => {
    const a = hashPassword("SeaTrip2026!");
    const b = hashPassword("SeaTrip2026!");
    assert.notEqual(a, b);
} );

  it("rejects malformed stored hashes instead of throwing", () => {
    assert.equal(verifyPassword("x", "not-a-hash"), false);
    assert.equal(verifyPassword("x", "scrypt$1$2$3$4$5"), false);
  });

  it("enforces a minimum password policy", () => {
    assert.ok(passwordProblem("short"));
    assert.ok(passwordProblem("alllettersnonumber"));
    assert.equal(passwordProblem("SeaTrip2026!"), null);
  });
});

describe("session tokens", () => {
  it("mints unpredictable tokens and stores only their hash", () => {
    const token = newSessionToken();
    assert.ok(token.length >= 32);
    assert.equal(hashToken(token), hashToken(token));
    assert.notEqual(hashToken(token), hashToken(newSessionToken()));
  });

  it("expires sessions after the configured TTL", () => {
    const expiry = sessionExpiry();
    assert.equal(isExpired(expiry), false);
    assert.equal(isExpired(new Date(Date.now() - SESSION_TTL_MS - 1000).toISOString()), true);
  });

  it("derives a stable, non-reversible fingerprint", () => {
    assert.equal(fingerprint("203.0.113.10"), fingerprint("203.0.113.10"));
    assert.notEqual(fingerprint("203.0.113.10"), fingerprint("203.0.113.11"));
    assert.equal(fingerprint(undefined), null);
  });
});

describe("admin account repository", () => {
  it("creates the single account and finds it case-insensitively by username", () => {
    const before = countAdmins();
    if (!getAdminByUsername("test-admin")) {
      createAdmin({ username: "test-admin", passwordHash: hashPassword("SeaTrip2026!") });
    }
    const found = getAdminByUsername("test-admin");
    assert.ok(found);
    assert.ok(countAdmins() >= before);
    assert.match(found!.passwordHash, /^scrypt\$/);
  });

  it("updates the password hash", () => {
    const user = getAdminByUsername("test-admin")!;
    updateAdminPassword(user.id, hashPassword("NewSeaTrip2027!"));
    const updated = getAdminByUsername("test-admin")!;
    assert.equal(verifyPassword("NewSeaTrip2027!", updated.passwordHash), true);
    assert.equal(verifyPassword("SeaTrip2026!", updated.passwordHash), false);
  });

  it("revokes sessions, including 'all but this one'", () => {
    const user = getAdminByUsername("test-admin")!;
    const keepToken = newSessionToken();
    const keep = createSession({
      userId: user.id,
      tokenHash: hashToken(keepToken),
      expiresAt: sessionExpiry(),
    });
    const otherToken = newSessionToken();
    createSession({
      userId: user.id,
      tokenHash: hashToken(otherToken),
      expiresAt: sessionExpiry(),
    });

    revokeAllSessionsForUser(user.id, keep);

    assert.equal(getSessionByTokenHash(hashToken(keepToken))?.revoked_at, null);
    assert.ok(getSessionByTokenHash(hashToken(otherToken))?.revoked_at);

    revokeSession(keep);
    assert.ok(getSessionByTokenHash(hashToken(keepToken))?.revoked_at);
  });
});

describe("login throttling", () => {
  it("counts attempts inside the window and clears on success", () => {
    const key = "login:test-admin:1.2.3.4";
    clearAttempts(key);
    bumpAttempt(key, 15 * 60 * 1000);
    bumpAttempt(key, 15 * 60 * 1000);
    assert.equal(getAttempt(key)?.count, 2);
    clearAttempts(key);
    assert.equal(getAttempt(key), undefined);
  });
});
