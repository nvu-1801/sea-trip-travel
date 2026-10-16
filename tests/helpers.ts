/**
 * Test bootstrap.
 *
 * `import "./helpers"` at the top of a test file gives that file a real SQLite
 * database in a throwaway temp directory, migrated and seeded from the shipped
 * TypeScript content. Tests then exercise the exact same repository and data
 * layer the app uses, instead of a hand-rolled fixture.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `connection.ts` only reads this when `getDb()` is first called, which happens
// below — after these assignments, even though imports are hoisted.
if (!process.env.DATABASE_PATH) {
  process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "sea-trip-test-")), "test.db");
}
process.env.CONTENT_SOURCE = "sqlite";

import { getDb } from "@/server/db/connection";
import { runMigrations } from "@/server/db/migrate";
import { importContent } from "@/server/db/import-content";
import { countToursByState } from "@/server/repo/tours";

runMigrations(getDb());
if (countToursByState().total === 0) {
  importContent();
}
