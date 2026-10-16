import type { DatabaseSync } from "node:sqlite";
import { getDb } from "./connection";

/**
 * Minimal transaction wrapper.
 *
 * `node:sqlite` is synchronous, so a transaction is just BEGIN/COMMIT around a
 * synchronous callback — no async interleaving, no lost writes. Nested calls
 * are rejected loudly rather than silently degrading to a no-op savepoint.
 */

let depth = 0;

export function withTransaction<T>(fn: (db: DatabaseSync) => T): T {
  if (depth > 0) {
    throw new Error("withTransaction() cannot be nested");
  }
  const db = getDb();
  depth += 1;
  db.exec("BEGIN");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    depth -= 1;
  }
}
