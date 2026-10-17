import { databaseExists, getDb } from "./connection";
import { runMigrations } from "./migrate";
import { importContent } from "./import-content";

/**
 * Runtime database bootstrap.
 *
 * Called once per server start from `src/instrumentation.ts`, and again lazily
 * by the content reader (`lib/data/snapshot.ts`). The lazy call is what makes a
 * database-less environment work: on Vercel the schema does not exist when
 * `next build` collects page data, so the first read has to be able to create
 * and seed it. Without this the build fails with `no such table`.
 *
 * Seeding imports the shipped TypeScript content. It runs only when the database
 * has no tours yet, so:
 *   - a VPS with real data is never touched;
 *   - a fresh checkout, CI or Vercel build gets the real catalogue instead of an
 *     empty site.
 */

export type BootstrapReport = {
  created: boolean;
  appliedMigrations: string[];
  seeded: boolean;
};

export function ensureDatabase(): BootstrapReport {
  const created = !databaseExists();
  const { applied } = runMigrations(getDb());

  let seeded = false;
  if (created || isEmpty()) {
    importContent();
    seeded = true;
  }

  return { created, appliedMigrations: applied, seeded };
}

function isEmpty(): boolean {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM tour").get() as { n: number };
  return row.n === 0;
}

/** Memoised guard used by the content reader before it queries anything. */
let ensured = false;

export function ensureLocalDatabase(): void {
  if (ensured) return;
  ensured = true;
  try {
    ensureDatabase();
  } catch (error) {
    // Reset so a later request can retry (e.g. a filesystem that only becomes
    // writable after a deploy step has run).
    ensured = false;
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[db] bootstrap failed: ${detail}`);
    throw error;
  }
}
