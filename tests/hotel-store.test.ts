import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { contentVersion, db } from "@/server/cms/db";
import { hotelSettings, list, published, purgeExpiredTrash, purgeHotelTrash, redirectTarget, save } from "@/server/cms/store";
import * as hotelStore from "@/server/hotels/store";
import * as publicModel from "@/server/hotels/public";
import { priceStay } from "@/domain/hotel-pricing";
import { resolveAvailability } from "@/domain/hotel-availability";

/**
 * Persistence, migration and write-guard checks for the hotel module.
 *
 * The database starts as an installation from before this module (records and
 * leads only). Every expectation runs against the real SQLite file, so a
 * migration that would break an existing volume fails here first.
 */

const directory = mkdtempSync(path.join(tmpdir(), "seatrip-hotels-"));
const databasePath = path.join(directory, "legacy.sqlite");
process.env.CMS_DB_PATH = databasePath;
process.env.CMS_ENABLED = "1";
process.env.LEAD_ENCRYPTION_KEY = randomBytes(32).toString("hex");

// Legacy schema: no hotel tables, no hotel columns on `leads`.
// Safe at module scope: `db()` is lazy and nothing above calls it yet.
{
  const legacy = new DatabaseSync(databasePath);
  legacy.exec(`
    CREATE TABLE records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
      published TEXT, state TEXT NOT NULL DEFAULT 'draft', revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL, PRIMARY KEY(collection,id));
    CREATE TABLE leads (id TEXT PRIMARY KEY, data TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new',
      note TEXT NOT NULL DEFAULT '', mail_status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL);
  `);
  legacy.close();
}

after(() => {
  try {
    db().close();
  } catch {
    // The connection may already be closed if a test failed early.
  }
  rmSync(directory, { recursive: true, force: true });
});

const NOW = "2026-10-01T00:00:00.000Z";

function hotelRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "hotel_demo",
    slug: "demo-resort",
    name: "Demo Resort",
    province: "Bình Định",
    address: "1 Trần Hưng Đạo, Quy Nhơn",
    lodgingType: "resort",
    starRating: 4,
    starBasis: "Theo công bố của khách sạn (dữ liệu demo)",
    summary: "Khách sạn demo dùng cho kiểm thử local.",
    description: ["Nội dung demo, không xuất bản production."],
    amenities: ["Hồ bơi", "Bãi biển"],
    images: [{ src: "/images/demo/hotel.jpg", alt: "Ảnh demo" }],
    checkInTime: "14:00",
    checkOutTime: "12:00",
    roomMode: "manual_daily",
    order: 0,
    contentStatus: "demo",
    updatedAt: NOW,
    ...overrides,
  };
}

function roomRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "room_demo",
    hotelId: "hotel_demo",
    name: "Deluxe hướng biển",
    capacityAdults: 2,
    capacityChildren: 1,
    maxOccupancy: 3,
    amenities: ["Ban công"],
    images: [],
    order: 0,
    contentStatus: "demo",
    updatedAt: NOW,
    ...overrides,
  };
}

const publishedIds = (collection: "hotels" | "hotelRooms") =>
  published<{ id: string }>(collection, []).map((row) => row.id);

describe("migration", () => {
  it("adds the hotel tables and lead columns to an existing database", () => {
    db();
    const tables = (
      db()
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as { name: string }[]
    ).map((row) => row.name);
    for (const table of [
      "hotel_rate_rules",
      "hotel_availability",
      "hotel_tour_links",
      "hotel_lead_plans",
    ])
      assert.ok(tables.includes(table), `${table} must exist`);

    const columns = (
      db().prepare("PRAGMA table_info(leads)").all() as { name: string }[]
    ).map((row) => row.name);
    for (const column of ["kind", "hotel_id", "stay_checkin", "stay_checkout"])
      assert.ok(columns.includes(column), `${column} must be added`);
  });

  it("keeps the module off by default", () => {
    assert.deepEqual(hotelSettings(), {
      enabled: false,
      homeVisible: false,
      featured: [],
    });
  });

  it("is safe to start twice on the same file", () => {
    assert.doesNotThrow(() => db());
    const columns = (
      db().prepare("PRAGMA table_info(leads)").all() as { name: string }[]
    ).filter((row) => row.name === "kind");
    assert.equal(columns.length, 1);
  });
});

describe("hotel and room persistence", () => {
  it("creates a hotel as a draft, then publishes it", () => {
    const draft = hotelRecord({ province: "", address: "", summary: "" });
    const created = save("hotels", draft, 0, "save");
    assert.equal(created.revision, 1);
    assert.equal(list("hotels")[0].data.province, "");
    assert.throws(
      () => save("hotels", { ...draft, province: " " }, 1, "publish"),
      /Nhập tỉnh\/thành phố/,
    );
    assert.deepEqual(publishedIds("hotels"), []);
    save("hotels", hotelRecord(), 1, "publish");
    assert.deepEqual(publishedIds("hotels"), ["hotel_demo"]);
    const reloaded = list("hotels")[0];
    assert.equal(reloaded.data.name, "Demo Resort");
    assert.equal(reloaded.state, "published");
  });

  it("keeps the published snapshot when the next edit is still a draft", () => {
    save("hotels", hotelRecord({ name: "Bản nháp mới" }), 2, "save");
    assert.deepEqual(publishedIds("hotels"), ["hotel_demo"]);
    const live = publicModel.publicHotelDetail("demo-resort", "vi");
    assert.equal(live?.name, "Demo Resort");
    save("hotels", hotelRecord({ name: "Demo Resort" }), 3, "publish");
  });

  it("rejects a stale revision instead of overwriting", () => {
    assert.throws(
      () => save("hotels", hotelRecord({ name: "Ghi đè" }), 0, "save"),
      /đã thay đổi/,
    );
  });

  it("rejects a duplicate slug", () => {
    assert.throws(
      () =>
        save(
          "hotels",
          hotelRecord({
            id: "hotel_other",
            name: "Khách sạn khác",
            slug: "demo-resort",
          }),
          0,
          "save",
        ),
      /đã tồn tại/,
    );
  });

  it("normalizes hotel slugs, reserves the live URL during drafts, and redirects after publication", () => {
    const hotel = hotelRecord({ id: "hotel_slug_test", name: "Khách sạn Đà Nẵng", slug: "" });
    save("hotels", hotel, 0, "publish");
    const oldPath = "/khach-san/khach-san-da-nang";
    assert.equal(publicModel.publicHotelDetail("khach-san-da-nang", "vi")?.id, hotel.id);

    const draft = { ...hotel, slug: "Đường dẫn Riêng!" };
    const saved = save("hotels", draft, 1, "save");
    assert.equal(saved.slug, "duong-dan-rieng");
    assert.equal(redirectTarget(oldPath), null);
    assert.throws(
      () => save("hotels", { ...hotel, id: "hotel_slug_duplicate", slug: "KHÁCH SẠN ĐÀ NẴNG" }, 0, "save"),
      /đã tồn tại/,
    );

    save("hotels", draft, 2, "publish");
    assert.equal(redirectTarget(oldPath), "/khach-san/duong-dan-rieng");
    assert.equal(publicModel.publicHotelDetail("duong-dan-rieng", "vi")?.id, hotel.id);
    save("hotels", hotel, 3, "publish");
    assert.equal(redirectTarget(oldPath), null);
    assert.equal(redirectTarget("/khach-san/duong-dan-rieng"), oldPath);
    save("hotels", hotel, 4, "delete");
    purgeHotelTrash([{ id: hotel.id, revision: 5 }]);
  });

  it("links a hotel to an existing destination only", () => {
    assert.throws(
      () =>
        save(
          "hotels",
          hotelRecord({ destinationId: "dest_khong_ton_tai" }),
          4,
          "save",
        ),
      /Điểm đến/,
    );
  });

  it("creates a room under the hotel and publishes it", () => {
    save("hotelRooms", roomRecord(), 0, "publish");
    assert.deepEqual(publishedIds("hotelRooms"), ["room_demo"]);
    assert.equal(hotelStore.publishedRoomsOf("hotel_demo").length, 1);
  });

  it("refuses a room whose hotel does not exist", () => {
    assert.throws(
      () =>
        save(
          "hotelRooms",
          roomRecord({ id: "room_x", hotelId: "hotel_missing" }),
          0,
          "save",
        ),
      /Khách sạn/,
    );
  });

  it("refuses to move an existing room to another hotel", () => {
    assert.throws(
      () =>
        save("hotelRooms", roomRecord({ hotelId: "hotel_moved" }), 1, "save"),
      /Không chuyển hạng phòng/,
    );
  });

  it("archives a hotel without deleting its rooms or lead data", () => {
    save("hotels", hotelRecord(), 4, "delete");
    assert.deepEqual(publishedIds("hotels"), []);
    assert.deepEqual(publishedIds("hotelRooms"), ["room_demo"]);
    save("hotels", hotelRecord(), 5, "restore");
    save("hotels", hotelRecord(), 6, "publish");
    assert.deepEqual(publishedIds("hotels"), ["hotel_demo"]);
  });
});

it("purges only archived hotels and cascades their operational data at 60 days", () => {
  const archived = hotelRecord({ id: "hotel_expired", slug: "expired-hotel" });
  const recent = hotelRecord({ id: "hotel_recent", slug: "recent-hotel" });
  const room = roomRecord({ id: "room_expired", hotelId: archived.id });
  save("hotels", archived, 0, "save");
  save("hotels", recent, 0, "save");
  save("hotelRooms", room, 0, "save");
  db().prepare("INSERT INTO hotel_availability(room_id,date,rooms,updated_at) VALUES(?,?,?,?)")
    .run(room.id, "2026-10-01", 1, NOW);
  const archivedRow = save("hotels", archived, 1, "delete");
  assert.throws(() => purgeHotelTrash([
    { id: archived.id, revision: archivedRow.revision },
    { id: recent.id, revision: 1 },
  ]), /Thùng rác đã thay đổi/);
  assert.ok(list("hotelRooms").some((row) => row.id === room.id));
  db().prepare("UPDATE records SET updated_at=? WHERE collection='hotels' AND id=?").run(NOW, archived.id);
  const expires = Date.parse(NOW) + 60 * 24 * 60 * 60 * 1000;
  assert.equal(purgeExpiredTrash(expires - 1, true), 0);
  assert.equal(purgeExpiredTrash(expires, true), 1);
  assert.ok(!list("hotels").some((row) => row.id === archived.id));
  assert.ok(!list("hotelRooms").some((row) => row.id === room.id));
  assert.equal(db().prepare("SELECT 1 FROM hotel_availability WHERE room_id=?").get(room.id), undefined);
  const recentRow = save("hotels", recent, 1, "delete");
  assert.deepEqual(purgeHotelTrash([{ id: recent.id, revision: recentRow.revision }]), { removed: 1 });
});

describe("rate rules", () => {
  const baseRule = {
    id: "rate-base",
    hotelId: "hotel_demo",
    roomId: "room_demo",
    kind: "base" as const,
    amount: 1_000_000,
  };

  it("saves a base and a weekend rule and prices a stay", () => {
    const result = hotelStore.saveRateRules({
      hotelId: "hotel_demo",
      rooms: [
        {
          roomId: "room_demo",
          expectedUpdatedAt: null,
          rules: [
            baseRule,
            {
              id: "rate-weekend",
              hotelId: "hotel_demo",
              roomId: "room_demo",
              kind: "weekday",
              weekdays: [5, 6],
              amount: 1_200_000,
            },
          ],
        },
      ],
    });
    assert.ok(result.updatedAt);
    const rules = hotelStore.listRateRules("hotel_demo");
    assert.equal(rules.length, 2);
    // 2026-10-03 is a Saturday.
    const priced = priceStay(rules, "2026-10-03", "2026-10-04");
    assert.equal(priced.ok, true);
    if (!priced.ok) return;
    assert.equal(priced.total, 1_200_000);
  });

  it("rejects overlapping rules of the same priority before writing", () => {
    const before = hotelStore.listRateRules("hotel_demo").length;
    assert.throws(
      () =>
        hotelStore.saveRateRules({
          hotelId: "hotel_demo",
          rooms: [
            {
              roomId: "room_demo",
              expectedUpdatedAt: hotelStore.rateRulesUpdatedAt("room_demo"),
              rules: [
                baseRule,
                {
                  id: "a",
                  hotelId: "hotel_demo",
                  roomId: "room_demo",
                  kind: "date_range",
                  startDate: "2026-12-20",
                  endDate: "2026-12-27",
                  amount: 2_000_000,
                },
                {
                  id: "b",
                  hotelId: "hotel_demo",
                  roomId: "room_demo",
                  kind: "date_range",
                  startDate: "2026-12-25",
                  endDate: "2027-01-02",
                  amount: 2_500_000,
                },
              ],
            },
          ],
        }),
      /chồng lấn/,
    );
    assert.equal(hotelStore.listRateRules("hotel_demo").length, before);
  });

  it("rejects a second base rule and a foreign room", () => {
    const updatedAt = hotelStore.rateRulesUpdatedAt("room_demo");
    assert.throws(
      () =>
        hotelStore.saveRateRules({
          hotelId: "hotel_demo",
          rooms: [
            {
              roomId: "room_demo",
              expectedUpdatedAt: updatedAt,
              rules: [baseRule, { ...baseRule, id: "base-2" }],
            },
          ],
        }),
      /một giá cơ bản/,
    );
    assert.throws(
      () =>
        hotelStore.saveRateRules({
          hotelId: "hotel_demo",
          rooms: [
            { roomId: "room_missing", expectedUpdatedAt: null, rules: [baseRule] },
          ],
        }),
      /Hạng phòng không tồn tại/,
    );
  });

  it("reports a conflict when another editor already saved", () => {
    assert.throws(
      () =>
        hotelStore.saveRateRules({
          hotelId: "hotel_demo",
          rooms: [
            {
              roomId: "room_demo",
              expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
              rules: [baseRule],
            },
          ],
        }),
      /Tải lại/,
    );
  });
});

describe("availability storage", () => {
  it("stores per-night counts and resolves the tightest night", () => {
    hotelStore.saveAvailability({
      hotelId: "hotel_demo",
      entries: [
        { roomId: "room_demo", date: "2026-12-01", rooms: 5 },
        { roomId: "room_demo", date: "2026-12-02", rooms: 2 },
        { roomId: "room_demo", date: "2026-12-03", rooms: 4 },
      ],
    });
    const rows = hotelStore.availabilityByRoom(
      ["room_demo"],
      "2026-12-01",
      "2026-12-03",
    );
    assert.equal(rows.get("room_demo")?.length, 3);
    const result = resolveAvailability(
      "manual_daily",
      (rows.get("room_demo") ?? []).map((row) => ({
        date: row.date,
        rooms: row.rooms,
        closed: row.closed,
        updatedAt: row.updatedAt,
      })),
      "2026-12-01",
      "2026-12-04",
      "2026-11-01",
    );
    assert.equal(result.kind, "available");
    if (result.kind !== "available") return;
    assert.equal(result.rooms, 2);
  });

  it("clears a night and rejects impossible input", () => {
    hotelStore.saveAvailability({
      hotelId: "hotel_demo",
      entries: [{ roomId: "room_demo", date: "2026-12-02", rooms: null }],
    });
    assert.equal(
      hotelStore.availabilityByRoom(["room_demo"], "2026-12-02", "2026-12-02").get("room_demo")
        ?.length ?? 0,
      0,
    );
    assert.throws(
      () =>
        hotelStore.saveAvailability({
          hotelId: "hotel_demo",
          entries: [{ roomId: "room_demo", date: "2026-12-02", rooms: -1 }],
        }),
      /Số phòng/,
    );
    assert.throws(
      () =>
        hotelStore.saveAvailability({
          hotelId: "hotel_demo",
          entries: [{ roomId: "room_demo", date: "02-12-2026", rooms: 3 }],
        }),
      /Ngày không hợp lệ/,
    );
  });
});

describe("tour links", () => {
  const anyTourSlug = () =>
    String(published<{ slug?: string }>("tours", [])[0]?.slug ?? "");

  it("rejects an unknown tour and saves a valid relation", () => {
    assert.throws(
      () =>
        hotelStore.saveTourLinks("hotel_demo", [
          {
            hotelId: "hotel_demo",
            roomId: "",
            tourSlug: "tour-khong-ton-tai",
            relation: "included",
            condition: "",
          },
        ]),
      /Tour liên kết/,
    );
    const slug = anyTourSlug();
    assert.ok(slug, "the seed catalogue must have at least one tour");
    hotelStore.saveTourLinks("hotel_demo", [
      {
        hotelId: "hotel_demo",
        roomId: "",
        tourSlug: slug,
        relation: "additional",
        condition: "Báo giá riêng",
      },
    ]);
    const links = hotelStore.listTourLinks("hotel_demo");
    assert.equal(links.length, 1);
    assert.equal(links[0].relation, "additional");
  });
});

describe("sales plan", () => {
  it("stores the quote and confirmed option encrypted", () => {
    db()
      .prepare(
        "INSERT INTO leads(id,data,created_at,kind,hotel_id) VALUES(?,?,?,?,?)",
      )
      .run("lead-demo", "{}", NOW, "hotel", "hotel_demo");
    hotelStore.saveHotelLeadPlan({
      leadId: "lead-demo",
      quoteAmount: 4_200_000,
      quoteNote: "Đã gọi đối tác",
      confirmedOption: "Deluxe 2 đêm",
      bookingId: null,
    });
    const plan = hotelStore.getHotelLeadPlan("lead-demo");
    assert.equal(plan?.quoteAmount, 4_200_000);
    assert.equal(plan?.quoteNote, "Đã gọi đối tác");
    assert.equal(plan?.confirmedOption, "Deluxe 2 đêm");
    const raw = db()
      .prepare("SELECT quote_note FROM hotel_lead_plans WHERE lead_id=?")
      .get("lead-demo") as { quote_note: string };
    assert.notEqual(raw.quote_note, "Đã gọi đối tác");
  });

  it("rejects an invalid amount or a missing booking", () => {
    assert.throws(
      () =>
        hotelStore.saveHotelLeadPlan({
          leadId: "lead-demo",
          quoteAmount: 0,
          quoteNote: "",
          confirmedOption: "",
          bookingId: null,
        }),
      /Giá báo/,
    );
    assert.throws(
      () =>
        hotelStore.saveHotelLeadPlan({
          leadId: "lead-demo",
          quoteAmount: null,
          quoteNote: "",
          confirmedOption: "",
          bookingId: "booking-missing",
        }),
      /Booking/,
    );
  });
});

describe("public projection", () => {
  it("exposes a card without editorial internals", () => {
    const cards = publicModel.publicHotelCards("vi");
    assert.equal(cards.length, 1);
    const card = cards[0];
    assert.equal(card.slug, "demo-resort");
    assert.equal(card.priceFrom, 1_000_000);
    assert.equal(card.roomsCount, 1);
    const json = JSON.stringify(card);
    assert.equal(json.includes("_en"), false);
    assert.equal(json.includes("contentStatus"), false);
    assert.equal(json.includes("starBasis"), true);
  });

  it("prices the detail rooms and hides drafts", () => {
    const detail = publicModel.publicHotelDetail("demo-resort", "vi");
    assert.ok(detail);
    assert.equal(detail.rooms.length, 1);
    assert.equal(detail.rooms[0].priceFrom, 1_000_000);
    assert.equal(detail.rooms[0].availability.kind, "unknown");
    assert.equal(publicModel.publicHotelDetail("khong-co", "vi"), null);
  });

  it("bumps the public content version when operational data changes", () => {
    const before = contentVersion("public");
    hotelStore.saveAvailability({
      hotelId: "hotel_demo",
      entries: [{ roomId: "room_demo", date: "2026-12-05", rooms: 3 }],
    });
    assert.notEqual(contentVersion("public"), before);
  });
});
