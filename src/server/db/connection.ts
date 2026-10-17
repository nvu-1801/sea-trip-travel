import { DatabaseSync } from "node:sqlite";
import { accessSync, constants, existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { runMigrations } from "./migrate";

/**
 * SQLite connection (server only).
 *
 * `node:sqlite` is synchronous, which is exactly what a single-admin CMS on one
 * VPS wants: no pool, no async ceremony, sub-millisecond reads. The file lives
 * on a persistent disk (`DATABASE_PATH`), never inside `public/`.
 *
 * Two environments have to work with the *same* code:
 *
 *   - a writable disk (local dev, the VPS) — full read/write, WAL enabled;
 *   - a read-only bundle (Vercel) — the database is created and seeded during
 *     `next build`, then shipped and opened read-only.
 *
 * Hence: WAL is skipped on Vercel so the shipped database is a single file with
 * no `-wal`/`-shm` sibling (a read-only filesystem cannot create those), and
 * migrations are skipped when the file cannot be written.
 *
 * The handle is cached on `globalThis` so Next's dev HMR and route modules reuse
 * one connection instead of reopening the file on every edit.
 */

export type DbKind = "local" | "remote";

/** Which content source the app should read from. */
export function contentSourceKind(): DbKind {
  const raw = (process.env.CONTENT_SOURCE ?? "sqlite").toLowerCase();
  return raw === "remote" ? "remote" : "local";
}

/**
 * A serverless deployment ships a read-only bundle: WAL would need writable
 * `-shm`/`-wal` siblings that cannot exist there.
 */
function isServerlessBundle(): boolean {
  return process.env.VERCEL === "1";
}

/**
 * Default database file.
 *
 * Deliberately built with `path.join(process.cwd(), "data", …)` rather than a
 * template string: the bundler can then see that only `./data` is involved, so
 * it traces that folder into the server output (and does not warn about tracing
 * the whole project). A deployment that sets `DATABASE_PATH` to an absolute path
 * on a VPS is resolved at runtime instead — that file must not be traced.
 */
function defaultDatabasePath(): string {
  return join(process.cwd(), "data", "sea-trip.db");
}

export function databasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  if (configured && configured.length > 0) {
    return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
  }
  return defaultDatabasePath();
}

/**
 * True when the database can actually be written.
 *
 * The file and even its directory may not exist yet (first build, fresh
 * checkout), so writability is tested against the nearest existing ancestor:
 * that is what has to accept `mkdir` plus the SQLite file and its journal.
 */
export function databaseIsWritable(): boolean {
  const path = databasePath();
  if (path === ":memory:") return true;

  let dir = dirname(path);
  while (!existsSync(dir)) {
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  try {
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

type DbGlobal = typeof globalThis & { __seaTripDb?: DatabaseSync };

const globalForDb = globalThis as DbGlobal;

function openWritable(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  // WAL is a big win on a real disk; skipped in a serverless bundle so the
  // shipped file stays a single, read-only-friendly file.
  if (!isServerlessBundle()) db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA synchronous = NORMAL;");
  return db;
}

/**
 * The process-wide database handle.
 *
 * Somewhere writable it creates the file and the schema. Somewhere read-only it
 * opens the database that the build produced and skips migrations (SQLite
 * rejects even `CREATE TABLE IF NOT EXISTS` on a read-only connection).
 */
export function getDb(): DatabaseSync {
  if (globalForDb.__seaTripDb) return globalForDb.__seaTripDb;
  const path = databasePath();
  const writable = path === ":memory:" || databaseIsWritable();

  let db: DatabaseSync;
  if (writable) {
    try {
      db = openWritable(path);
      // Guarantees every reader sees the tables, even when `instrumentation.ts`
      // has not run (build workers, one-off scripts, tests).
      runMigrations(db);
    } catch (error) {
      // Writability can be misleading (read-only mounts, permissions). Fall back
      // to the database the build produced rather than failing the request.
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`[db] writable open failed (${detail}) — retrying read-only`);
      db = new DatabaseSync(path, { readOnly: true });
    }
  } else {
    // Read-only bundle: the schema was created and seeded during the build.
    db = new DatabaseSync(path, { readOnly: true });
  }

  globalForDb.__seaTripDb = db;
  return db;
}

/** True when the database file already exists (used to give actionable errors). */
export function databaseExists(): boolean {
  const path = databasePath();
  return path === ":memory:" || existsSync(path);
}

/** Test-only: build an isolated in-memory database. */
export function createMemoryDb(): DatabaseSync {
  const db = openWritable(":memory:");
  runMigrations(db);
  return db;
}

/** Close the cached handle (used by scripts that want a clean shutdown). */
export function closeDb(): void {
  globalForDb.__seaTripDb?.close();
  globalForDb.__seaTripDb = undefined;
}
