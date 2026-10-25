import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";

test("legacy leads migrate as unread; reading is persistent, idempotent and independent of sales status", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "seatrip-unread-"));
  process.env.CMS_DB_PATH = path.join(directory, "cms.sqlite");
  const legacy = new DatabaseSync(process.env.CMS_DB_PATH);
  legacy.exec("CREATE TABLE leads (id TEXT PRIMARY KEY, data TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', note TEXT NOT NULL DEFAULT '', mail_status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL); INSERT INTO leads(id,data,created_at) VALUES('old','encrypted','2026-01-01');");
  legacy.close();
  const { db } = await import("../src/server/cms/db");
  const { unreadLeadCount, markLeadRead } = await import("../src/server/cms/leads");
  try {
    assert.equal(unreadLeadCount(), 1);
    assert.equal(markLeadRead("missing"), false);
    assert.equal(markLeadRead("old"), true);
    const first = db().prepare("SELECT read_at, status FROM leads WHERE id='old'").get();
    assert.equal(first?.status, "new");
    assert.ok(first?.read_at);
    assert.equal(markLeadRead("old"), true);
    assert.deepEqual(db().prepare("SELECT read_at, status FROM leads WHERE id='old'").get(), first);
    assert.equal(unreadLeadCount(), 0);
    db().prepare("INSERT INTO leads(id,data,created_at) VALUES('new','encrypted','2026-02-01')").run();
    assert.equal(unreadLeadCount(), 1);
    db().prepare("DELETE FROM leads WHERE id='new'").run();
    assert.equal(unreadLeadCount(), 0);
  } finally {
    db().close();
    rmSync(directory, { recursive: true, force: true });
  }
});
