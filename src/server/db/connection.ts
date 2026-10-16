import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

/**
 * SQLite connection (server only).
 *
 * `node:sqlite` is synchronous, which is exactly what a single-admin CMS on one
 * VPS wants: no pool, no async ceremony, sub-millisecond reads. The file lives
 * on a persistent disk (`DATABASE_PATH`), never inside `public/`, and never on a
 * serverless filesystem.
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

export function databasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  const path = configured && configured.length > 0 ? configured : "./data/sea-trip.db";
  // turbopackIgnore: true — resolved at runtime on purpose; the default would
  // make bundle tracing pull the whole project into the server output.
  return isAbsolute(path) ? path : resolve(/* turbopackIgnore: true */ process.cwd(), path);
}

type DbGlobal = typeof globalThis & { __seaTripDb?: DatabaseSync };

const globalForDb = globalThis as DbGlobal;

function open(path: string): DatabaseSync {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA synchronous = NORMAL;");
  return db;
}

/** The process-wide database handle. Creates the file/dir on first use. */
export function getDb(): DatabaseSync {
  if (globalForDb.__seaTripDb) return globalForDb.__seaTripDb;
  const db = open(databasePath());
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
  return open(":memory:");
}

/** Close the cached handle (used by scripts that want a clean shutdown). */
export function closeDb(): void {
  globalForDb.__seaTripDb?.close();
  globalForDb.__seaTripDb = undefined;
}
