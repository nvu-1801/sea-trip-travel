import { databaseExists, getDb } from "./connection";
import { runMigrations } from "./migrate";

/**
 * Runtime database bootstrap.
 *
 * Called once per server start from `src/instrumentation.ts`. Migrations are
 * idempotent and cheap, so they always run — a fresh VPS or a `git pull` with a
 * new migration just works. Importing the shipped content is a *development*
 * convenience only; production seeds explicitly with `npm run db:import`.
 */

export type BootstrapReport = {
  created: boolean;
  appliedMigrations: string[];
  seeded: boolean;
};

export async function ensureDatabase(): Promise<BootstrapReport> {
  const created = !databaseExists();
  const { applied } = runMigrations(getDb());

  let seeded = false;
  if ((created || process.env.SEED_ON_BOOT === "true") && process.env.NODE_ENV !== "production") {
    const { importContent } = await import("./import-content");
    importContent();
    seeded = true;
  }

  return { created, appliedMigrations: applied, seeded };
}
