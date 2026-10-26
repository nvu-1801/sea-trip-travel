import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

test("backup marker blocks media briefly and stale markers expire", async () => {
  const folder = mkdtempSync(path.join(tmpdir(), "seatrip-backup-marker-"));
  process.env.CMS_DB_PATH = path.join(folder, "seatrip.sqlite");
  const marker = path.join(folder, ".backup-active");
  try {
    const { backupInProgress } = await import("../src/server/cms/backup");
    assert.equal(backupInProgress(), false);
    writeFileSync(marker, "{}");
    assert.equal(backupInProgress(), true);
    const old = new Date(Date.now() - 3 * 60 * 1000);
    const { utimesSync } = await import("node:fs");
    utimesSync(marker, old, old);
    assert.equal(backupInProgress(), false, "stale marker must not block");
    rmSync(marker);
    assert.equal(backupInProgress(), false);
  } finally {
    delete process.env.CMS_DB_PATH;
    rmSync(folder, { recursive: true, force: true });
  }
});

test("backup manifests are validated and traversal is ignored", async () => {
  const folder = mkdtempSync(path.join(tmpdir(), "seatrip-backup-list-"));
  process.env.CMS_BACKUP_DIR = folder;
  const id = "auto-20260101T030000Z-aaaaaa";
  const sha = "a".repeat(64);
  const manifest = {
    id,
    kind: "auto",
    status: "done",
    formatVersion: 1,
    createdAt: "2026-01-01T03:00:00.000Z",
    archive: { file: `${id}.seatar`, bytes: 100, sha256: sha },
    verifiedAt: "2026-01-01T03:00:01.000Z",
  };
  try {
    const { listBackups, findBackup, resolveArchive } = await import(
      "../src/server/cms/backup"
    );
    writeFileSync(path.join(folder, `${id}.manifest.json`), JSON.stringify(manifest));
    writeFileSync(path.join(folder, `${id}.seatar`), "encrypted");
    writeFileSync(
      path.join(folder, "evil.manifest.json"),
      JSON.stringify({ ...manifest, id: "../../etc/passwd" }),
    );
    writeFileSync(
      path.join(folder, "bad.manifest.json"),
      JSON.stringify({ ...manifest, archive: { sha256: "" } }),
    );
    const items = listBackups();
    assert.equal(items.length, 1);
    assert.equal(items[0].id, id);
    assert.equal(findBackup(id)?.id, id);
    assert.equal(findBackup("../../etc/passwd"), null);
    assert.ok(resolveArchive(id));
    assert.equal(resolveArchive("../../etc/passwd"), null);
  } finally {
    delete process.env.CMS_BACKUP_DIR;
    rmSync(folder, { recursive: true, force: true });
  }
});

test("backup state is read defensively", async () => {
  const folder = mkdtempSync(path.join(tmpdir(), "seatrip-backup-state-"));
  process.env.CMS_BACKUP_DIR = folder;
  try {
    const { readBackupState } = await import("../src/server/cms/backup");
    assert.equal(readBackupState(), null);
    writeFileSync(
      path.join(folder, "state.json"),
      JSON.stringify({
        lastSuccess: {
          id: "auto-1",
          kind: "auto",
          at: "2026-01-01T03:00:00.000Z",
        },
      }),
    );
    assert.equal(readBackupState()?.lastSuccess?.id, "auto-1");
    writeFileSync(path.join(folder, "state.json"), "{not json");
    assert.equal(readBackupState(), null);
  } finally {
    delete process.env.CMS_BACKUP_DIR;
    rmSync(folder, { recursive: true, force: true });
  }
});
