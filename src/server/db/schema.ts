/**
 * SQLite schema for the SEA TRIP TRAVEL admin backend.
 *
 * Design rules (mirrors `docs/admin-roadmap.md`):
 *   - Scalar, owned fields are columns. Arrays owned by one row are JSON text.
 *   - Many-to-many relations (tour↔category, tour↔destination, article↔tour)
 *     are join tables — never a JSON array in a column.
 *   - Rows are addressed by the *domain* id/slug so the imported data keeps its
 *     identity, and every public URL stays stable.
 *   - Nothing is ever hard-deleted in this cycle: `deleted_at` powers the trash.
 *
 * Migrations are append-only. Never edit an applied migration — add a new one.
 */

export type Migration = {
  id: string;
  sql: string;
};

const M0001 = `
CREATE TABLE IF NOT EXISTS admin_user (
  id                  TEXT PRIMARY KEY,
  username            TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  password_changed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_session (
  id          TEXT PRIMARY KEY,
  token_hash  TEXT NOT NULL UNIQUE,
  user_id     TEXT NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT,
  ua_hash     TEXT,
  ip_hash     TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_session_user ON admin_session(user_id);

CREATE TABLE IF NOT EXISTS login_attempt (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL,
  window_start TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_audit (
  id        TEXT PRIMARY KEY,
  actor     TEXT NOT NULL,
  action    TEXT NOT NULL,
  entity    TEXT,
  entity_id TEXT,
  summary   TEXT,
  at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_at ON admin_audit(at);

/* --- Categories & destinations ------------------------------------------- */

CREATE TABLE IF NOT EXISTS category (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  path           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  parent_id      TEXT,
  region         TEXT NOT NULL,
  description    TEXT NOT NULL,
  tagline        TEXT,
  image_src      TEXT,
  image_alt      TEXT,
  seo_title      TEXT,
  seo_description TEXT,
  seo_og_image   TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  content_status TEXT NOT NULL DEFAULT 'demo'
);

CREATE TABLE IF NOT EXISTS destination (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  region         TEXT NOT NULL,
  summary        TEXT NOT NULL,
  province       TEXT,
  image_src      TEXT,
  image_alt      TEXT,
  image_width    INTEGER,
  image_height   INTEGER,
  image_caption  TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  content_status TEXT NOT NULL DEFAULT 'demo'
);

/* --- Tours ---------------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS tour (
  id                TEXT PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  summary           TEXT NOT NULL,
  tour_code         TEXT,
  duration_days     INTEGER NOT NULL,
  duration_nights   INTEGER NOT NULL,
  price_amount      INTEGER,
  price_currency    TEXT NOT NULL DEFAULT 'VND',
  price_note        TEXT,
  departure_points  TEXT NOT NULL DEFAULT '[]',
  return_points     TEXT NOT NULL DEFAULT '[]',
  transport         TEXT NOT NULL DEFAULT '[]',
  highlights        TEXT NOT NULL DEFAULT '[]',
  overview          TEXT NOT NULL DEFAULT '[]',
  included          TEXT NOT NULL DEFAULT '[]',
  excluded          TEXT NOT NULL DEFAULT '[]',
  notes             TEXT NOT NULL DEFAULT '[]',
  policies          TEXT NOT NULL DEFAULT '[]',
  tags              TEXT NOT NULL DEFAULT '[]',
  gifts             TEXT NOT NULL DEFAULT '[]',
  source_documents  TEXT NOT NULL DEFAULT '[]',
  seo_title         TEXT,
  seo_description   TEXT,
  seo_og_image      TEXT,
  content_status    TEXT NOT NULL DEFAULT 'demo',
  status            TEXT NOT NULL DEFAULT 'draft',
  featured          INTEGER NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  search_text       TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  published_at      TEXT,
  deleted_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_tour_status ON tour(status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_tour_featured ON tour(featured, sort_order);

CREATE TABLE IF NOT EXISTS tour_image (
  id       TEXT PRIMARY KEY,
  tour_id  TEXT NOT NULL REFERENCES tour(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  src      TEXT,
  alt      TEXT NOT NULL,
  width    INTEGER,
  height   INTEGER,
  caption  TEXT,
  media_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_tour_image_tour ON tour_image(tour_id, position);

CREATE TABLE IF NOT EXISTS tour_itinerary_day (
  id            TEXT NOT NULL,
  tour_id       TEXT NOT NULL REFERENCES tour(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  title         TEXT NOT NULL,
  summary       TEXT,
  activities    TEXT NOT NULL DEFAULT '[]',
  meals         TEXT NOT NULL DEFAULT '[]',
  places        TEXT NOT NULL DEFAULT '[]',
  accommodation TEXT,
  PRIMARY KEY (tour_id, position)
);
CREATE INDEX IF NOT EXISTS idx_tour_day_tour ON tour_itinerary_day(tour_id, position);

CREATE TABLE IF NOT EXISTS tour_pricing_option (
  id                  TEXT NOT NULL,
  tour_id             TEXT NOT NULL REFERENCES tour(id) ON DELETE CASCADE,
  position            INTEGER NOT NULL,
  label               TEXT NOT NULL,
  accommodation_class TEXT,
  adult_price         INTEGER NOT NULL,
  child_price         INTEGER NOT NULL DEFAULT 0,
  surcharge           TEXT,
  valid_from          TEXT,
  valid_to            TEXT,
  note                TEXT,
  PRIMARY KEY (tour_id, position)
);
CREATE INDEX IF NOT EXISTS idx_tour_price_tour ON tour_pricing_option(tour_id, position);

CREATE TABLE IF NOT EXISTS tour_category (
  tour_id     TEXT NOT NULL REFERENCES tour(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  PRIMARY KEY (tour_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_tour_category_cat ON tour_category(category_id);

CREATE TABLE IF NOT EXISTS tour_destination (
  tour_id        TEXT NOT NULL REFERENCES tour(id) ON DELETE CASCADE,
  destination_id TEXT NOT NULL,
  PRIMARY KEY (tour_id, destination_id)
);
CREATE INDEX IF NOT EXISTS idx_tour_destination_dest ON tour_destination(destination_id);

/* --- Articles ------------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS article (
  id                TEXT PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  excerpt           TEXT NOT NULL,
  author            TEXT NOT NULL,
  reading_minutes   INTEGER,
  cover_src         TEXT,
  cover_alt         TEXT,
  cover_width       INTEGER,
  cover_height      INTEGER,
  cover_caption     TEXT,
  tags              TEXT NOT NULL DEFAULT '[]',
  published_at      TEXT NOT NULL,
  updated_at        TEXT,
  seo_title         TEXT,
  seo_description   TEXT,
  seo_og_image      TEXT,
  content_status    TEXT NOT NULL DEFAULT 'demo',
  status            TEXT NOT NULL DEFAULT 'draft',
  featured          INTEGER NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  record_updated_at TEXT NOT NULL,
  published_ts      TEXT,
  deleted_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_article_status ON article(status, deleted_at);

CREATE TABLE IF NOT EXISTS article_block (
  id         TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  type       TEXT NOT NULL,
  payload    TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_article_block_article ON article_block(article_id, position);

CREATE TABLE IF NOT EXISTS article_destination (
  article_id     TEXT NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  destination_id TEXT NOT NULL,
  PRIMARY KEY (article_id, destination_id)
);

CREATE TABLE IF NOT EXISTS article_tour (
  article_id TEXT NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  tour_slug  TEXT NOT NULL,
  PRIMARY KEY (article_id, tour_slug)
);

/* --- Translations --------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS content_translation (
  entity_type       TEXT NOT NULL,
  entity_id         TEXT NOT NULL,
  locale            TEXT NOT NULL,
  source_updated_at TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',
  payload           TEXT NOT NULL DEFAULT '{}',
  updated_at        TEXT NOT NULL,
  PRIMARY KEY (entity_type, entity_id, locale)
);

/* --- Media ---------------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS media (
  id            TEXT PRIMARY KEY,
  storage       TEXT NOT NULL,
  url           TEXT NOT NULL,
  filename      TEXT,
  original_name TEXT,
  mime          TEXT NOT NULL,
  bytes         INTEGER NOT NULL,
  width         INTEGER,
  height        INTEGER,
  sha256        TEXT,
  variants      TEXT NOT NULL DEFAULT '[]',
  alt_default   TEXT,
  created_at    TEXT NOT NULL,
  deleted_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_media_sha ON media(sha256);
CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at);

/* --- Slug redirects ------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS slug_redirect (
  entity_type TEXT NOT NULL,
  from_slug   TEXT NOT NULL,
  to_slug     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (entity_type, from_slug)
);

/* --- Leads ---------------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS lead (
  request_id   TEXT PRIMARY KEY,
  received_at  TEXT NOT NULL,
  full_name    TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT,
  interest     TEXT,
  tour_slug    TEXT,
  travel_date  TEXT,
  party_size   INTEGER,
  message      TEXT,
  source_page  TEXT,
  locale       TEXT NOT NULL DEFAULT 'vi',
  utm          TEXT,
  status       TEXT NOT NULL DEFAULT 'new',
  email_status TEXT NOT NULL DEFAULT 'pending',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  ip_hash      TEXT,
  ua_hash      TEXT,
  deleted_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_lead_status ON lead(status, received_at);
CREATE INDEX IF NOT EXISTS idx_lead_received ON lead(received_at);

CREATE TABLE IF NOT EXISTS lead_note (
  id         TEXT PRIMARY KEY,
  lead_id    TEXT NOT NULL REFERENCES lead(request_id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_note_lead ON lead_note(lead_id);

/* --- Site settings -------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS site_setting (
  key        TEXT NOT NULL,
  locale     TEXT NOT NULL,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (key, locale)
);
`;

export const MIGRATIONS: readonly Migration[] = [
  { id: "0001_init", sql: M0001 },
];
