import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { LEAD_TRASH_RETENTION_DAYS } from "../src/lib/lead-trash";

/**
 * Lead trash: deleting a customer must be reversible for the retention window.
 * The encrypted payload survives the soft delete, restored leads come back with
 * their status intact, and only trashed rows can be purged permanently.
 */
test("customer trash: soft delete, restore, purge and expiry", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "seatrip-lead-trash-"));
  process.env.CMS_DB_PATH = path.join(directory, "cms.sqlite");
  process.env.LEAD_ENCRYPTION_KEY = "a".repeat(64);
  const { db } = await import("../src/server/cms/db");
  const {
    persistLead,
    listLeads,
    listTrashedLeads,
    trashedLeadCount,
    softDeleteLead,
    restoreLead,
    purgeLead,
    purgeExpiredLeads,
    unreadLeadCount,
  } = await import("../src/server/cms/leads");
  try {
    persistLead("one", { fullName: "Khách Một" });
    persistLead("two", { fullName: "Khách Hai" });
    assert.equal(listLeads().length, 2);
    assert.equal(unreadLeadCount(), 2);

    // Trash a customer: hidden from the care list, still recoverable.
    assert.equal(softDeleteLead("one"), true);
    assert.equal(softDeleteLead("one"), false, "deleting twice is a no-op");
    assert.equal(trashedLeadCount(), 1);
    assert.deepEqual(
      listTrashedLeads().map((row) => row.id),
      ["one"],
    );
    assert.deepEqual(
      listLeads().map((row) => row.id),
      ["two"],
    );
    assert.equal(unreadLeadCount(), 1, "trashed leads stop counting as unread");
    const trashed = listTrashedLeads()[0];
    assert.equal(trashed.data.fullName, "Khách Một", "payload survives trash");
    assert.ok(trashed.deleted_at);

    // Restore returns it to the care list with its payload intact.
    assert.equal(restoreLead("one"), true);
    assert.equal(trashedLeadCount(), 0);
    assert.deepEqual(
      listLeads()
        .map((row) => row.id)
        .sort(),
      ["one", "two"],
    );

    // A live lead cannot be purged — only a trashed one.
    assert.equal(purgeLead("one"), false);
    assert.equal(softDeleteLead("one"), true);
    assert.equal(purgeLead("one"), true);
    assert.equal(
      (db().prepare("SELECT COUNT(*) AS count FROM leads").get() as {
        count: number;
      }).count,
      1,
    );

    // Retention: a row trashed longer than the window is removed lazily.
    assert.equal(softDeleteLead("two"), true);
    db()
      .prepare("UPDATE leads SET deleted_at=? WHERE id='two'")
      .run(
        new Date(
          Date.now() - (LEAD_TRASH_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000,
        ).toISOString(),
      );
    assert.equal(purgeExpiredLeads(), 1);
    assert.equal(listLeads().length, 0);
    assert.equal(listTrashedLeads().length, 0);
  } finally {
    db().close();
    rmSync(directory, { recursive: true, force: true });
  }
});
