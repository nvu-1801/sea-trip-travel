import "server-only";
import { randomUUID } from "node:crypto";
import {
  createReadStream,
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { db, cmsDataDir } from "./db";

/**
 * The web app only ever reads backup metadata and encrypted archives from a
 * read-only mount. It never runs backup commands, never sees the archive key
 * and never gets a Docker socket.
 */
export const BACKUP_ID_PATTERN =
  /^(auto|manual|predeploy)-\d{8}T\d{6}Z-[a-f0-9]{6}$/;
const MAX_MANIFEST_BYTES = 256 * 1024;

export type BackupArchive = {
  file: string;
  bytes: number;
  sha256: string;
  algorithm: string;
};

export type BackupManifest = {
  id: string;
  kind: "auto" | "manual" | "predeploy";
  status: "done";
  formatVersion: number;
  createdAt: string;
  appSha: string | null;
  counts?: { leads?: number; media?: number; records?: number };
  uploads?: { files?: number; bytes?: number; referenced?: number };
  configIncluded?: boolean;
  warnings?: string[];
  archive: BackupArchive;
  verifiedAt?: string;
  lastVerify?: { at: string; ok: boolean; counts?: unknown } | null;
  lastRestoreTest?: {
    at: string;
    ok: boolean;
    durationMs: number | null;
    partial?: boolean;
  } | null;
  offsite?: { status: string; at?: string | null; error?: string } | null;
};

export type BackupRun = {
  id: string;
  kind: string;
  status: string;
  requested_by: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  backup_id: string | null;
  size_bytes: number | null;
  app_sha: string | null;
  offsite_status: string | null;
  error: string | null;
  updated_at: string;
};

export type BackupState = {
  updatedAt?: string | null;
  lastAttempt?: {
    id: string;
    kind: string;
    status: string;
    at: string;
    finishedAt?: string;
    bytes?: number;
    error?: string;
  } | null;
  lastSuccess?: { id: string; kind: string; at: string; bytes?: number } | null;
  lastFailure?: { id: string; kind: string; at: string; error?: string } | null;
  lastVerify?: { id: string; at: string; ok: boolean } | null;
  lastRestoreTest?: {
    id: string;
    at: string;
    ok: boolean;
    durationMs: number | null;
    partial?: boolean;
  } | null;
  retention?: { keep?: number; lastDeleted?: string[]; lastRunAt?: string } | null;
  offsite?: { configured?: boolean; status?: string; at?: string | null } | null;
};

export function backupRoot() {
  return (
    process.env.CMS_BACKUP_DIR ??
    path.join(cmsDataDir(), "backups")
  );
}

/**
 * True while the host backup worker holds a fresh heartbeat marker. Media
 * uploads/deletes are deferred, so a snapshot and the uploads archive always
 * describe the same moment. A crashed worker stops blocking after 2 minutes.
 */
export function backupInProgress(): boolean {
  const dataDir = process.env.CMS_DB_PATH
    ? path.dirname(process.env.CMS_DB_PATH)
    : cmsDataDir();
  try {
    const info = statSync(
      /* turbopackIgnore: true */ path.join(dataDir, ".backup-active"),
    );
    return Date.now() - info.mtimeMs < 120_000;
  } catch {
    return false;
  }
}

export function backupConfigured() {
  try {
    return existsSync(
      /* turbopackIgnore: true */ path.join(backupRoot(), "install-state.json"),
    );
  } catch {
    return false;
  }
}

function readJsonFile(file: string) {
  try {
    const info = statSync(/* turbopackIgnore: true */ file);
    if (!info.isFile() || info.size > MAX_MANIFEST_BYTES) return null;
    return JSON.parse(
      readFileSync(/* turbopackIgnore: true */ file, "utf8"),
    ) as unknown;
  } catch {
    return null;
  }
}

function isManifest(value: unknown): value is BackupManifest {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return false;
  const entry = value as Record<string, unknown>;
  if (typeof entry.id !== "string" || !BACKUP_ID_PATTERN.test(entry.id))
    return false;
  if (!["auto", "manual", "predeploy"].includes(String(entry.kind)))
    return false;
  if (entry.formatVersion !== 1 || entry.status !== "done") return false;
  if (typeof entry.createdAt !== "string" || !Number.isFinite(Date.parse(entry.createdAt)))
    return false;
  const archive = entry.archive;
  if (!archive || typeof archive !== "object" || Array.isArray(archive))
    return false;
  const cast = archive as Record<string, unknown>;
  if (typeof cast.sha256 !== "string" || typeof cast.file !== "string")
    return false;
  if (typeof cast.bytes !== "number" || cast.bytes <= 0) return false;
  return true;
}

export function readBackupState(): BackupState | null {
  const value = readJsonFile(path.join(backupRoot(), "state.json"));
  return value && typeof value === "object" ? (value as BackupState) : null;
}

export type BackupInstallState = {
  installedAt?: string;
  schedule?: string;
  timezone?: string;
  retentionAuto?: number;
  offsiteConfigured?: boolean;
  encryption?: string;
};

export function readBackupInstallState(): BackupInstallState | null {
  const value = readJsonFile(path.join(backupRoot(), "install-state.json"));
  return value && typeof value === "object"
    ? (value as BackupInstallState)
    : null;
}

/** Manifests are validated; anything malformed is ignored, never rendered. */
export function listBackups(limit = 50): BackupManifest[] {
  const root = backupRoot();
  let names: string[] = [];
  try {
    names = readdirSync(/* turbopackIgnore: true */ root).filter((name) =>
      name.endsWith(".manifest.json"),
    );
  } catch {
    return [];
  }
  const items: BackupManifest[] = [];
  for (const name of names) {
    const value = readJsonFile(path.join(root, name));
    if (!isManifest(value)) continue;
    if (value.id !== name.replace(/\.manifest\.json$/, "")) continue;
    try {
      if (
        !statSync(
          /* turbopackIgnore: true */ path.join(root, `${value.id}.seatar`),
        ).isFile()
      )
        continue;
    } catch {
      continue;
    }
    items.push(value);
  }
  return items
    .sort((a, b) => {
      const at = Date.parse(a.createdAt);
      const bt = Date.parse(b.createdAt);
      if (at !== bt) return bt - at;
      return a.id < b.id ? 1 : -1;
    })
    .slice(0, limit);
}

export function findBackup(id: string): BackupManifest | null {
  if (!BACKUP_ID_PATTERN.test(id)) return null;
  return listBackups(500).find((entry) => entry.id === id) ?? null;
}

/** Resolve an archive inside the backup root, rejecting traversal/symlinks. */
export function resolveArchive(id: string): string | null {
  if (!BACKUP_ID_PATTERN.test(id)) return null;
  const root = backupRoot();
  const candidate = path.join(root, `${id}.seatar`);
  try {
    const realRoot = realpathSync(/* turbopackIgnore: true */ root);
    const realFile = realpathSync(/* turbopackIgnore: true */ candidate);
    if (!realFile.startsWith(`${realRoot}${path.sep}`)) return null;
    return statSync(/* turbopackIgnore: true */ realFile).isFile()
      ? realFile
      : null;
  } catch {
    return null;
  }
}

export function openArchive(id: string) {
  const file = resolveArchive(id);
  if (!file) return null;
  const info = statSync(/* turbopackIgnore: true */ file);
  return {
    file,
    size: info.size,
    stream: createReadStream(/* turbopackIgnore: true */ file),
  };
}

export function listBackupRuns(limit = 50): BackupRun[] {
  try {
    return db()
      .prepare(
        "SELECT * FROM backup_runs ORDER BY created_at DESC LIMIT ?",
      )
      .all(limit) as BackupRun[];
  } catch {
    return [];
  }
}

export function activeManualRun(): BackupRun | null {
  try {
    return (
      (db()
        .prepare(
          "SELECT * FROM backup_runs WHERE kind='manual' AND status IN ('queued','running') ORDER BY created_at LIMIT 1",
        )
        .get() as BackupRun | undefined) ?? null
    );
  } catch {
    return null;
  }
}

export function queueManualBackup(actor: string): { id: string } {
  const id = randomUUID();
  const now = new Date().toISOString();
  db()
    .prepare(
      `INSERT INTO backup_runs
         (id, kind, status, requested_by, created_at, updated_at)
       VALUES (?,?,?,?,?,?)`,
    )
    .run(id, "manual", "queued", actor, now, now);
  return { id };
}

export function adminUsername(): string {
  try {
    const row = db()
      .prepare("SELECT username FROM admin WHERE id=1")
      .get() as { username?: string } | undefined;
    return row?.username ?? "admin";
  } catch {
    return "admin";
  }
}
