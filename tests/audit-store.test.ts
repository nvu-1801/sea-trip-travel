import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { after, before, test } from "node:test";

const directory = mkdtempSync(path.join(tmpdir(), "seatrip-audit-"));
const file = path.join(directory, "audit.sqlite");
process.env.CMS_DB_PATH = file;

let audit: typeof import("../src/server/cms/db").audit;
let db: typeof import("../src/server/cms/db").db;

before(async () => {
  // Simulate a database created by an older release: only the original four
  // audit columns exist. db() must add the new columns without losing rows.
  const legacy = new DatabaseSync(file);
  legacy.exec(
    "CREATE TABLE audit (id INTEGER PRIMARY KEY, action TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL);" +
      "INSERT INTO audit(action,target,created_at) VALUES('login','admin','2026-01-01T00:00:00.000Z');",
  );
  legacy.close();
  ({ audit, db } = await import("../src/server/cms/db"));
});

after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});

test("adds actor/IP/status/details columns to an existing audit table", () => {
  const columns = new Set(
    (db().prepare("PRAGMA table_info(audit)").all() as { name: string }[]).map(
      (column) => column.name,
    ),
  );
  for (const name of ["actor", "ip", "status", "details"]) {
    assert.ok(columns.has(name), `missing audit column: ${name}`);
  }
});

test("legacy rows keep their data and default to success, with unknown actor/IP", () => {
  const row = db()
    .prepare("SELECT * FROM audit WHERE action='login'")
    .get() as Record<string, unknown>;
  assert.equal(row.target, "admin");
  assert.equal(row.status, "success");
  assert.equal(row.actor, null);
  assert.equal(row.ip, null);
});

test("new audit entries store actor, IP, result and safe details", () => {
  audit("publish", "tours/tour_1", {
    actor: "admin",
    ip: "203.0.113.10",
    status: "success",
    details: {
      record: { title: "Quy Nhơn 3 ngày", stateBefore: "draft", stateAfter: "published" },
    },
  });
  const row = db()
    .prepare(
      "SELECT actor, ip, status, details FROM audit WHERE action='publish'",
    )
    .get() as {
    actor: string;
    ip: string;
    status: string;
    details: string;
  };
  assert.equal(row.actor, "admin");
  assert.equal(row.ip, "203.0.113.10");
  assert.equal(row.status, "success");
  assert.equal(JSON.parse(row.details).record.title, "Quy Nhơn 3 ngày");
});

test("failure entries are stored as failures", () => {
  audit("login-failed", "admin", {
    ip: "203.0.113.10",
    status: "failure",
    details: { reason: "Tên đăng nhập hoặc mật khẩu không đúng" },
  });
  const row = db()
    .prepare(
      "SELECT status, actor, details FROM audit WHERE action='login-failed'",
    )
    .get() as { status: string; actor: string | null; details: string };
  assert.equal(row.status, "failure");
  assert.equal(row.actor, null);
  assert.match(row.details, /không đúng/);
});
