/**
 * Import the shipped TypeScript content into SQLite (idempotent).
 *
 *   npm run db:import
 *
 * Safe to run repeatedly: records are matched by id, translations by
 * (entity, id, locale) and media by URL, so nothing is duplicated.
 */
import { closeDb, databasePath } from "@/server/db/connection";
import { importContent } from "@/server/db/import-content";

const report = importContent();
console.log(`Database: ${databasePath()}`);
console.table(report);
closeDb();
