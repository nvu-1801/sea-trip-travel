import { DatabaseSync } from "node:sqlite";

/**
 * Read-only production content dump used by the temporary content-ops job.
 * Prints one JSON document to stdout so the workflow can upload it as an
 * artifact. No content is written and no credentials are involved.
 */
const file = process.env.CMS_DB_PATH || "/app/data/seatrip.sqlite";
const collections = ["tours", "categories", "destinations", "articles"];
const db = new DatabaseSync(file, { readOnly: true });
const payload = {
  generatedAt: new Date().toISOString(),
  database: file,
  records: {},
};

for (const collection of collections) {
  payload.records[collection] = db
    .prepare(
      "SELECT id,state,revision,updated_at,data FROM records WHERE collection=? ORDER BY id",
    )
    .all(collection)
    .map((row) => ({ ...row, data: JSON.parse(row.data) }));
}

process.stdout.write(JSON.stringify(payload));
