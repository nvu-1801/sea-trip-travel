import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leadInputSchema, normalizePhone } from "@/domain/lead";

const base = {
  fullName: "Nguyễn Văn A",
  phone: "0987 654 321",
  consent: true as const,
};

describe("leadInputSchema", () => {
  it("accepts the minimum viable request (name, phone, consent)", () => {
    const result = leadInputSchema.safeParse(base);
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.email, undefined);
    assert.equal(result.data.message, undefined);
    // The honeypot defaults to an empty string rather than undefined.
    assert.equal(result.data.company, "");
  });

  it("requires a name of at least two characters", () => {
    const result = leadInputSchema.safeParse({ ...base, fullName: "A" });
    assert.equal(result.success, false);
    if (result.success) return;
    assert.ok(result.error.issues.some((issue) => issue.path[0] === "fullName"));
  });

  it("rejects a phone number that is not a phone number", () => {
    const result = leadInputSchema.safeParse({ ...base, phone: "gọi cho tôi" });
    assert.equal(result.success, false);
    if (result.success) return;
    assert.ok(result.error.issues.some((issue) => issue.path[0] === "phone"));
  });

  it("requires explicit consent and returns a Vietnamese message", () => {
    const result = leadInputSchema.safeParse({ ...base, consent: false });
    assert.equal(result.success, false);
    if (result.success) return;
    const issue = result.error.issues.find((candidate) => candidate.path[0] === "consent");
    assert.ok(issue);
    assert.match(issue.message, /chính sách/i);
  });

  it("treats empty optional strings as 'not provided'", () => {
    const result = leadInputSchema.safeParse({
      ...base,
      email: "",
      interest: "",
      message: "   ",
      travelDate: "",
      partySize: "",
    });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.email, undefined);
    assert.equal(result.data.interest, undefined);
    assert.equal(result.data.message, undefined);
    assert.equal(result.data.travelDate, undefined);
    assert.equal(result.data.partySize, undefined);
  });

  it("coerces partySize from a form string", () => {
    const result = leadInputSchema.safeParse({ ...base, partySize: "4" });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.partySize, 4);
  });

  it("rejects an out-of-range partySize", () => {
    assert.equal(leadInputSchema.safeParse({ ...base, partySize: "0" }).success, false);
    assert.equal(leadInputSchema.safeParse({ ...base, partySize: "200" }).success, false);
  });

  it("rejects a malformed email but allows its absence", () => {
    assert.equal(leadInputSchema.safeParse({ ...base, email: "nope" }).success, false);
    assert.equal(leadInputSchema.safeParse({ ...base, email: "a@b.co" }).success, true);
  });

  it("rejects a non-ISO travelDate", () => {
    assert.equal(leadInputSchema.safeParse({ ...base, travelDate: "01/12/2026" }).success, false);
    assert.equal(leadInputSchema.safeParse({ ...base, travelDate: "2026-12-01" }).success, true);
  });

  it("rejects a filled honeypot", () => {
    const result = leadInputSchema.safeParse({ ...base, company: "acme" });
    assert.equal(result.success, false);
    if (result.success) return;
    assert.ok(result.error.issues.some((issue) => issue.path[0] === "company"));
  });

  it("caps free-text length", () => {
    assert.equal(
      leadInputSchema.safeParse({ ...base, message: "x".repeat(2001) }).success,
      false,
    );
  });

  it("only accepts whitelisted UTM keys with a length cap", () => {
    const result = leadInputSchema.safeParse({
      ...base,
      utm: { source: "facebook", medium: "cpc", campaign: "quynhon" },
    });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.deepEqual(result.data.utm, {
      source: "facebook",
      medium: "cpc",
      campaign: "quynhon",
    });
    assert.equal(
      leadInputSchema.safeParse({ ...base, utm: { source: "x".repeat(200) } }).success,
      false,
    );
  });
});

describe("normalizePhone", () => {
  it("canonicalises Vietnamese numbers to a leading zero", () => {
    assert.equal(normalizePhone("0987 654 321"), "0987654321");
    assert.equal(normalizePhone("0987.654.321"), "0987654321");
    assert.equal(normalizePhone("+84 987 654 321"), "0987654321");
    assert.equal(normalizePhone("84987654321"), "0987654321");
  });
});
