import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { existsSync } from "node:fs";
import { isAbsolute, join, resolve, dirname } from "node:path";
import { runMigrations } from "./migrate";

/**
 * SQLite connection (server only).
 *
 * `node:sqlite` is synchronous, which is exactly what a single-admin CMS on one
 * VPS wants: no pool, no async ceremony, sub-millisecond reads. The file lives
 * on a persistent disk (`DATABASE_PATH`), never inside `public/`, and never on a
 * serverless filesystem as the *source of truth*.
 *
 * Opening the connection also brings the schema up to date. That matters for
 * `next build`: on a machine without a database (Vercel, CI) the build must still
 * be able to read content instead of exploding with "no such table".
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

/** The process-wide database handle. Creates the file/dir and the schema. */
export function getDb(): DatabaseSync {
  if (globalForDb.__seaTripDb) return globalForDb.__seaTripDb;
  const db = open(databasePath());
  // Guarantees every reader sees the tables, even when `instrumentation.ts`
  // has not run (build workers, one-off scripts, tests).
  runMigrations(db);
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
  const db = open(":memory:");
  runMigrations(db);
  return db;
}

/** Close the cached handle (used by scripts that want a clean shutdown). */
export function closeDb(): void {
  globalForDb.__seaTripDb?.close();
  globalForDb.__seaTripDb = undefined;
}
