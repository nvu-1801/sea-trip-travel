import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { seedHotels } from "../scripts/lib/hotels-seed.mjs";

/**
 * The production seed writes the Studio export straight into the CMS tables.
 * These assertions are the contract: the fixture is published, availability is
 * re-anchored to today, settings only gain the hotel switches, and a second run
 * replaces instead of duplicating.
 */

const fixture = JSON.parse(
  readFileSync(new URL("../scripts/hotels/seed.json", import.meta.url), "utf8"),
);

function tempDb() {
  const directory = mkdtempSync(path.join(tmpdir(), "seatrip-seed-"));
  const db = new DatabaseSync(path.join(directory, "seed.sqlite"));
  db.exec(`
    CREATE TABLE records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
      published TEXT, state TEXT NOT NULL DEFAULT 'draft', revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL, PRIMARY KEY(collection,id));
    CREATE TABLE hotel_rate_rules (id TEXT PRIMARY KEY, hotel_id TEXT NOT NULL, room_id TEXT NOT NULL,
      kind TEXT NOT NULL, weekdays TEXT NOT NULL DEFAULT '', start_date TEXT, end_date TEXT,
      amount INTEGER NOT NULL, includes_breakfast INTEGER NOT NULL DEFAULT 0,
      includes_tax INTEGER NOT NULL DEFAULT 0, fees_note TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE hotel_availability (room_id TEXT NOT NULL, date TEXT NOT NULL, rooms INTEGER NOT NULL,
      closed INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL,
      PRIMARY KEY(room_id,date));
    CREATE TABLE hotel_tour_links (hotel_id TEXT NOT NULL, room_id TEXT NOT NULL DEFAULT '',
      tour_slug TEXT NOT NULL, relation TEXT NOT NULL, condition TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL, PRIMARY KEY(hotel_id,room_id,tour_slug));
  `);
  db.prepare(
    "INSERT INTO records(collection,id,data,published,state,revision,updated_at) VALUES('settings','site',?,?, 'published',4,?)",
  ).run(
    JSON.stringify({ name: "SEA TRIP", contact: { hotline: "0909" }, hotels: { enabled: false } }),
    JSON.stringify({ name: "SEA TRIP", contact: { hotline: "0909" }, hotels: { enabled: false } }),
    "2026-01-01T00:00:00.000Z",
  );
  return { db, directory };
}

test("seeds the hotel catalogue as published rows", () => {
  const { db, directory } = tempDb();
  try {
    const summary = seedHotels(db, fixture, { today: "2026-11-04" });
    assert.equal(summary.hotels, 8);
    assert.equal(summary.rooms, 23);
    assert.ok(summary.rateRules > 0);

    const hotels = db
      .prepare("SELECT state, published FROM records WHERE collection='hotels'")
      .all();
    assert.equal(hotels.length, 8);
    for (const row of hotels) {
      assert.equal(row.state, "published");
      assert.ok(row.published, "every hotel needs a published copy");
    }

    const rules = db.prepare("SELECT COUNT(*) n FROM hotel_rate_rules").get();
    assert.equal(rules.n, summary.rateRules);

    const availability = db
      .prepare("SELECT MIN(date) min FROM hotel_availability")
      .get();
    assert.equal(availability.min, "2026-11-04");

    const settings = JSON.parse(
      db.prepare("SELECT data FROM records WHERE collection='settings'").get().data,
    );
    assert.equal(settings.hotels.enabled, true);
    assert.equal(settings.hotels.homeVisible, true);
    assert.equal(settings.contact.hotline, "0909", "other settings stay untouched");
    const publishedSettings = JSON.parse(
      db.prepare("SELECT published FROM records WHERE collection='settings'").get().published,
    );
    assert.equal(publishedSettings.hotels.enabled, true);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a second run replaces the same rows instead of duplicating them", () => {
  const { db, directory } = tempDb();
  try {
    seedHotels(db, fixture, { today: "2026-11-04" });
    const first = db.prepare("SELECT COUNT(*) n FROM hotel_rate_rules").get().n;
    const revision = db
      .prepare("SELECT revision FROM records WHERE collection='hotels' AND id=?")
      .get(fixture.records.find((row) => row.collection === "hotels").id).revision;

    seedHotels(db, fixture, { today: "2026-11-06" });
    assert.equal(db.prepare("SELECT COUNT(*) n FROM hotel_rate_rules").get().n, first);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM records WHERE collection='hotels'").get().n, 8);
    assert.equal(
      db
        .prepare("SELECT revision FROM records WHERE collection='hotels' AND id=?")
        .get(fixture.records.find((row) => row.collection === "hotels").id).revision,
      revision + 1,
    );
    assert.equal(
      db.prepare("SELECT MIN(date) min FROM hotel_availability").get().min,
      "2026-11-06",
      "availability follows the seed day",
    );
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("an empty fixture is refused before writing anything", () => {
  const { db, directory } = tempDb();
  try {
    assert.throws(() => seedHotels(db, { records: [] }), /không có khách sạn/);
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM records WHERE collection='hotels'").get().n,
      0,
    );
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
