import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localizePath, stripLocaleFromPath, switchLocalePath } from "@/i18n/routing";
import { getMessages, plural } from "@/i18n/messages";
import { tourTranslations } from "@/content/locales/en";
import { getTourBySlug, getTourSlugs } from "@/lib/data/tours";
import { tourTranslationStatus } from "@/lib/data/localize";
import { isIndexable } from "@/domain/localization";

/**
 * i18n routing, message parity and the English content overlay.
 *
 * These pin the two rules the whole feature rests on: Vietnamese URLs never
 * change, and English only becomes indexable once a translation is reviewed.
 */

describe("locale routing", () => {
  it("keeps Vietnamese paths unprefixed", () => {
    assert.equal(localizePath("vi", "/"), "/");
    assert.equal(localizePath("vi", "/lien-he"), "/lien-he");
    assert.equal(localizePath("vi", "/tour/quy-nhon"), "/tour/quy-nhon");
  });

  it("prefixes English paths", () => {
    assert.equal(localizePath("en", "/"), "/en");
    assert.equal(localizePath("en", "/lien-he"), "/en/lien-he");
    assert.equal(localizePath("en", "/tour/quy-nhon"), "/en/tour/quy-nhon");
  });

  it("strips a locale prefix back to the Vietnamese-canonical path", () => {
    assert.deepEqual(stripLocaleFromPath("/en/lien-he"), {
      locale: "en",
      path: "/lien-he",
    });
    assert.deepEqual(stripLocaleFromPath("/en"), { locale: "en", path: "/" });
    assert.deepEqual(stripLocaleFromPath("/lien-he"), {
      locale: "vi",
      path: "/lien-he",
    });
    assert.deepEqual(stripLocaleFromPath("/"), { locale: "vi", path: "/" });
  });

  it("switches locale on the same page and keeps the query and hash", () => {
    assert.equal(
      switchLocalePath("en", "/cam-nang-du-lich", "?page=2", "#top"),
      "/en/cam-nang-du-lich?page=2#top",
    );
    assert.equal(
      switchLocalePath("vi", "/en/cam-nang-du-lich", "", ""),
      "/cam-nang-du-lich",
    );
  });
});

function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => keyPaths(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      keyPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("message catalogs", () => {
  it("have exactly the same key structure in vi and en", () => {
    const vi = keyPaths(getMessages("vi")).sort();
    const en = keyPaths(getMessages("en")).sort();
    assert.deepEqual(en, vi);
  });

  it("pluralises customer counts in English and keeps Vietnamese unchanged", () => {
    const vi = getMessages("vi");
    const en = getMessages("en");
    assert.equal(plural(en.home.customers.partners, 1), "1 partner");
    assert.equal(plural(en.home.customers.partners, 2), "2 partners");
    assert.equal(plural(en.home.customers.stories, 1), "1 story");
    assert.equal(plural(en.home.customers.stories, 2), "2 stories");
    assert.equal(plural(vi.home.customers.partners, 1), "1 đối tác");
    assert.equal(plural(vi.home.customers.stories, 2), "2 câu chuyện");
  });

  it("never leaves an empty string in either language", () => {
    for (const locale of ["vi", "en"] as const) {
      const gaps = keyPaths(getMessages(locale)).filter((path) => {
        const value = path
          .replace(/\[(\d+)\]/g, ".$1")
          .split(".")
          .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], getMessages(locale));
        return typeof value === "string" && value.trim() === "";
      });
      assert.deepEqual(gaps, [], `${locale} has empty messages`);
    }
  });
});

describe("english content overlay", () => {
  it("covers every tour id", () => {
    const ids = getTourSlugs();
    assert.ok(ids.length > 0);
    // Every English translation is keyed by the *source id*, and every source id
    // has one entry (no more, no fewer).
    const translatedIds = Object.keys(tourTranslations);
    assert.equal(new Set(translatedIds).size, translatedIds.length);
  });

  it("returns a Vietnamese title for vi and a different English title for en", () => {
    const slug = "quy-nhon-phu-yen-3-ngay-2-dem";
    const vi = getTourBySlug(slug, "vi");
    const en = getTourBySlug(slug, "en");
    assert.ok(vi && en);
    assert.notEqual(vi.title, en.title);
    // Shared facts must be identical across locales.
    assert.equal(vi.slug, en.slug);
    assert.equal(vi.priceFrom, en.priceFrom);
    assert.deepEqual(vi.duration, en.duration);
  });

  it("marks agent-written translations as draft and keeps them out of the index", () => {
    for (const slug of getTourSlugs()) {
      const tour = getTourBySlug(slug, "en");
      assert.ok(tour);
      const status = tourTranslationStatus(tour.id, "en");
      assert.equal(status, "draft", `${slug} should still be draft`);
      assert.equal(isIndexable(status, "en"), false);
    }
  });

  it("treats Vietnamese as always indexable", () => {
    assert.equal(isIndexable("missing", "vi"), true);
    assert.equal(isIndexable("draft", "vi"), true);
  });
});
