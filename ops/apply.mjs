import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";

/**
 * Idempotent English-overlay backfill used by the temporary content-ops job.
 *
 * Input: /tmp/seatrip-apply.json, written by the workflow:
 *   { "records": { "tours": { "<id>": { ...partial _en... } }, ... } }
 *
 * Safety rules:
 * - only fills `data._en` keys that are currently empty/missing;
 * - never changes any Vietnamese field;
 * - never clears an existing English string or array item;
 * - creates a SQLite backup before the first write;
 * - skips records that are deleted or unchanged, so a rerun is a no-op.
 */
const file = process.env.CMS_DB_PATH || "/app/data/seatrip.sqlite";
const input = JSON.parse(readFileSync("/tmp/seatrip-apply.json", "utf8"));
const db = new DatabaseSync(file);
db.exec("PRAGMA busy_timeout=10000");
mkdirSync("/app/data", { recursive: true });

const isObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
const hasText = (value) => typeof value === "string" && value.trim() !== "";

/** Keep existing non-empty values; fill only what is absent. */
function fill(target, source, seen = new WeakSet()) {
  if (Array.isArray(source)) {
    const output = Array.isArray(target) ? [...target] : [];
    source.forEach((item, index) => {
      if (isObject(item) || Array.isArray(item)) {
        output[index] = fill(output[index], item, seen);
      } else if (hasText(output[index])) {
        return;
      } else if (output[index] === undefined || output[index] === null || output[index] === "") {
        output[index] = item;
      }
    });
    return output;
  }
  if (isObject(source)) {
    const output = isObject(target) ? { ...target } : {};
    if (seen.has(source)) return output;
    seen.add(source);
    for (const [key, value] of Object.entries(source)) {
      output[key] = fill(output[key], value, seen);
    }
    return output;
  }
  if (hasText(target)) return target;
  if (target !== undefined && target !== null && target !== "") return target;
  return source;
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = `/app/data/translations-backup-${stamp}.sqlite`;
db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);

const summary = { backup, updated: [], skipped: [], missing: [] };
db.exec("BEGIN IMMEDIATE");
try {
  for (const [collection, entries] of Object.entries(input.records ?? {})) {
    for (const [id, en] of Object.entries(entries ?? {})) {
      const row = db
        .prepare(
          "SELECT data,state,revision FROM records WHERE collection=? AND id=?",
        )
        .get(collection, id);
      if (!row) {
        summary.missing.push(`${collection}/${id}`);
        continue;
      }
      if (row.state === "deleted") {
        summary.skipped.push(`${collection}/${id} (deleted)`);
        continue;
      }
      const data = JSON.parse(row.data);
      const next = fill(data._en, en);
      if (JSON.stringify(next) === JSON.stringify(data._en ?? {})) {
        summary.skipped.push(`${collection}/${id}`);
        continue;
      }
      data._en = next;
      db.prepare(
        "UPDATE records SET data=?, revision=revision+1, updated_at=? WHERE collection=? AND id=?",
      ).run(
        JSON.stringify(data),
        new Date().toISOString(),
        collection,
        id,
      );
      summary.updated.push(`${collection}/${id}`);
    }
  }
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}

process.stdout.write(JSON.stringify(summary, null, 2));
