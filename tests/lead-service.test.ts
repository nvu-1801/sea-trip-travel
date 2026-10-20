import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContactLead } from "@/domain/lead";
import { submitLead } from "@/server/leads/service";
import {
  buildLeadNotificationHtml,
  buildLeadNotificationText,
  buildLeadSubject,
} from "@/server/email/templates/lead-notification";

/**
 * End-to-end behaviour of the lead service, plus the safety of the email it
 * produces. Each test uses a distinct user-agent so it gets its own rate-limit
 * bucket and the tests do not interfere with one another.
 */

let agentCounter = 0;
const nextContext = (body: unknown) => ({
  body,
  ip: "203.0.113.10",
  userAgent: `test-agent-${(agentCounter += 1)}`,
});

const validBody = {
  fullName: "Nguyễn Văn A",
  phone: "0987 654 321",
  consent: true,
};

function makeLead(overrides: Partial<ContactLead> = {}): ContactLead {
  return {
    requestId: "STT-20260115-ABCD",
    receivedAt: "2026-01-15T02:00:00.000Z",
    fullName: "Nguyễn Văn A",
    phone: "0987654321",
    email: "khach@example.com",
    locale: "vi",
    ...overrides,
  };
}

describe("submitLead", () => {
  it("accepts a valid request and returns an STT request code", async () => {
    const result = await submitLead(nextContext(validBody));
    assert.equal(result.status, 200);
    assert.equal(result.response.ok, true);
    if (!result.response.ok) return;
    assert.match(result.response.requestId, /^STT-\d{8}-[0-9A-F]{4}$/);
    assert.equal(result.response.status, "accepted");
  });

  it("reports per-field errors without leaking a request id", async () => {
    const result = await submitLead(nextContext({ fullName: "A", phone: "abc", consent: false }));
    assert.equal(result.status, 400);
    assert.equal(result.response.ok, false);
    if (result.response.ok) return;
    assert.equal(result.response.error.code, "VALIDATION_ERROR");
    assert.ok(result.response.error.fieldErrors?.fullName);
    assert.ok(result.response.error.fieldErrors?.phone);
    assert.ok(result.response.error.fieldErrors?.consent);
  });

  it("silently drops a honeypot hit instead of describing the spam rule", async () => {
    const result = await submitLead(
      nextContext({ ...validBody, company: "I am a robot" }),
    );
    assert.equal(result.status, 200);
    assert.equal(result.response.ok, true);
    if (!result.response.ok) return;
    assert.equal(result.response.status, "accepted");
  });

  it("returns the original result for a repeated submission id (no double send)", async () => {
    const submissionId = "submission-dedupe-1";
    // Same client (same user-agent + ip) and same idempotency key.
    const context = nextContext({ ...validBody, submissionId });
    const first = await submitLead(context);
    const second = await submitLead(context);
    assert.equal(first.status, 200);
    assert.deepEqual(second, first);
  });

  it("normalises the phone number before it reaches the email", async () => {
    const result = await submitLead(nextContext({ ...validBody, phone: "+84 987 654 321" }));
    assert.equal(result.status, 200);
  });

  it("ignores a tourSlug that does not exist", async () => {
    const result = await submitLead(
      nextContext({ ...validBody, tourSlug: "khong-ton-tai-dau" }),
    );
    assert.equal(result.status, 200);
  });

  it("rejects an oversized message through schema validation", async () => {
    const result = await submitLead(nextContext({ ...validBody, message: "x".repeat(5000) }));
    assert.equal(result.status, 400);
    assert.equal(result.response.ok, false);
  });

  it("rate limits a burst from the same client", async () => {
    const context = nextContext(validBody);
    const results = [];
    for (let i = 0; i < 8; i += 1) {
      results.push(await submitLead(context));
    }
    // The limiter allows the first few and then refuses.
    assert.ok(results.some((result) => result.status === 200));
    assert.ok(results.some((result) => result.status === 429));
    const limited = results.find((result) => result.status === 429);
    assert.ok(limited && !limited.response.ok);
    if (!limited || limited.response.ok) return;
    assert.equal(limited.response.error.code, "RATE_LIMITED");
    assert.ok((limited.response.error.retryAfterSeconds ?? 0) > 0);
  });
});

describe("lead notification email", () => {
  it("escapes customer HTML so markup cannot be injected", () => {
    const lead = makeLead({
      fullName: `<img src=x onerror=alert(1)>`,
      message: `</div><script>alert("xss")</script>`,
    });
    const html = buildLeadNotificationHtml({ lead });

    // The payload survives only as inert text: every angle bracket is escaped,
    // so no tag the customer wrote can be parsed. (The template legitimately
    // contains its own `<img>` for the logo, so we assert on the payload.)
    assert.ok(!html.includes("<script>"), "raw <script> must never appear");
    assert.ok(!html.includes("<img src=x"), "the injected <img> must not be parsed");
    assert.ok(!html.includes("</div><script"), "the injected close-tag must not be parsed");
    assert.ok(html.includes("&lt;script&gt;"), "the payload should appear escaped");
    assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
    // The template's own tags are of course still present.
    assert.ok(html.includes('<html lang="vi">'));
    assert.ok(html.includes('<img src="'));
  });

  it("never emits a javascript: or off-site href", () => {
    const html = buildLeadNotificationHtml({
      lead: makeLead({ email: "khach@example.com" }),
      sourceUrl: "javascript:alert(1)",
      tourUrl: "https://evil.example/steal",
    });
    assert.ok(!html.includes("javascript:"));
    assert.ok(!html.includes("evil.example"));
  });

  it("keeps the tel: and mailto: actions when the data is valid", () => {
    const html = buildLeadNotificationHtml({ lead: makeLead() });
    assert.ok(html.includes("tel:0987654321"));
    assert.ok(html.includes("mailto:khach%40example.com"));
  });

  it("omits the reply action and says so when there is no email", () => {
    const html = buildLeadNotificationHtml({
      lead: makeLead({ email: undefined }),
    });
    assert.ok(!html.includes("mailto:"));
    assert.match(html, /Khách không để lại email/);
  });

  it("includes the request code and a Vietnam-time timestamp", () => {
    const html = buildLeadNotificationHtml({ lead: makeLead() });
    assert.ok(html.includes("STT-20260115-ABCD"));
    assert.ok(html.includes("(GMT+7)"));
  });

  it("works with images blocked — the brand name is text, not only an image", () => {
    const html = buildLeadNotificationHtml({ lead: makeLead() });
    assert.ok(html.includes('alt="SEA TRIP TRAVEL"'));
    assert.ok(html.includes("SEA TRIP TRAVEL"));
  });

  it("produces a plain-text fallback carrying the same facts", () => {
    const text = buildLeadNotificationText({ lead: makeLead({ message: "Cần tư vấn gấp" }) });
    assert.ok(text.includes("Nguyễn Văn A"));
    assert.ok(text.includes("0987654321"));
    assert.ok(text.includes("STT-20260115-ABCD"));
    assert.ok(text.includes("Cần tư vấn gấp"));
    assert.ok(text.includes("Thông báo tự động nội bộ"));
  });

  it("keeps personal data out of the subject line", () => {
    const subject = buildLeadSubject({
      lead: makeLead({ phone: "0987654321", email: "khach@example.com" }),
      tourTitle: "Quy Nhơn – Kỳ Co – Eo Gió 1 ngày",
    });
    assert.ok(subject.startsWith("[SEA TRIP] Yêu cầu tư vấn mới"));
    assert.ok(subject.includes("STT-20260115-ABCD"));
    assert.ok(!subject.includes("0987654321"));
    assert.ok(!subject.includes("khach@example.com"));
    assert.ok(!subject.includes("Nguyễn"));
  });

  it("tells sales which language the customer used, and never translates their words", () => {
    const english = buildLeadNotificationText({
      lead: makeLead({ locale: "en", message: "We are a family of four" }),
    });
    assert.ok(english.includes("Ngôn ngữ khách sử dụng: English"));
    // The customer's own words are passed through verbatim.
    assert.ok(english.includes("We are a family of four"));

    const vietnamese = buildLeadNotificationText({ lead: makeLead({ locale: "vi" }) });
    assert.ok(vietnamese.includes("Ngôn ngữ khách sử dụng: Tiếng Việt"));

    const html = buildLeadNotificationHtml({ lead: makeLead({ locale: "en" }) });
    assert.ok(html.includes("Ngôn ngữ khách sử dụng"));
  });

  it("flags an upcoming travel date as urgent, and stays quiet otherwise", () => {
    const soon = buildLeadNotificationHtml({
      lead: makeLead({ travelDate: "2026-01-20", partySize: 4 }),
    });
    assert.ok(soon.includes("Khởi hành sắp tới"));
    assert.ok(soon.includes("Ngày dự kiến"));
    assert.ok(soon.includes("Số người"));

    const far = buildLeadNotificationHtml({
      lead: makeLead({ travelDate: "2026-06-01" }),
    });
    assert.ok(!far.includes("Khởi hành sắp tới"));

    const none = buildLeadNotificationHtml({ lead: makeLead() });
    assert.ok(!none.includes("Khởi hành sắp tới"));

    const text = buildLeadNotificationText({
      lead: makeLead({ travelDate: "2026-01-20" }),
    });
    assert.ok(text.includes("ƯU TIÊN"));
  });

  it("highlights English requests so sales replies in English", () => {
    const english = buildLeadNotificationHtml({ lead: makeLead({ locale: "en" }) });
    assert.ok(english.includes("English request"));

    const vietnamese = buildLeadNotificationHtml({ lead: makeLead({ locale: "vi" }) });
    assert.ok(!vietnamese.includes("English request"));
  });

  it("adds the travel day to the subject and links to the Studio", () => {
    const withDate = buildLeadSubject({
      lead: makeLead({ travelDate: "2026-01-20" }),
    });
    assert.ok(withDate.startsWith("[SEA TRIP] Yêu cầu tư vấn mới"));
    assert.ok(withDate.includes("KH 20/01"));

    const withoutDate = buildLeadSubject({ lead: makeLead() });
    assert.ok(!withoutDate.includes("KH "));

    const html = buildLeadNotificationHtml({ lead: makeLead() });
    assert.ok(html.includes("/admin"));
  });
});
