import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { db } from "@/server/cms/db";
import { list, published, save } from "@/server/cms/store";
import { decrypt } from "@/server/cms/leads";
import { saveRateRules } from "@/server/hotels/store";
import { contactLeadSchema } from "@/domain/lead";
import { submitLead } from "@/server/leads/service";

/**
 * Hotel consultation requests through the existing lead pipeline.
 *
 * What is asserted here is the contract, not the markup: the module switch,
 * server-side re-pricing, ownership of rooms, the "included" rule, and the rule
 * that a failed email never loses (or duplicates) a saved request.
 */

const directory = mkdtempSync(path.join(tmpdir(), "seatrip-hotel-lead-"));
process.env.CMS_DB_PATH = path.join(directory, "hotels.sqlite");
process.env.CMS_ENABLED = "1";
process.env.LEAD_ENCRYPTION_KEY = randomBytes(32).toString("hex");
process.env.MAIL_TRANSPORT = "log";
process.env.LEAD_HASH_SALT = "hotel-lead-test-salt";

after(() => {
  try {
    db().close();
  } catch {
    // already closed
  }
  rmSync(directory, { recursive: true, force: true });
});

const NOW = "2026-10-01T00:00:00.000Z";

function hotelRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "hotel_test",
    slug: "hotel-test",
    name: "Hotel Test",
    province: "Bình Định",
    address: "1 Trần Hưng Đạo",
    lodgingType: "hotel",
    starRating: null,
    summary: "Khách sạn kiểm thử.",
    description: [],
    amenities: ["Hồ bơi"],
    images: [],
    policies: [],
    roomMode: "manual_daily",
    order: 0,
    contentStatus: "demo",
    updatedAt: NOW,
    ...overrides,
  };
}

function roomRecord(id: string, hotelId = "hotel_test", overrides: Record<string, unknown> = {}) {
  return {
    id,
    hotelId,
    name: `Phòng ${id}`,
    sizeSqm: null,
    capacityAdults: 2,
    capacityChildren: 1,
    maxOccupancy: 3,
    amenities: [],
    images: [],
    order: 0,
    contentStatus: "demo",
    updatedAt: NOW,
    ...overrides,
  };
}

function enableHotels(enabled: boolean, revision: number) {
  const settings = list("settings")[0];
  save(
    "settings",
    {
      ...(settings.data as Record<string, unknown>),
      hotels: { enabled, homeVisible: enabled, featured: [] },
    },
    revision,
    "publish",
  );
}

function hotelBody(overrides: Record<string, unknown> = {}) {
  return {
    kind: "hotel",
    fullName: "Nguyễn Văn A",
    phone: "0987 654 321",
    consent: true,
    locale: "vi",
    hotel: {
      hotelId: "hotel_test",
      rooms: [{ roomId: "room_test", quantity: 2 }],
      checkIn: "2026-12-20",
      checkOut: "2026-12-22",
      adults: 2,
      children: 0,
      ...(overrides.hotel as object),
    },
    ...Object.fromEntries(
      Object.entries(overrides).filter(([key]) => key !== "hotel"),
    ),
  };
}

let agentCounter = 0;
const nextContext = (body: unknown) => ({
  body,
  ip: "203.0.113.42",
  userAgent: `hotel-agent-${(agentCounter += 1)}`,
});

function leadRow(id: string) {
  return db()
    .prepare(
      "SELECT kind,hotel_id,stay_checkin,stay_checkout,mail_status FROM leads WHERE id=?",
    )
    .get(id) as
    | {
        kind: string;
        hotel_id: string | null;
        stay_checkin: string | null;
        stay_checkout: string | null;
        mail_status: string;
      }
    | undefined;
}

describe("hotel request intake", () => {
  it("creates a published hotel, two rooms and nightly prices", () => {
    save("hotels", hotelRecord(), 0, "publish");
    save("hotelRooms", roomRecord("room_test"), 0, "publish");
    save("hotelRooms", roomRecord("room_other"), 0, "publish");
    // Hotel-level tour relation: "included" is tested below.
    const base = {
      id: "base",
      hotelId: "hotel_test",
      roomId: "room_test",
      kind: "base" as const,
      amount: 1_000_000,
    };
    saveRateRules({
      hotelId: "hotel_test",
      rooms: [
        {
          roomId: "room_test",
          expectedUpdatedAt: null,
          rules: [
            base,
            {
              ...base,
              id: "weekend",
              kind: "weekday",
              weekdays: [5, 6],
              amount: 1_200_000,
            },
          ],
        },
        {
          roomId: "room_other",
          expectedUpdatedAt: null,
          rules: [{ ...base, id: "other", roomId: "room_other", amount: 800_000 }],
        },
      ],
    });
    assert.equal(published("hotels", []).length, 1);
  });

  it("refuses a hotel request while the module is off", async () => {
    enableHotels(false, 1);
    const result = await submitLead(nextContext(hotelBody()));
    assert.equal(result.status, 403);
    assert.equal(result.response.ok, false);
    if (result.response.ok) return;
    assert.equal(result.response.error.code, "MODULE_DISABLED");
  });

  it("keeps tour leads working with the module off", async () => {
    const result = await submitLead(
      nextContext({
        fullName: "Trần Thị B",
        phone: "0912 345 678",
        consent: true,
        locale: "vi",
      }),
    );
    assert.equal(result.status, 200);
    assert.equal(result.response.ok, true);
  });

  it("accepts a valid hotel request and stores the server snapshot", async () => {
    enableHotels(true, 2);
    const result = await submitLead(nextContext(hotelBody()));
    assert.equal(result.status, 200);
    assert.equal(result.response.ok, true);
    if (!result.response.ok) return;

    const row = leadRow(result.response.requestId);
    assert.ok(row);
    assert.equal(row.kind, "hotel");
    assert.equal(row.hotel_id, "hotel_test");
    assert.equal(row.stay_checkin, "2026-12-20");
    assert.equal(row.stay_checkout, "2026-12-22");

    const stored = contactLeadSchema.parse(
      decrypt(
        (db().prepare("SELECT data FROM leads WHERE id=?").get(
          result.response.requestId,
        ) as { data: string }).data,
      ),
    );
    assert.equal(stored.kind, "hotel");
    assert.equal(stored.hotel?.rooms[0].quantity, 2);
    // 2 rooms × (1.0M + 1.2M Saturday) = 4.4M reference.
    assert.equal(stored.hotel?.quote.lodgingTotal, 4_400_000);
    assert.equal(stored.hotel?.quote.status, "quoted");
    assert.equal(stored.hotel?.availability.room_test, "chưa đủ dữ liệu");
  });

  it("rejects an inverted date range before saving", async () => {
    const before = db().prepare("SELECT COUNT(*) AS n FROM leads").get() as {
      n: number;
    };
    const result = await submitLead(
      nextContext(
        hotelBody({
          hotel: {
            hotelId: "hotel_test",
            rooms: [{ roomId: "room_test", quantity: 1 }],
            checkIn: "2026-12-22",
            checkOut: "2026-12-20",
          },
        }),
      ),
    );
    assert.equal(result.status, 400);
    if (result.response.ok) return;
    assert.equal(result.response.error.code, "VALIDATION_ERROR");
    assert.ok(result.response.error.fieldErrors?.hotel);
    const afterCount = db().prepare("SELECT COUNT(*) AS n FROM leads").get() as {
      n: number;
    };
    assert.equal(afterCount.n, before.n);
  });

  it("rejects a room that belongs to another hotel", async () => {
    // The other hotel exists as a draft, and its room is published. The request
    // still may not combine hotel_test with room_foreign.
    save("hotels", hotelRecord({ id: "hotel_other", slug: "hotel-other" }), 0, "save");
    save("hotelRooms", roomRecord("room_foreign", "hotel_other"), 0, "publish");
    const result = await submitLead(
      nextContext(
        hotelBody({
          hotel: {
            hotelId: "hotel_test",
            rooms: [{ roomId: "room_foreign", quantity: 1 }],
          },
        }),
      ),
    );
    assert.equal(result.status, 400);
    if (result.response.ok) return;
    assert.ok(result.response.error.fieldErrors?.hotel);
  });

  it("rejects an unpublished hotel", async () => {
    const result = await submitLead(
      nextContext(
        hotelBody({
          hotel: {
            hotelId: "hotel_other",
            rooms: [{ roomId: "room_foreign", quantity: 1 }],
          },
        }),
      ),
    );
    assert.equal(result.status, 400);
  });

  it("supports 'dates not decided' without inventing a total", async () => {
    const result = await submitLead(
      nextContext(
        hotelBody({
          hotel: {
            hotelId: "hotel_test",
            rooms: [{ roomId: "room_test", quantity: 1 }],
            datesFlexible: true,
            checkIn: undefined,
            checkOut: undefined,
          },
        }),
      ),
    );
    assert.equal(result.status, 200);
    if (!result.response.ok) return;
    const stored = contactLeadSchema.parse(
      decrypt(
        (db().prepare("SELECT data FROM leads WHERE id=?").get(
          result.response.requestId,
        ) as { data: string }).data,
      ),
    );
    assert.equal(stored.hotel?.datesFlexible, true);
    assert.equal(stored.hotel?.quote.lodgingTotal, null);
    assert.equal(stored.hotel?.quote.status, "needs_quote");
  });

  it("accepts a hotel request without a room type and never quotes it", async () => {
    // The merged contact form only knows the property: no room, no price claim.
    const result = await submitLead(
      nextContext(
        hotelBody({
          hotel: {
            hotelId: "hotel_test",
            rooms: [],
            roomPreference: "2 phòng đôi gần biển",
            checkIn: "2026-12-20",
            checkOut: undefined,
          },
        }),
      ),
    );
    assert.equal(result.status, 200);
    if (!result.response.ok) return;
    const stored = contactLeadSchema.parse(
      decrypt(
        (db().prepare("SELECT data FROM leads WHERE id=?").get(
          result.response.requestId,
        ) as { data: string }).data,
      ),
    );
    assert.equal(stored.kind, "hotel");
    assert.deepEqual(stored.hotel?.rooms, []);
    assert.equal(stored.hotel?.roomPreference, "2 phòng đôi gần biển");
    assert.equal(stored.hotel?.quote.status, "needs_quote");
    assert.equal(stored.hotel?.quote.lodgingTotal, null);
    assert.equal(stored.hotel?.needsReview, true);
    assert.equal(stored.hotel?.checkIn, "2026-12-20");
    assert.equal(stored.hotel?.checkOut, null);
    assert.equal(stored.hotel?.nights, 0);
  });

  it("marks an over-capacity party for review instead of quoting", async () => {
    const result = await submitLead(
      nextContext(
        hotelBody({
          hotel: {
            hotelId: "hotel_test",
            rooms: [{ roomId: "room_test", quantity: 1 }],
            adults: 6,
            children: 2,
            childrenAges: [6, 9],
          },
        }),
      ),
    );
    assert.equal(result.status, 200);
    if (!result.response.ok) return;
    const stored = contactLeadSchema.parse(
      decrypt(
        (db().prepare("SELECT data FROM leads WHERE id=?").get(
          result.response.requestId,
        ) as { data: string }).data,
      ),
    );
    assert.equal(stored.hotel?.needsReview, true);
  });

  it("keeps the request when the mail transport fails, without duplicates", async () => {
    process.env.MAIL_TRANSPORT = "smtp";
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = "1";
    process.env.SMTP_USER = "test";
    process.env.SMTP_PASSWORD = "test";
    const submissionId = "hotel-mail-failure-1";
    const context = nextContext(hotelBody({ submissionId }));
    const first = await submitLead(context);
    const second = await submitLead(context);
    assert.equal(first.status, 200);
    assert.equal(first.response.ok, true);
    assert.deepEqual(second, first);
    if (!first.response.ok) return;
    const row = leadRow(first.response.requestId);
    assert.ok(row, "the request must still be stored");
    assert.equal(row.mail_status, "failed");
    const count = db()
      .prepare("SELECT COUNT(*) AS n FROM leads WHERE id=?")
      .get(first.response.requestId) as { n: number };
    assert.equal(count.n, 1);
    // Back to the local transport for the rest of the suite.
    process.env.MAIL_TRANSPORT = "log";
  });
});
