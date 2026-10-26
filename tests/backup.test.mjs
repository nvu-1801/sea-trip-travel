import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { test } from "node:test";
import {
  ID_PATTERN,
  copyFileHashed,
  newId,
  redact,
  sha256File,
  treeSize,
} from "../scripts/backup/lib/util.mjs";
import {
  decryptArchive,
  encryptArchive,
  readKey,
} from "../scripts/backup/lib/crypto.mjs";
import {
  AUTO_KEEP,
  safeManifest,
  selectExpired,
} from "../scripts/backup/lib/retention.mjs";

function manifest(id, overrides = {}) {
  return {
    id,
    kind: "auto",
    status: "done",
    formatVersion: 1,
    createdAt: new Date(2026, 0, 1).toISOString(),
    archive: { sha256: "a".repeat(64) },
    verifiedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("backup retention only prunes auto backups and keeps three", () => {
  const entries = [
    manifest("auto-20260101T030000Z-aaaaaa", { createdAt: "2026-01-01T03:00:00Z" }),
    manifest("auto-20260116T030000Z-bbbbbb", { createdAt: "2026-01-16T03:00:00Z" }),
    manifest("auto-20260201T030000Z-cccccc", { createdAt: "2026-02-01T03:00:00Z" }),
    manifest("auto-20260216T030000Z-dddddd", { createdAt: "2026-02-16T03:00:00Z" }),
    manifest("manual-20260110T030000Z-eeeeee", {
      kind: "manual",
      createdAt: "2026-01-10T03:00:00Z",
    }),
    manifest("predeploy-20260101T000000Z-ffffff", {
      kind: "predeploy",
      createdAt: "2026-01-01T00:00:00Z",
    }),
    manifest("auto-20260220T030000Z-gggggg", {
      createdAt: "2026-02-20T03:00:00Z",
      verifiedAt: null,
    }),
  ];
  const expired = selectExpired(entries, AUTO_KEEP).map((entry) => entry.id);
  assert.deepEqual(expired, ["auto-20260101T030000Z-aaaaaa"]);
});

test("retention never deletes unknown or malformed manifests", () => {
  const expired = selectExpired(
    [
      manifest("auto-20260101T030000Z-aaaaaa"),
      manifest("auto-20260102T030000Z-bbbbbb"),
      manifest("auto-20260103T030000Z-cccccc"),
      manifest("auto-20260104T030000Z-dddddd", { formatVersion: 2 }),
      manifest("../../etc/passwd"),
      manifest("auto-20260105T030000Z-eeeeee", { status: "failed" }),
    ],
    1,
  ).map((entry) => entry.id);
  assert.deepEqual(expired.sort(), [
    "auto-20260101T030000Z-aaaaaa",
    "auto-20260102T030000Z-bbbbbb",
  ]);
});

test("backup IDs are safe and match the download allowlist", () => {
  const id = newId("auto");
  assert.match(id, ID_PATTERN);
  assert.throws(() => newId("unknown"));
});

test("manifest validation rejects traversal and incomplete archives", () => {
  assert.equal(safeManifest(manifest("auto-20260101T030000Z-aaaaaa"))?.id,
    "auto-20260101T030000Z-aaaaaa");
  assert.equal(safeManifest(manifest("../../etc/passwd")), null);
  assert.equal(
    safeManifest(manifest("auto-20260101T030000Z-aaaaaa", { status: "failed" })),
    null,
  );
  assert.equal(
    safeManifest(
      manifest("auto-20260101T030000Z-aaaaaa", {
        archive: { sha256: "" },
      }),
    ),
    null,
  );
});

test("archive encryption round-trips and detects tampering", async () => {
  const folder = mkdtempSync(path.join(tmpdir(), "seatrip-backup-crypto-"));
  const key = randomBytes(32);
  const keyFile = path.join(folder, "key");
  writeFileSync(keyFile, `${key.toString("base64")}\n`);
  const source = path.join(folder, "archive.tar");
  const encrypted = path.join(folder, "archive.seatar");
  const output = path.join(folder, "out.tar");
  const body = Buffer.concat([
    Buffer.from("SEA TRIP backup test\n"),
    randomBytes(4096),
  ]);
  writeFileSync(source, body);
  try {
    assert.deepEqual(readKey(keyFile), key);
    await encryptArchive(source, encrypted, key);
    await decryptArchive(encrypted, output, key);
    assert.deepEqual(readFileSync(output), body);

    const tampered = readFileSync(encrypted);
    tampered[tampered.length - 32] ^= 0xff;
    writeFileSync(encrypted, tampered);
    await assert.rejects(() => decryptArchive(encrypted, output, key));

    await assert.rejects(() =>
      decryptArchive(encrypted, output, randomBytes(32)),
    );
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("copy hashing matches sha256 and copies all bytes", async () => {
  const folder = mkdtempSync(path.join(tmpdir(), "seatrip-backup-copy-"));
  const source = path.join(folder, "source.bin");
  const target = path.join(folder, "target.bin");
  const body = randomBytes(100_000);
  writeFileSync(source, body);
  try {
    const copied = await copyFileHashed(source, target);
    assert.deepEqual(readFileSync(target), body);
    assert.equal(copied.bytes, body.length);
    assert.equal(copied.sha256, createHash("sha256").update(body).digest("hex"));
    assert.equal(await sha256File(target), copied.sha256);
    assert.deepEqual(treeSize(folder), {
      bytes: body.length * 2,
      files: 2,
    });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("logs redact secrets and customer-facing values are never added", () => {
  const line = redact(
    "LEAD_ENCRYPTION_KEY=abcdef SMTP_PASSWORD=hunter2 token=abc password:xyz",
  );
  assert.ok(!line.includes("abcdef"));
  assert.ok(!line.includes("hunter2"));
  assert.ok(line.includes("[đã ẩn]"));
});
