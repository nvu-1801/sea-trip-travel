import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGmailComposeUrl,
  buildLeadGmailComposeHref,
  buildLeadReplyDraft,
} from "@/lib/gmail-compose";

/**
 * Gmail compose links.
 *
 * The admin "Trả lời bằng Gmail" button and the sales notification email share
 * this builder, so these tests cover the contract both channels rely on:
 * correct recipient, encoded Vietnamese/reserved characters, and no link when
 * the customer address is missing or malformed.
 */

describe("buildGmailComposeUrl", () => {
  it("opens Gmail compose with the customer as recipient", () => {
    const href = buildGmailComposeUrl({
      to: "khach@example.com",
      subject: "Sea Trip Travel – Tư vấn chuyến đi",
      body: "Chào anh/chị,",
    });
    assert.ok(href);
    const url = new URL(href);
    assert.equal(url.origin, "https://mail.google.com");
    assert.equal(url.pathname, "/mail/");
    assert.equal(url.searchParams.get("view"), "cm");
    assert.equal(url.searchParams.get("fs"), "1");
    assert.equal(url.searchParams.get("to"), "khach@example.com");
    assert.equal(url.searchParams.get("su"), "Sea Trip Travel – Tư vấn chuyến đi");
    assert.equal(url.searchParams.get("body"), "Chào anh/chị,");
  });

  it("percent-encodes Vietnamese, newlines and reserved characters", () => {
    const subject = "Sea Trip – Tư vấn Quy Nhơn & Phú Yên? #1";
    const body = "Chào anh/chị,\nCảm ơn & hẹn gặp.";
    const href = buildGmailComposeUrl({
      to: "khach+booking@example.com",
      subject,
      body,
    });
    assert.ok(href);

    const rawQuery = href.slice(href.indexOf("?") + 1);
    assert.ok(!rawQuery.includes("+"), "spaces must be %20, not +");
    assert.ok(rawQuery.includes("%2B"), "+ in the address must be encoded");
    assert.ok(rawQuery.includes("%26"), "& must be encoded");
    assert.ok(rawQuery.includes("%3F"), "? must be encoded");
    assert.ok(rawQuery.includes("%23"), "# must be encoded");
    assert.ok(rawQuery.includes("%0A"), "newlines must be encoded");
    assert.ok(rawQuery.includes("%C6%B0"), "Vietnamese ư must be UTF-8 encoded");
    // view, fs, to, su, body — a raw & inside a value would add parameters.
    assert.equal(rawQuery.split("&").length, 5);

    const params = new URL(href).searchParams;
    assert.equal(params.get("to"), "khach+booking@example.com");
    assert.equal(params.get("su"), subject);
    assert.equal(params.get("body"), body);
  });

  it("refuses missing, malformed and header-injection addresses", () => {
    for (const to of [
      "",
      "   ",
      "khach",
      "a@b",
      "a@b.co?subject=spam",
      "a@b.co\r\nBcc: victim@example.com",
      "javascript:alert(1)",
    ]) {
      assert.equal(
        buildGmailComposeUrl({ to, subject: "x", body: "y" }),
        null,
        `expected no link for ${JSON.stringify(to)}`,
      );
    }
  });
});

describe("buildLeadReplyDraft", () => {
  it("uses the tour title in the subject and greets the customer by name", () => {
    const draft = buildLeadReplyDraft({
      fullName: "Nguyễn Văn A",
      tourTitle: "Quy Nhơn – Kỳ Co – Eo Gió 1 ngày",
    });
    assert.equal(
      draft.subject,
      "Sea Trip Travel – Tư vấn Quy Nhơn – Kỳ Co – Eo Gió 1 ngày",
    );
    assert.ok(draft.body.startsWith("Chào Nguyễn Văn A,"));
    assert.ok(draft.body.includes("Quy Nhơn – Kỳ Co – Eo Gió 1 ngày"));
    assert.ok(draft.body.includes("Trân trọng,"));
  });

  it("falls back to a generic subject and greeting when data is missing", () => {
    const draft = buildLeadReplyDraft({});
    assert.equal(draft.subject, "Sea Trip Travel – Tư vấn chuyến đi");
    assert.ok(draft.body.startsWith("Chào anh/chị,"));
    assert.ok(draft.body.includes("yêu cầu tư vấn của anh/chị"));
  });

  it("collapses line breaks so the subject stays a single line", () => {
    const draft = buildLeadReplyDraft({
      fullName: "Trần\nThị B",
      tourTitle: "Quy Nhơn\nPhú Yên",
    });
    assert.equal(draft.subject, "Sea Trip Travel – Tư vấn Quy Nhơn Phú Yên");
    assert.ok(draft.body.startsWith("Chào Trần Thị B,"));
    assert.ok(!draft.subject.includes("\n"));
  });

  it("never puts internal notes or request ids into the draft", () => {
    const input = {
      email: "khach@example.com",
      fullName: "Nguyễn Văn A",
      tourTitle: "Quy Nhơn 3 ngày",
      note: "Ghi chú nội bộ: khách khó tính",
      requestId: "STT-20260115-ABCD",
    };
    const href = buildLeadGmailComposeHref(input);
    assert.ok(href);
    assert.ok(!href.includes("Ghi%20ch%C3%BA"), "internal note must not leak");
    assert.ok(!href.includes("STT-20260115-ABCD"), "request id is not needed");
    assert.ok(!href.includes("kh%C3%B3"), "internal note must not leak");
  });

  it("returns no link when the customer has no usable email", () => {
    assert.equal(
      buildLeadGmailComposeHref({ email: undefined, fullName: "A" }),
      null,
    );
    assert.equal(
      buildLeadGmailComposeHref({ email: "not-an-email", fullName: "A" }),
      null,
    );
  });
});
