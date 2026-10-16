/**
 * Create or update the schema.
 *
 *   npm run db:migrate
 */
import { closeDb, databasePath, getDb } from "@/server/db/connection";
import { runMigrations } from "@/server/db/migrate";

const result = runMigrations(getDb());
console.log(`Database: ${databasePath()}`);
console.log(`Applied:   ${result.applied.length > 0 ? result.applied.join(", ") : "(nothing to do)"}`);
console.log(`Up to date: ${result.alreadyApplied.length} migration(s)`);
closeDb();
