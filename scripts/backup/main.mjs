#!/usr/bin/env node
/**
 * SEA TRIP backup worker.
 *
 * Runs inside the `seatrip-backup` helper image (uid 1001), never in the web
 * container. Mounts are explicit: the content volume, the backup directory,
 * the key and a protected copy of the runtime env. It has no network, no
 * Docker socket and no way to reach the host beyond those mounts.
 *
 * Commands: run | verify | extract | list | worker
 */
import { DatabaseSync } from "node:sqlite";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  FORMAT_VERSION,
  Logger,
  TOOL_VERSION,
  authority,
  copyFile,
  copyFileHashed,
  ensureDir,
  fileSize,
  freeBytes,
  isDirectory,
  isFile,
  newId,
  redact,
  removeIfExists,
  removeTree,
  requireSafeId,
  run,
  sha256File,
  treeSize,
  writeFileAtomic,
} from "./lib/util.mjs";
import { decryptArchive, encryptArchive, readKey } from "./lib/crypto.mjs";
import {
  archivePath,
  checksumPath,
  listManifests,
  logPath,
  manifestPath,
  readManifest,
  readState,
  writeState,
} from "./lib/manifest.mjs";
import { selectExpired } from "./lib/retention.mjs";

process.umask(0o027);

function stamp() {
  return new Date().toISOString();
}

function markerStart(a, id) {
  try {
    writeFileSync(
      a.marker,
      `${JSON.stringify({ id, startedAt: stamp(), tool: TOOL_VERSION })}\n`,
      { mode: 0o644 },
    );
    const timer = setInterval(() => {
      try {
        const now = new Date();
        writeFileSync(a.marker, readFileSync(a.marker));
        // `utimes` is not needed: rewriting updates mtime.
        void now;
      } catch {
        /* marker removal at the end is best effort */
      }
    }, 15_000);
    timer.unref?.();
    return () => {
      clearInterval(timer);
      removeIfExists(a.marker);
    };
  } catch (error) {
    throw new Error(`Không tạo được dấu hiệu sao lưu: ${error.message}`);
  }
}

function openDb(file, readOnly = false) {
  try {
    const db = new DatabaseSync(file, { readOnly });
    db.exec("PRAGMA busy_timeout=5000");
    return db;
  } catch {
    return null;
  }
}

function backupTableReady(db) {
  return Boolean(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='backup_runs'",
      )
      .get(),
  );
}

function dbBegin(a, { backupId, kind, jobId }) {
  const db = openDb(a.dbPath);
  if (!db) return null;
  try {
    if (!backupTableReady(db)) return null;
    if (jobId) {
      db.prepare(
        `UPDATE backup_runs
            SET status='running', started_at=?, backup_id=?, updated_at=?, error=NULL
          WHERE id=?`,
      ).run(stamp(), backupId, stamp(), jobId);
      return { db, id: jobId };
    }
    db.prepare(
      `INSERT OR IGNORE INTO backup_runs
         (id, kind, status, requested_by, created_at, started_at, updated_at, app_sha)
       VALUES (?,?,?,?,?,?,?,?)`,
    ).run(backupId, kind, "running", "systemd", stamp(), stamp(), stamp(), a.appSha);
    return { db, id: backupId };
  } catch {
    return null;
  }
}

function dbUpdate(connection, fields) {
  if (!connection) return;
  const allowed = [
    "status",
    "finished_at",
    "size_bytes",
    "offsite_status",
    "error",
    "backup_id",
    "app_sha",
  ];
  const keys = Object.keys(fields).filter((key) => allowed.includes(key));
  if (keys.length === 0) return;
  try {
    connection.db
      .prepare(
        `UPDATE backup_runs SET ${keys.map((key) => `${key}=?`).join(", ")}, updated_at=? WHERE id=?`,
      )
      .run(...keys.map((key) => fields[key]), stamp(), connection.id);
  } catch {
    /* the backup itself must not fail because audit metadata is unavailable */
  }
}

function closeDb(connection) {
  try {
    connection?.db.close();
  } catch {
    /* ignore */
  }
}

function freeSpaceCheck(a, staging) {
  const dbBytes = fileSize(a.dbPath) + fileSize(`${a.dbPath}-wal`);
  const uploads = treeSize(a.uploadsDir);
  const estimate = Math.ceil(
    (dbBytes + uploads.bytes) * 1.1 + 256 * 1024 * 1024,
  );
  const free = freeBytes(staging);
  const minimum = Math.max(estimate, a.minFreeBytes);
  return { estimate, free, minimum, dbBytes, uploads };
}

async function snapshotDatabase(a, destination) {
  const db = openDb(a.dbPath);
  if (!db) throw new Error("Không mở được SQLite để sao lưu");
  try {
    db.exec(`VACUUM INTO '${destination.replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }
  const snapshot = openDb(destination, true);
  if (!snapshot) throw new Error("Không mở được bản snapshot SQLite");
  try {
    const integrity = snapshot.prepare("PRAGMA integrity_check").all();
    const ok =
      integrity.length === 1 &&
      String(Object.values(integrity[0] ?? {})[0] ?? "") === "ok";
    if (!ok) throw new Error("SQLite integrity_check thất bại");
    const foreign = snapshot.prepare("PRAGMA foreign_key_check").all();
    if (foreign.length > 0) throw new Error("SQLite foreign_key_check thất bại");
    const counts = {
      leads: Number(
        snapshot.prepare("SELECT COUNT(*) AS n FROM leads").get()?.n ?? 0,
      ),
      media: Number(
        snapshot.prepare("SELECT COUNT(*) AS n FROM media").get()?.n ?? 0,
      ),
      records: Number(
        snapshot.prepare("SELECT COUNT(*) AS n FROM records").get()?.n ?? 0,
      ),
    };
    const mediaNames = snapshot
      .prepare("SELECT name FROM media")
      .all()
      .map((row) => String(row.name));
    const referenced = new Set(mediaNames);
    const records = snapshot
      .prepare("SELECT data, published FROM records")
      .all();
    for (const row of records) {
      for (const value of [row.data, row.published]) {
        if (typeof value !== "string") continue;
        for (const match of value.matchAll(/\/api\/media\/([A-Za-z0-9._-]+)/g))
          referenced.add(match[1]);
      }
    }
    return {
      counts,
      referenced: [...referenced].sort(),
      dbBytes: statSync(destination).size,
    };
  } finally {
    snapshot.close();
  }
}

function missingUploads(a, names) {
  return names.filter((name) => {
    const file = path.join(a.uploadsDir, name);
    try {
      return !statSync(file).isFile() || statSync(file).size <= 0;
    } catch {
      return true;
    }
  });
}

function tarMembers(tarFile) {
  return new Promise(async (resolve, reject) => {
    try {
      const { stdout } = await run("tar", ["-tf", tarFile], { stdout: true });
      resolve(
        new Set(
          stdout
            .split("\n")
            .map((line) => line.trim().replace(/^\.\//, ""))
            .filter(Boolean),
        ),
      );
    } catch (error) {
      reject(error);
    }
  });
}

async function runBackup({ kind, jobId = null }) {
  const a = authority();
  ensureDir(a.backupDir, 0o750);
  ensureDir(path.join(a.backupDir, "logs"), 0o750);
  ensureDir(path.join(a.backupDir, ".tmp"), 0o750);
  const id = newId(kind);
  const staging = path.join(a.backupDir, ".tmp", id);
  const log = new Logger(logPath(a.backupDir, id));
  const startedAt = stamp();
  const connection = dbBegin(a, { backupId: id, kind, jobId });
  let stopMarker = () => {};
  let result = null;
  const warnings = [];
  try {
    const space = freeSpaceCheck(a, a.backupDir);
    log.line(
      `Bắt đầu backup ${kind}: ${id} · DB ${space.dbBytes}B · uploads ${space.uploads.files} tệp/${space.uploads.bytes}B · trống ${space.free ?? "?"}B`,
    );
    if (space.free !== null && space.free < space.minimum) {
      throw new Error(
        `Không đủ dung lượng: cần ít nhất ${space.minimum}B, còn ${space.free}B`,
      );
    }
    stopMarker = markerStart(a, id);
    mkdirSync(staging, { recursive: true, mode: 0o750 });
    const content = path.join(staging, "content");
    mkdirSync(path.join(content, "config"), { recursive: true, mode: 0o750 });

    log.line("Tạo snapshot SQLite bằng VACUUM INTO");
    const dbFile = path.join(content, "db.sqlite");
    const db = await snapshotDatabase(a, dbFile);

    log.line(
      `Đối chiếu ${db.referenced.length} tệp uploads được database tham chiếu`,
    );
    let missing = missingUploads(a, db.referenced);
    if (missing.length > 0) {
      // A delete that started just before the marker may still be finishing.
      await new Promise((resolve) => setTimeout(resolve, 3000));
      missing = missingUploads(a, db.referenced);
    }
    if (missing.length > 0)
      throw new Error(
        `Thiếu ${missing.length} tệp uploads mà database đang tham chiếu`,
      );

    const uploadsTar = path.join(content, "uploads.tar");
    if (isDirectory(a.uploadsDir)) {
      log.line("Đóng gói uploads");
      await run("tar", [
        "-C",
        a.uploadsDir,
        "--numeric-owner",
        "--sort=name",
        "-cf",
        uploadsTar,
        ".",
      ]);
      const members = await tarMembers(uploadsTar);
      const absent = db.referenced.filter(
        (name) => !members.has(name) && !members.has(`./${name}`),
      );
      if (absent.length > 0)
        throw new Error(
          `Archive uploads thiếu ${absent.length} tệp đang được tham chiếu`,
        );
    } else {
      await run("tar", ["-cf", uploadsTar, "-T", "/dev/null"]);
    }

    const uploads = treeSize(a.uploadsDir);
    const configSource = path.join(a.configDir, "env.production");
    const configIncluded = isFile(configSource);
    if (configIncluded) {
      await copyFile(
        configSource,
        path.join(content, "config", "env.production"),
        0o600,
      );
      log.line("Đã đưa .env.production vào archive (sẽ được mã hóa)");
    } else {
      warnings.push("Không tìm thấy .env.production để sao lưu cấu hình");
      log.line("CẢNH BÁO: không có .env.production để sao lưu cấu hình");
    }

    const manifest = {
      formatVersion: FORMAT_VERSION,
      toolVersion: TOOL_VERSION,
      id,
      kind,
      createdAt: stamp(),
      appSha: a.appSha,
      image: a.image,
      db: {
        bytes: db.dbBytes,
        integrity: "ok",
        foreignKeys: "ok",
      },
      uploads: {
        files: uploads.files,
        bytes: uploads.bytes,
        referenced: db.referenced.length,
      },
      counts: db.counts,
      configIncluded,
      warnings,
    };
    writeFileAtomic(
      path.join(content, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      0o640,
    );
    writeFileAtomic(
      path.join(content, "RESTORE.txt"),
      [
        "SEA TRIP backup",
        `ID: ${id}`,
        `Tạo lúc: ${manifest.createdAt}`,
        `APP_SHA: ${a.appSha ?? "không rõ"}`,
        "",
        "Giải nén bằng manage.sh extract <id> <thư mục> hoặc restore-test.",
        "db.sqlite là snapshot nhất quán; uploads.tar chứa toàn bộ ảnh.",
        "config/env.production chỉ được giải mã bằng khóa backup.",
        "",
      ].join("\n"),
      0o640,
    );

    log.line("Đóng gói archive");
    const archiveTar = path.join(staging, "archive.tar");
    const entries = readdirSync(content);
    await run("tar", [
      "-C",
      content,
      "--numeric-owner",
      "-cf",
      archiveTar,
      ...entries,
    ]);

    log.line("Mã hóa AES-256-GCM (nén gzip mức 1)");
    const key = readKey(a.keyFile);
    const partial = path.join(a.backupDir, `.${id}.seatar.part`);
    await encryptArchive(archiveTar, partial, key);
    const final = archivePath(a.backupDir, id);
    await run("mv", ["-f", partial, final]);
    const archiveBytes = statSync(final).size;
    const archiveSha = await sha256File(final);
    writeFileAtomic(
      checksumPath(a.backupDir, id),
      `${archiveSha}  ${id}.seatar\n`,
      0o640,
    );

    let offsite = a.offsiteDir
      ? await copyOffsite(a, id, { bytes: archiveBytes, sha256: archiveSha }, log)
      : { status: "not-configured", at: null };

    const sidecar = {
      ...manifest,
      status: "done",
      verifiedAt: stamp(),
      archive: {
        file: `${id}.seatar`,
        bytes: archiveBytes,
        sha256: archiveSha,
        algorithm: "aes-256-gcm",
      },
      offsite,
    };
    writeFileAtomic(
      manifestPath(a.backupDir, id),
      `${JSON.stringify(sidecar, null, 2)}\n`,
      0o640,
    );
    offsite = await copyOffsiteManifest(a, id, offsite, log);
    if (sidecar.offsite.status !== offsite.status) {
      sidecar.offsite = offsite;
      writeFileAtomic(
        manifestPath(a.backupDir, id),
        `${JSON.stringify(sidecar, null, 2)}\n`,
        0o640,
      );
    }
    writeState(a.backupDir, {
      lastAttempt: {
        id,
        kind,
        status: "done",
        at: startedAt,
        finishedAt: stamp(),
        bytes: archiveBytes,
      },
      lastSuccess: {
        id,
        kind,
        at: startedAt,
        finishedAt: stamp(),
        bytes: archiveBytes,
      },
      offsite: {
        configured: Boolean(a.offsiteDir),
        ...offsite,
      },
      retention: {
        keep: a.keepAuto,
        lastDeleted: readState(a.backupDir).retention?.lastDeleted ?? [],
      },
    });
    dbUpdate(connection, {
      status: "done",
      finished_at: stamp(),
      size_bytes: archiveBytes,
      offsite_status: offsite.status,
    });
    log.line(
      `Hoàn tất ${id} · ${archiveBytes}B · sha256 ${archiveSha.slice(0, 12)}…`,
    );

    if (kind === "auto" && a.retentionEnabled) {
      const deleted = await applyRetention(a, log);
      writeState(a.backupDir, {
        retention: {
          keep: a.keepAuto,
          lastDeleted: deleted,
          lastRunAt: stamp(),
        },
      });
    }
    result = { id, bytes: archiveBytes, sha256: archiveSha, offsite };
    return result;
  } catch (error) {
    const message = redact(
      error instanceof Error ? error.message : "lỗi không rõ",
    );
    log.line(`THẤT BẠI: ${message}`);
    dbUpdate(connection, {
      status: "failed",
      finished_at: stamp(),
      error: message.slice(0, 300),
    });
    writeState(a.backupDir, {
      lastAttempt: {
        id,
        kind,
        status: "failed",
        at: startedAt,
        finishedAt: stamp(),
        error: message.slice(0, 300),
      },
      lastFailure: {
        id,
        kind,
        at: stamp(),
        error: message.slice(0, 300),
      },
    });
    throw error;
  } finally {
    stopMarker();
    closeDb(connection);
    removeTree(staging);
    removeIfExists(path.join(a.backupDir, `.${id}.seatar.part`));
  }
}

async function copyOffsite(a, id, info, log) {
  const target = a.offsiteDir;
  try {
    mkdirSync(target, { recursive: true, mode: 0o750 });
    const copied = await copyFileHashed(
      path.join(a.backupDir, `${id}.seatar`),
      path.join(target, `${id}.seatar`),
      0o640,
    );
    await copyFile(
      path.join(a.backupDir, `${id}.sha256`),
      path.join(target, `${id}.sha256`),
      0o640,
    );
    if (copied.sha256 !== info.sha256)
      throw new Error(
        `Checksum tại đích offsite không khớp (${info.sha256.slice(0, 12)} → ${copied.sha256.slice(0, 12)})`,
      );
    log.line(`Offsite: đã sao chép và xác minh ${target}`);
    return {
      status: "verified",
      at: stamp(),
      bytes: copied.bytes,
    };
  } catch (error) {
    const message = redact(
      error instanceof Error ? error.message : "lỗi không rõ",
    );
    log.line(`CẢNH BÁO offsite thất bại: ${message}`);
    return { status: "failed", at: stamp(), error: message.slice(0, 200) };
  }
}

async function copyOffsiteManifest(a, id, offsite, log) {
  if (offsite.status !== "verified" || !a.offsiteDir) return offsite;
  try {
    await copyFile(
      manifestPath(a.backupDir, id),
      path.join(a.offsiteDir, `${id}.manifest.json`),
      0o640,
    );
    return offsite;
  } catch (error) {
    log.line(
      `CẢNH BÁO không chép được manifest offsite: ${error instanceof Error ? error.message : "lỗi"}`,
    );
    return { ...offsite, status: "failed" };
  }
}

async function applyRetention(a, log) {
  const expired = selectExpired(listManifests(a.backupDir), a.keepAuto);
  const deleted = [];
  for (const entry of expired) {
    removeIfExists(archivePath(a.backupDir, entry.id));
    removeIfExists(manifestPath(a.backupDir, entry.id));
    removeIfExists(checksumPath(a.backupDir, entry.id));
    removeIfExists(logPath(a.backupDir, entry.id));
    deleted.push(entry.id);
    log.line(`Retention: đã xóa bản auto cũ ${entry.id}`);
  }
  return deleted;
}

function assertSafeTarMembers(members) {
  for (const member of members) {
    if (!member || member === ".") continue;
    if (member.startsWith("/") || member.split("/").includes(".."))
      throw new Error("Archive chứa đường dẫn không an toàn");
  }
}

async function extractArchive(a, id, destination) {
  const manifest = readManifest(a.backupDir, id);
  if (!manifest) throw new Error("Không tìm thấy bản backup đã hoàn tất");
  const archive = archivePath(a.backupDir, id);
  const sha = await sha256File(archive);
  if (sha !== manifest.archive.sha256)
    throw new Error("Checksum archive không khớp");
  ensureDir(destination, 0o700);
  const tarFile = path.join(destination, ".archive.tar");
  await decryptArchive(archive, tarFile, readKey(a.keyFile));
  const { stdout } = await run("tar", ["-tf", tarFile], { stdout: true });
  const members = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  assertSafeTarMembers(members);
  await run("tar", [
    "-C",
    destination,
    "--no-same-owner",
    "--no-same-permissions",
    "--no-overwrite-dir",
    "-m",
    "-xf",
    tarFile,
  ]);
  removeIfExists(tarFile);
  return manifest;
}

async function verifyContents(a, id, directory, manifest, log) {
  const dbFile = path.join(directory, "db.sqlite");
  if (!isFile(dbFile)) throw new Error("Archive thiếu db.sqlite");
  const db = openDb(dbFile, true);
  if (!db) throw new Error("Không mở được SQLite trong archive");
  try {
    const integrity = db.prepare("PRAGMA integrity_check").all();
    const ok =
      integrity.length === 1 &&
      String(Object.values(integrity[0] ?? {})[0] ?? "") === "ok";
    if (!ok) throw new Error("SQLite trong archive không toàn vẹn");
    if (db.prepare("PRAGMA foreign_key_check").all().length > 0)
      throw new Error("Khóa ngoại trong archive không hợp lệ");
    const counts = {
      leads: Number(db.prepare("SELECT COUNT(*) AS n FROM leads").get().n),
      media: Number(db.prepare("SELECT COUNT(*) AS n FROM media").get().n),
      records: Number(db.prepare("SELECT COUNT(*) AS n FROM records").get().n),
    };
    if (counts.leads !== manifest.counts.leads)
      throw new Error("Số lead trong archive không khớp manifest");
    const names = db
      .prepare("SELECT name FROM media")
      .all()
      .map((row) => String(row.name));
    const uploadsTar = path.join(directory, "uploads.tar");
    if (isFile(uploadsTar)) {
      const members = await tarMembers(uploadsTar);
      const absent = names.filter(
        (name) => !members.has(name) && !members.has(`./${name}`),
      );
      if (absent.length > 0)
        throw new Error(`Archive uploads thiếu ${absent.length} tệp media`);
    } else if (names.length > 0) {
      throw new Error("Archive thiếu uploads.tar");
    }
    log.line(
      `Verify OK · leads=${counts.leads} media=${counts.media} records=${counts.records}`,
    );
    return counts;
  } finally {
    db.close();
  }
}

async function verifyCommand(id) {
  const a = authority();
  requireSafeId(id);
  ensureDir(path.join(a.backupDir, ".verify"), 0o700);
  ensureDir(path.join(a.backupDir, "logs"), 0o750);
  const destination = path.join(
    a.backupDir,
    ".verify",
    `${id}-${process.pid}-${Date.now()}`,
  );
  const log = new Logger(logPath(a.backupDir, id));
  try {
    log.line(`Bắt đầu verify ${id}`);
    const manifest = await extractArchive(a, id, destination);
    const counts = await verifyContents(a, id, destination, manifest, log);
    const sidecar = {
      ...manifest,
      lastVerify: {
        at: stamp(),
        ok: true,
        counts,
        appSha: a.appSha,
      },
    };
    writeFileAtomic(
      manifestPath(a.backupDir, id),
      `${JSON.stringify(sidecar, null, 2)}\n`,
      0o640,
    );
    writeState(a.backupDir, {
      lastVerify: { id, at: stamp(), ok: true, counts },
    });
    console.log(
      JSON.stringify({ ok: true, id, counts, appSha: manifest.appSha }),
    );
    return 0;
  } catch (error) {
    const message = redact(
      error instanceof Error ? error.message : "lỗi không rõ",
    );
    log.line(`VERIFY THẤT BẠI: ${message}`);
    writeState(a.backupDir, {
      lastVerify: { id, at: stamp(), ok: false, error: message.slice(0, 300) },
    });
    throw error;
  } finally {
    removeTree(destination);
  }
}

async function extractCommand(id, destination) {
  if (!destination || destination === "true")
    throw new Error("Thiếu thư mục đích");
  const a = authority();
  requireSafeId(id);
  const manifest = await extractArchive(
    a,
    id,
    path.resolve("/extract", destination),
  );
  console.log(JSON.stringify({ ok: true, id, manifest }));
}

function listCommand(asJson) {
  const a = authority();
  const state = readState(a.backupDir);
  const items = listManifests(a.backupDir).map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    createdAt: entry.createdAt,
    appSha: entry.appSha,
    bytes: entry.archive?.bytes ?? null,
    status: entry.status,
    verifiedAt: entry.verifiedAt,
    lastVerify: entry.lastVerify ?? null,
    offsite: entry.offsite ?? null,
    counts: entry.counts ?? null,
    configIncluded: Boolean(entry.configIncluded),
  }));
  if (asJson) {
    console.log(JSON.stringify({ items, state }, null, 2));
    return;
  }
  for (const item of items) {
    console.log(
      `${item.id}\t${item.kind}\t${item.createdAt}\t${item.bytes ?? "?"}B\t${item.lastVerify?.ok ? "verified" : item.verifiedAt ? "created-verified" : "unverified"}\t${item.offsite?.status ?? "not-configured"}`,
    );
  }
  if (items.length === 0) console.log("Chưa có bản backup nào.");
}

async function workerCommand() {
  const a = authority();
  const db = openDb(a.dbPath);
  if (!db) {
    console.log("Không mở được database; worker bỏ qua lượt này.");
    return 0;
  }
  try {
    if (!backupTableReady(db)) {
      console.log("Bảng backup_runs chưa tồn tại; worker bỏ qua.");
      return 0;
    }
    const timeoutMinutes = Math.max(
      10,
      Number(process.env.BACKUP_JOB_TIMEOUT_MINUTES ?? 120) || 120,
    );
    db.prepare(
      `UPDATE backup_runs
          SET status='failed', finished_at=?, updated_at=?, error=?
        WHERE kind='manual' AND status IN ('running','verifying')
          AND COALESCE(started_at, created_at) < ?`,
    ).run(
      stamp(),
      stamp(),
      "Worker bị gián đoạn hoặc quá thời gian",
      new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString(),
    );
    const job = db
      .prepare(
        `SELECT id FROM backup_runs
          WHERE kind='manual' AND status='queued'
          ORDER BY created_at LIMIT 1`,
      )
      .get();
    if (!job) {
      console.log("Không có yêu cầu backup thủ công nào.");
      return 0;
    }
    const claimed = db
      .prepare(
        `UPDATE backup_runs
            SET status='running', started_at=?, updated_at=?, error=NULL
          WHERE id=? AND status='queued'`,
      )
      .run(stamp(), stamp(), job.id);
    if (claimed.changes !== 1) return 0;
    db.close();
    console.log(`Nhận yêu cầu backup thủ công ${job.id}`);
    await runBackup({ kind: "manual", jobId: job.id });
    return 0;
  } finally {
    try {
      db.close();
    } catch {
      /* already closed */
    }
  }
}

function recordRestoreTestCommand(id, ok, ms, partial, note) {
  const a = authority();
  requireSafeId(id);
  const manifest = readManifest(a.backupDir, id);
  if (!manifest) throw new Error("Không tìm thấy bản backup");
  const record = {
    at: stamp(),
    ok: ok === "true",
    durationMs: Number.isFinite(Number(ms)) ? Number(ms) : null,
    partial: partial === "true",
    note: String(note ?? "").slice(0, 500),
  };
  writeFileAtomic(
    manifestPath(a.backupDir, id),
    `${JSON.stringify({ ...manifest, lastRestoreTest: record }, null, 2)}\n`,
    0o640,
  );
  writeState(a.backupDir, { lastRestoreTest: { id, ...record } });
  console.log(JSON.stringify({ ok: true, id, ...record }));
}

function stateCommand() {  const a = authority();
  console.log(
    JSON.stringify(
      {
        state: readState(a.backupDir),
        items: listManifests(a.backupDir).map((entry) => ({
          id: entry.id,
          kind: entry.kind,
          createdAt: entry.createdAt,
          bytes: entry.archive?.bytes ?? null,
          verifiedAt: entry.verifiedAt ?? null,
          lastVerify: entry.lastVerify ?? null,
          offsite: entry.offsite ?? null,
        })),
      },
      null,
      2,
    ),
  );
}

async function main() {
  const command = process.argv[2];
  const id = process.argv[3];
  try {
    if (command === "run") {
      const kind = process.env.BACKUP_KIND ?? "manual";
      if (!["auto", "manual", "predeploy"].includes(kind))
        throw new Error("Loại backup không hợp lệ");
      const result = await runBackup({ kind });
      console.log(JSON.stringify({ ok: true, ...result }));
      return;
    }
    if (command === "worker") {
      process.exitCode = await workerCommand();
      return;
    }
    if (command === "verify") {
      if (!id) throw new Error("Thiếu mã backup");
      await verifyCommand(id);
      return;
    }
    if (command === "extract") {
      await extractCommand(id, process.argv[4]);
      return;
    }
    if (command === "record-restore-test") {
      recordRestoreTestCommand(
        id,
        process.argv[4],
        process.argv[5],
        process.argv[6],
        process.argv[7],
      );
      return;
    }
    if (command === "list") {
      listCommand(process.argv.includes("--json"));
      return;
    }
    if (command === "state") {
      stateCommand();
      return;
    }
    throw new Error(
      "Dùng: run | worker | verify <id> | extract <id> <dir> | list [--json] | state",
    );
  } catch (error) {
    const message = redact(
      error instanceof Error ? error.message : "lỗi không rõ",
    );
    console.error(`[backup] ${message}`);
    process.exitCode = 1;
  }
}

await main();
