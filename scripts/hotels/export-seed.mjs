/**
 * Export the local Studio hotel catalogue into `scripts/hotels/seed.json`.
 *
 * The production container has no editor bundle, so the catalogue travels as a
 * plain row dump: `hotels`/`hotelRooms` records (data + published) plus the rate,
 * availability and tour-link tables and the `hotels` settings block. Only
 * published rows are accepted — a seed is a publication, not a draft.
 *
 *   npm run hotels:export                     # uses CMS_DB_PATH or data/seatrip.sqlite
 *   npm run hotels:export -- --db data/x.sqlite --out scripts/hotels/seed.json
 */
import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const file =
  argOf("--db", process.env.CMS_DB_PATH ?? path.resolve("data/seatrip.sqlite"));
const out = argOf("--out", path.resolve("scripts/hotels/seed.json"));
const db = new DatabaseSync(file);
const rows = (sql, values = []) =>
  JSON.parse(JSON.stringify(db.prepare(sql).all(...values)));
const list = (values) => values.map(() => "?").join(",");

try {
  const records = rows(
    "SELECT collection,id,data,published,state,revision FROM records WHERE collection IN ('hotels','hotelRooms') ORDER BY collection,id",
  );
  for (const row of records) {
    if (row.state !== "published" || !row.published) {
      throw new Error(
        `Bản ghi ${row.collection}/${row.id} chưa xuất bản. Xuất bản trong Studio trước khi xuất file seed.`,
      );
    }
  }
  const hotelIds = records
    .filter((row) => row.collection === "hotels")
    .map((row) => JSON.parse(row.data).id);
  const roomIds = records
    .filter((row) => row.collection === "hotelRooms")
    .map((row) => JSON.parse(row.data).id);
  if (hotelIds.length === 0) throw new Error("Không có khách sạn nào để xuất.");

  const settings = JSON.parse(
    db
      .prepare("SELECT data FROM records WHERE collection='settings' AND id='site'")
      .get().data,
  );
  const availability = rows(
    `SELECT * FROM hotel_availability WHERE room_id IN (${list(roomIds)}) ORDER BY room_id,date`,
    roomIds,
  );

  const fixture = {
    note: "Dữ liệu khách sạn xuất từ Studio local. Ảnh CC0, giá demo — chỉ dùng để dựng giao diện.",
    exportedAt: new Date().toISOString(),
    // Demo availability is relative: the seed moves it so the calendar starts today.
    availabilityAnchor:
      availability.reduce(
        (min, row) => (min === "" || row.date < min ? row.date : min),
        "",
      ) || new Date().toISOString().slice(0, 10),
    settings: { hotels: settings.hotels },
    records: records.map((row) => ({
      collection: row.collection,
      id: row.id,
      data: row.data,
      published: row.published,
      state: row.state,
      revision: row.revision,
    })),
    rateRules: rows(
      `SELECT * FROM hotel_rate_rules WHERE hotel_id IN (${list(hotelIds)}) ORDER BY hotel_id,room_id,kind,start_date`,
      hotelIds,
    ),
    availability,
    tourLinks: rows(
      `SELECT * FROM hotel_tour_links WHERE hotel_id IN (${list(hotelIds)}) ORDER BY hotel_id,room_id,tour_slug`,
      hotelIds,
    ),
  };

  writeFileSync(out, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(
    `Đã xuất ${hotelIds.length} khách sạn, ${roomIds.length} hạng phòng, ${fixture.rateRules.length} giá, ${availability.length} dòng tình trạng → ${path.relative(process.cwd(), out)}`,
  );
} finally {
  db.close();
}
