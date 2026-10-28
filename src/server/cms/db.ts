import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

let database: DatabaseSync | undefined;

/**
 * Thư mục dữ liệu ghi được. Vercel serverless chỉ cho ghi /tmp (tạm thời,
 * mất khi cold start) — VPS dùng volume /app/data bền vững qua `compose.yml`.
 * Biến môi trường CMS_DB_PATH / CMS_UPLOAD_DIR luôn được ưu tiên khi có.
 */
export function cmsDataDir(): string {
  if (process.env.VERCEL) return "/tmp";
  return path.resolve("data");
}

export function db() {
  if (database) return database;
  const file =
    process.env.CMS_DB_PATH ?? path.join(cmsDataDir(), "seatrip.sqlite");
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  database = new DatabaseSync(file);
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
      published TEXT, state TEXT NOT NULL DEFAULT 'draft', revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL, PRIMARY KEY(collection,id));
    CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL, csrf TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS lead_kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, action TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL, actor TEXT, ip TEXT, status TEXT NOT NULL DEFAULT 'success', details TEXT);
    CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, name TEXT NOT NULL, alt TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, data TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', note TEXT NOT NULL DEFAULT '', mail_status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tour_bookings (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      lead_id TEXT,
      tour_slug TEXT NOT NULL,
      tour_title TEXT NOT NULL DEFAULT '',
      travel_date TEXT NOT NULL,
      party_size INTEGER NOT NULL DEFAULT 1 CHECK(party_size > 0),
      sale_amount INTEGER NOT NULL DEFAULT 0 CHECK(sale_amount >= 0),
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','completed','cancelled')),
      note TEXT NOT NULL DEFAULT '',
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tour_bookings_travel ON tour_bookings(travel_date, status);
    CREATE INDEX IF NOT EXISTS idx_tour_bookings_lead ON tour_bookings(lead_id);
    CREATE INDEX IF NOT EXISTS idx_tour_bookings_slug ON tour_bookings(tour_slug);
    CREATE TABLE IF NOT EXISTS tour_finance_entries (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      booking_id TEXT REFERENCES tour_bookings(id) ON DELETE SET NULL,
      kind TEXT NOT NULL CHECK(kind IN ('receipt','refund','expense')),
      amount INTEGER NOT NULL CHECK(amount > 0),
      entry_date TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'cash',
      category TEXT NOT NULL DEFAULT 'other',
      description TEXT NOT NULL DEFAULT '',
      actual INTEGER NOT NULL DEFAULT 1,
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      deleted_reason TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_tour_finance_entries_booking_date ON tour_finance_entries(booking_id, entry_date);
    CREATE INDEX IF NOT EXISTS idx_tour_finance_entries_date ON tour_finance_entries(entry_date, kind);
    CREATE TABLE IF NOT EXISTS backup_runs (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      requested_by TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT,
      backup_id TEXT,
      size_bytes INTEGER,
      app_sha TEXT,
      offsite_status TEXT,
      error TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_backup_runs_status ON backup_runs(status, created_at);
    CREATE TABLE IF NOT EXISTS page_views (id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, locale TEXT NOT NULL DEFAULT 'vi', referrer TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'direct', device TEXT NOT NULL DEFAULT 'desktop', session_id TEXT NOT NULL DEFAULT '', visitor_id TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);
    CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
    CREATE TABLE IF NOT EXISTS web_vitals (id INTEGER PRIMARY KEY AUTOINCREMENT, metric TEXT NOT NULL, value REAL NOT NULL, rating TEXT NOT NULL DEFAULT '', path TEXT NOT NULL, device TEXT NOT NULL DEFAULT 'desktop', navigation_type TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_web_vitals_created ON web_vitals(created_at);
    CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_created ON web_vitals(metric, created_at);
    CREATE TABLE IF NOT EXISTS cms_versions (scope TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 0);
    INSERT OR IGNORE INTO cms_versions(scope) VALUES('public'),('admin');
    CREATE TABLE IF NOT EXISTS cms_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS content_redirects (from_path TEXT PRIMARY KEY, to_path TEXT NOT NULL, created_at TEXT NOT NULL);
    PRAGMA user_version=1;`);
  const leadColumns = database.prepare("PRAGMA table_info(leads)").all() as {
    name: string;
  }[];
  if (!leadColumns.some((column) => column.name === "read_at")) {
    database.exec("ALTER TABLE leads ADD COLUMN read_at TEXT");
  }
  // Soft delete: a lead moved to the trash keeps its encrypted payload until
  // the retention window ends, so the owner can restore it.
  if (!leadColumns.some((column) => column.name === "deleted_at")) {
    database.exec("ALTER TABLE leads ADD COLUMN deleted_at TEXT");
  }
  database.exec(
    "CREATE INDEX IF NOT EXISTS idx_leads_deleted ON leads(deleted_at)",
  );
  // Additive migration for installations created before the activity page.
  // SQLite has no "ADD COLUMN IF NOT EXISTS", so inspect first. Old audit rows
  // keep status='success' (they were only written after a successful mutation)
  // and show "Không đủ dữ liệu" for actor/IP, which were never recorded.
  const auditColumns = new Set(
    (
      database.prepare("PRAGMA table_info(audit)").all() as { name: string }[]
    ).map((column) => column.name),
  );
  const addAuditColumn = (name: string, definition: string) => {
    if (!auditColumns.has(name)) {
      database!.exec(`ALTER TABLE audit ADD COLUMN ${name} ${definition}`);
      auditColumns.add(name);
    }
  };
  addAuditColumn("actor", "TEXT");
  addAuditColumn("ip", "TEXT");
  addAuditColumn("status", "TEXT NOT NULL DEFAULT 'success'");
  addAuditColumn("details", "TEXT");
  database.exec(
    "CREATE INDEX IF NOT EXISTS idx_audit_created ON audit(created_at)",
  );
  // Database triggers make invalidation atomic with the write, including writes
  // from another Node process. Drafts must never invalidate public snapshots.
  for (const table of [
    "records",
    "media",
    "leads",
    "tour_bookings",
    "tour_finance_entries",
  ]) {
    for (const operation of ["INSERT", "UPDATE", "DELETE"]) {
      database.exec(`CREATE TRIGGER IF NOT EXISTS live_${table}_${operation}
        AFTER ${operation} ON ${table} BEGIN
          UPDATE cms_versions SET version=version+1 WHERE scope='admin';
        END;`);
    }
  }
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS live_public_insert AFTER INSERT ON records
    WHEN NEW.published IS NOT NULL AND NEW.state!='deleted' BEGIN
      UPDATE cms_versions SET version=version+1 WHERE scope='public';
    END;
    CREATE TRIGGER IF NOT EXISTS live_public_update AFTER UPDATE ON records
    WHEN (CASE WHEN OLD.state='deleted' THEN NULL ELSE OLD.published END)
      IS NOT (CASE WHEN NEW.state='deleted' THEN NULL ELSE NEW.published END) BEGIN
      UPDATE cms_versions SET version=version+1 WHERE scope='public';
    END;
    CREATE TRIGGER IF NOT EXISTS live_public_delete AFTER DELETE ON records
    WHEN OLD.published IS NOT NULL AND OLD.state!='deleted' BEGIN
      UPDATE cms_versions SET version=version+1 WHERE scope='public';
    END;
  `);
  return database;
}
export function contentVersion(scope: "public" | "admin"): string {
  return String(
    (
      db()
        .prepare("SELECT version FROM cms_versions WHERE scope=?")
        .get(scope) as { version: number }
    ).version,
  );
}

/**
 * Content repairs are recorded by id, so a one-time backfill runs exactly once
 * per database — including a volume restored from a backup — instead of on
 * every boot. The ledger table is created with the rest of the schema, so an
 * existing install gets it on the next start without a manual step.
 */
export function migrationApplied(id: string): boolean {
  return Boolean(
    db().prepare("SELECT 1 FROM cms_migrations WHERE id=?").get(id),
  );
}

export function markMigration(id: string): void {
  db()
    .prepare("INSERT OR IGNORE INTO cms_migrations(id,applied_at) VALUES(?,?)")
    .run(id, new Date().toISOString());
}
export type AuditStatus = "success" | "failure";

/** Who performed an audited action and from where. Missing for records written by older releases. */
export type AuditContext = {
  actor?: string | null;
  ip?: string | null;
};

export type AuditMeta = AuditContext & {
  status?: AuditStatus;
  /**
   * Small, customer-safe context for the admin activity page. Never put
   * passwords, tokens, lead notes or full record bodies here.
   */
  details?: Record<string, unknown> | null;
};

function auditText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

export function audit(action: string, target: string, meta: AuditMeta = {}) {
  let details: string | null = null;
  if (meta.details) {
    try {
      details = JSON.stringify(meta.details).slice(0, 4000);
    } catch {
      details = null;
    }
  }
  try {
    db()
      .prepare(
        "INSERT INTO audit(action,target,created_at,actor,ip,status,details) VALUES(?,?,?,?,?,?,?)",
      )
      .run(
        auditText(action, 80) ?? "unknown",
        auditText(target, 160) ?? "",
        new Date().toISOString(),
        auditText(meta.actor, 80),
        auditText(meta.ip, 80),
        meta.status === "failure" ? "failure" : "success",
        details,
      );
  } catch (error) {
    // An audit write must not turn a successful content save into an error for
    // the admin. The activity page reports missing data instead of guessing.
    console.error(
      "[cms] audit write failed",
      error instanceof Error ? error.message : "unknown",
    );
  }
}
export function transaction<T>(operation: () => T): T {
  const connection = db();
  connection.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    connection.exec("COMMIT");
    return result;
  } catch (error) {
    connection.exec("ROLLBACK");
    throw error;
  }
}
