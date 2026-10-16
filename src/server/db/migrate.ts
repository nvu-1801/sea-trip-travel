import type { DatabaseSync } from "node:sqlite";
import { MIGRATIONS } from "./schema";

/**
 * Forward-only migration runner.
 *
 * Applied migration ids are recorded in `schema_migration`, so running this
 * twice is a no-op. It is deliberately synchronous and dependency-free: the
 * same function is called from the CLI, from `next dev` bootstrap and from the
 * test suite.
 */

export type MigrationResult = {
  applied: string[];
  alreadyApplied: string[];
};

export function runMigrations(db: DatabaseSync): MigrationResult {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migration (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);",
  );

  const done = new Set(
    (db.prepare("SELECT id FROM schema_migration").all() as { id: string }[]).map((row) => row.id),
  );

  const applied: string[] = [];
  const alreadyApplied: string[] = [];

  for (const migration of MIGRATIONS) {
    if (done.has(migration.id)) {
      alreadyApplied.push(migration.id);
      continue;
    }
    db.exec("BEGIN");
    try {
      db.exec(migration.sql);
      db.prepare("INSERT INTO schema_migration (id, applied_at) VALUES (?, ?)").run(
        migration.id,
        new Date().toISOString(),
      );
      db.exec("COMMIT");
      applied.push(migration.id);
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  return { applied, alreadyApplied };
}
