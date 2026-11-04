/**
 * Seed the hotel catalogue from a Studio export.
 *
 * The export (`scripts/hotels/seed.json`) is produced by dumping the local
 * `records` rows for `hotels`/`hotelRooms` plus the operational rate,
 * availability and tour-link tables. The container has no `tsx` and no editor
 * bundle, so this module writes those validated rows straight into the CMS
 * database instead of re-implementing the import rules.
 *
 * Why this is safe:
 * - The fixture was written by the same app (same schema, same validation), and
 *   every row is a published copy: the public pages read `published`.
 * - The `records` and hotel-table triggers bump `cms_versions`, so an already
 *   open tab refreshes exactly like a Studio publish.
 * - Only the hotel keys of the settings record are merged; contact details, SEO
 *   and translations are left untouched.
 * - Running it twice replaces the same rows (`ON CONFLICT`/delete+insert) instead
 *   of duplicating the catalogue.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function dayMs(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Ngày không hợp lệ: ${value}`);
  return date.getTime();
}

function isoDay(time) {
  return new Date(time).toISOString().slice(0, 10);
}

/** Availability rows carry demo dates; move them so the calendar starts today. */
function shiftAvailability(rows, anchor, today) {
  if (rows.length === 0) return [];
  const from = ISO_DATE.test(anchor) ? dayMs(anchor) : dayMs(today);
  const delta = Math.round((dayMs(today) - from) / 86_400_000);
  if (delta <= 0) return rows;
  return rows.map((row) => {
    const shifted = ISO_DATE.test(row.date) ? dayMs(row.date) + delta * 86_400_000 : null;
    return shifted === null
      ? row
      : { ...row, date: isoDay(shifted) };
  });
}

export function seedHotels(db, fixture, { today = isoDay(Date.now()) } = {}) {
  const records = Array.isArray(fixture?.records) ? fixture.records : [];
  const hotels = records.filter((row) => row.collection === "hotels");
  const rooms = records.filter((row) => row.collection === "hotelRooms");
  if (hotels.length === 0) throw new Error("File seed không có khách sạn nào.");
  for (const row of records) {
    if (!row.id || !row.data || !row.published) {
      throw new Error(`Bản ghi ${row.collection}/${row.id ?? "?"} thiếu data/published.`);
    }
  }

  const hotelIds = hotels.map((row) => row.id);
  const roomIds = rooms.map((row) => row.id);
  const placeholders = (ids) => ids.map(() => "?").join(",");
  const availability = shiftAvailability(
    Array.isArray(fixture.availability) ? fixture.availability : [],
    fixture.availabilityAnchor,
    today,
  );
  const rateRules = Array.isArray(fixture.rateRules) ? fixture.rateRules : [];
  const tourLinks = Array.isArray(fixture.tourLinks) ? fixture.tourLinks : [];

  const upsertRecord = db.prepare(`
    INSERT INTO records(collection,id,data,published,state,revision,updated_at)
    VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(collection,id) DO UPDATE SET
      data=excluded.data,
      published=excluded.published,
      state=excluded.state,
      revision=records.revision+1,
      updated_at=excluded.updated_at
  `);

  db.exec("BEGIN IMMEDIATE");
  try {
    for (const row of records) {
      upsertRecord.run(
        row.collection,
        row.id,
        row.data,
        row.published,
        row.state === "published" ? "published" : row.state,
        Number.isInteger(row.revision) ? row.revision : 0,
        new Date().toISOString(),
      );
    }

    db.prepare(
      `DELETE FROM hotel_rate_rules WHERE hotel_id IN (${placeholders(hotelIds)})`,
    ).run(...hotelIds);
    const insertRate = db.prepare(`
      INSERT INTO hotel_rate_rules
        (id,hotel_id,room_id,kind,weekdays,start_date,end_date,amount,
         includes_breakfast,includes_tax,fees_note,label,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    for (const rule of rateRules) {
      insertRate.run(
        rule.id,
        rule.hotel_id,
        rule.room_id,
        rule.kind,
        rule.weekdays ?? "",
        rule.start_date ?? null,
        rule.end_date ?? null,
        rule.amount,
        rule.includes_breakfast ?? 0,
        rule.includes_tax ?? 0,
        rule.fees_note ?? "",
        rule.label ?? "",
        rule.created_at ?? new Date().toISOString(),
        rule.updated_at ?? new Date().toISOString(),
      );
    }

    if (roomIds.length > 0) {
      db.prepare(
        `DELETE FROM hotel_availability WHERE room_id IN (${placeholders(roomIds)})`,
      ).run(...roomIds);
    }
    const insertAvailability = db.prepare(`
      INSERT INTO hotel_availability(room_id,date,rooms,closed,note,updated_at)
      VALUES(?,?,?,?,?,?)
    `);
    for (const row of availability) {
      insertAvailability.run(
        row.room_id,
        row.date,
        row.rooms ?? 0,
        row.closed ?? 0,
        row.note ?? "",
        new Date().toISOString(),
      );
    }

    db.prepare(
      `DELETE FROM hotel_tour_links WHERE hotel_id IN (${placeholders(hotelIds)})`,
    ).run(...hotelIds);
    const insertLink = db.prepare(`
      INSERT INTO hotel_tour_links(hotel_id,room_id,tour_slug,relation,condition,created_at)
      VALUES(?,?,?,?,?,?)
    `);
    for (const link of tourLinks) {
      insertLink.run(
        link.hotel_id,
        link.room_id ?? "",
        link.tour_slug,
        link.relation,
        link.condition ?? "",
        link.created_at ?? new Date().toISOString(),
      );
    }

    // Merge only the hotel switches; the production settings keep their own
    // contact details, SEO defaults and translations.
    const settings = db
      .prepare("SELECT data,published FROM records WHERE collection='settings' AND id='site'")
      .get();
    if (!settings) throw new Error("Không tìm thấy bản ghi settings/site.");
    const mergeHotels = (raw) => {
      const value = raw ? JSON.parse(raw) : {};
      return {
        ...value,
        hotels: { ...(value.hotels ?? {}), ...(fixture.settings?.hotels ?? {}) },
      };
    };
    const data = mergeHotels(settings.data);
    const published = mergeHotels(settings.published ?? settings.data);
    db.prepare(
      "UPDATE records SET data=?, published=?, revision=revision+1, updated_at=? WHERE collection='settings' AND id='site'",
    ).run(JSON.stringify(data), JSON.stringify(published), new Date().toISOString());

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    hotels: hotels.length,
    rooms: rooms.length,
    rateRules: rateRules.length,
    availability: availability.length,
    tourLinks: tourLinks.length,
    availabilityFrom: availability.reduce(
      (min, row) => (min === "" || row.date < min ? row.date : min),
      "",
    ),
    enabled: fixture.settings?.hotels?.enabled === true,
  };
}
