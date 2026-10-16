/**
 * Runs once per server start (Node runtime).
 *
 * Brings the SQLite schema up to date before the first request is served. Kept
 * intentionally tiny: no secrets, no network, and any failure surfaces in the
 * server log rather than being swallowed.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if ((process.env.CONTENT_SOURCE ?? "sqlite").toLowerCase() === "remote") return;

  try {
    const { ensureDatabase } = await import("@/server/db/bootstrap");
    const report = await ensureDatabase();
    if (report.created || report.appliedMigrations.length > 0 || report.seeded) {
      console.info(
        `[db] ready (created=${report.created}, migrations=${report.appliedMigrations.join(",") || "none"}, seeded=${report.seeded})`,
      );
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[db] bootstrap failed: ${detail}`);
  }
}
