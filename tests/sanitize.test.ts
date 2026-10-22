import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containsHtmlMarkup,
  escapeHtml,
  isSafeSiteHref,
  safeMailtoHref,
  safeSiteUrl,
  safeTelHref,
} from "@/lib/sanitize";
import { siteConfig } from "@/config/site";

const origin = siteConfig.url.replace(/\/+$/, "");

/**
 * Output-safety tests.
 *
 * These cover the highest-risk surface in the app: customer-supplied strings
 * that end up inside an HTML email, and customer-supplied paths that end up
 * inside an `href`.
 */

describe("escapeHtml", () => {
  it("neutralises every character that can break out of markup", () => {
    assert.equal(
      escapeHtml(`<script>alert("x")</script> & 'y'`),
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;",
    );
  });

  it("neutralises a closing script tag inside an attribute", () => {
    const result = escapeHtml(`"><img src=x onerror=alert(1)>`);
    assert.ok(!result.includes("<"));
    assert.ok(!result.includes(">"));
    assert.ok(!result.includes('"'));
  });

  it("escapes ampersands once, not twice", () => {
    assert.equal(escapeHtml("a & b"), "a &amp; b");
  });

  it("leaves Vietnamese text untouched", () => {
    const text = "Quy Nhơn – Phú Yên, Kỳ Co & Eo Gió";
    assert.equal(escapeHtml(text), "Quy Nhơn – Phú Yên, Kỳ Co &amp; Eo Gió");
  });
});

describe("safeTelHref", () => {
  it("accepts Vietnamese formats and strips separators", () => {
    assert.equal(safeTelHref("0987 654 321"), "tel:0987654321");
    assert.equal(safeTelHref("0987.654.321"), "tel:0987654321");
    assert.equal(safeTelHref("+84 987 654 321"), "tel:+84987654321");
  });

  it("rejects anything that could smuggle a scheme", () => {
    assert.equal(safeTelHref("javascript:alert(1)"), null);
    assert.equal(safeTelHref("data:text/html,<script>"), null);
    assert.equal(safeTelHref(""), null);
    assert.equal(safeTelHref("123"), null);
  });
});

describe("safeMailtoHref", () => {
  it("accepts a well-formed address", () => {
    assert.equal(safeMailtoHref("khach@example.com"), "mailto:khach%40example.com");
  });

  it("rejects malformed addresses and header-injection attempts", () => {
    assert.equal(safeMailtoHref("a@b"), null);
    assert.equal(safeMailtoHref("a@b.co\r\nBcc: victim@example.com"), null);
    assert.equal(safeMailtoHref("a@b.co?subject=x"), null);
    assert.equal(safeMailtoHref(undefined), null);
    assert.equal(safeMailtoHref(""), null);
  });
});

describe("safeSiteUrl", () => {
  it("resolves a site-relative path to an absolute same-origin URL", () => {
    assert.equal(
      safeSiteUrl("/tour/quy-nhon-3-ngay"),
      `${origin}/tour/quy-nhon-3-ngay`,
    );
  });

  it("rejects protocol-relative and absolute off-site URLs", () => {
    assert.equal(safeSiteUrl("//evil.example/phish"), null);
    assert.equal(safeSiteUrl("https://evil.example/phish"), null);
    assert.equal(safeSiteUrl("http://evil.example"), null);
  });

  it("rejects non-http schemes", () => {
    assert.equal(safeSiteUrl("javascript://evil.example/x"), null);
    assert.equal(safeSiteUrl("data:text/html,x"), null);
  });

  it("rejects malformed paths", () => {
    assert.equal(safeSiteUrl(""), null);
    assert.equal(safeSiteUrl(undefined), null);
    assert.equal(safeSiteUrl("/tour/back\\slash"), null);
    assert.equal(safeSiteUrl("/tour/with space"), null);
  });
});

describe("isSafeSiteHref", () => {
  it("accepts absolute same-origin URLs", () => {
    assert.equal(isSafeSiteHref(`${origin}/tour/x`), true);
  });

  it("rejects off-origin and non-http values", () => {
    assert.equal(isSafeSiteHref("https://evil.example/"), false);
    assert.equal(isSafeSiteHref("javascript:alert(1)"), false);
    assert.equal(isSafeSiteHref("not a url"), false);
    assert.equal(isSafeSiteHref("/relative/path"), false);
  });
});

describe("containsHtmlMarkup", () => {
  it("detects angle brackets", () => {
    assert.equal(containsHtmlMarkup("<b>hi</b>"), true);
    assert.equal(containsHtmlMarkup("Quy Nhơn bình yên"), false);
  });
});
