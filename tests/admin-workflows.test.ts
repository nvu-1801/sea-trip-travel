import assert from "node:assert/strict";
import { describe, it } from "node:test";
import "./helpers";
import sharp from "sharp";
import { importContent } from "@/server/db/import-content";
import {
  countTrashedTours,
  getTourRecordById,
  listPublishedTours,
  listTrashedTours,
  restoreTour,
  setTourFlags,
  setTourStatus,
  softDeleteTour,
} from "@/server/repo/tours";
import { countTrashedLeads, getLead, insertLead, listTrashedLeads, restoreLead, softDeleteLead } from "@/server/repo/leads";
import { countTrashedMedia, findMediaByUrl, getMedia, softDeleteMedia } from "@/server/repo/media";
import { processUpload } from "@/server/media/service";
import { adminArticlePayloadSchema, adminTourPayloadSchema } from "@/domain/admin";
import { saveSettingSection } from "@/server/repo/settings";
import { loadPublishedSnapshot } from "@/lib/data/snapshot";
import { getSiteSettings } from "@/lib/data/settings";

/**
 * Admin workflows that span more than one layer.
 *
 * These pin the behaviours that are easy to regress and expensive to get wrong:
 * re-importing must not undo editorial decisions, deletes must be recoverable,
 * and a repeated upload of a trashed file must bring it back.
 */

describe("re-import preserves editorial state", () => {
  it("keeps publish state, pin and order for existing records", () => {
    const published = listPublishedTours();
    assert.ok(published.length > 1, "expected the seed import to have run");
    // Mutate the last record so the "untouched" assertion below looks at a
    // different tour.
    const target = published[published.length - 1];
    const before = getTourRecordById(target.id)!;

    setTourStatus(target.id, "hidden");
    setTourFlags(target.id, { featured: true, sortOrder: 4242 });

    importContent();

    const after = getTourRecordById(target.id);
    assert.ok(after);
    assert.equal(after!.status, "hidden", "status must survive a re-import");
    assert.equal(after!.featured, true, "pin must survive a re-import");
    assert.equal(after!.sortOrder, 4242, "order must survive a re-import");

    // An untouched record keeps the import defaults.
    const fresh = getTourRecordById(published[0].id);
    assert.ok(fresh);
    assert.equal(fresh!.status, "published");

    setTourStatus(target.id, "published");
    setTourFlags(target.id, { featured: before.featured, sortOrder: before.sortOrder });
  });

  it("does not resurrect a trashed record", () => {
    const target = listPublishedTours()[0];
    softDeleteTour(target.id);

    importContent();

    const after = getTourRecordById(target.id);
    assert.ok(after!.deletedAt, "re-import must not restore a trashed tour");
    assert.equal(listTrashedTours().some((record) => record.tour.id === target.id), true);
    assert.ok(countTrashedTours() >= 1);

    restoreTour(target.id);
    assert.equal(getTourRecordById(target.id)?.deletedAt, null);
  });
});

describe("lead soft delete", () => {
  const requestId = `STT-TRASH-${Date.now().toString().slice(-6)}`;

  it("moves a lead to the trash and back", () => {
    insertLead({
      requestId,
      receivedAt: new Date().toISOString(),
      fullName: "Khách Thùng Rác",
      phone: "0987654321",
      locale: "vi",
    });
    assert.ok(getLead(requestId));

    softDeleteLead(requestId);
    assert.equal(getLead(requestId)?.requestId, requestId, "the row is still there");
    assert.equal(listTrashedLeads().some((lead) => lead.requestId === requestId), true);
    assert.ok(countTrashedLeads() >= 1);

    restoreLead(requestId);
    assert.equal(listTrashedLeads().some((lead) => lead.requestId === requestId), false);
  });
});

describe("media upload revives a trashed file", () => {
  it("restores the existing record instead of silently keeping it deleted", async () => {
    const buffer = await sharp({
      create: { width: 40, height: 30, channels: 3, background: { r: 255, g: 0, b: 102 } },
    })
      .png()
      .toBuffer();
    const file = new File([new Uint8Array(buffer)], "revive.png", { type: "image/png" });

    const first = await processUpload(file, { alt: "Ảnh kiểm thử" });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const id = first.result.media.id;

    softDeleteMedia(id);
    assert.equal(getMedia(id)?.deletedAt !== null, true);
    const trashedBefore = countTrashedMedia();

    const second = await processUpload(file, { alt: "Ảnh kiểm thử" });
    assert.equal(second.ok, true);
    if (!second.ok) return;

    assert.equal(second.result.media.id, id, "same content ⇒ same record");
    assert.equal(second.result.restored, true, "the upload must report the revival");
    assert.equal(getMedia(id)?.deletedAt, null, "the record is no longer in the trash");
    assert.ok(countTrashedMedia() < trashedBefore);

    // Variants are served from the same generated paths.
    assert.equal(findMediaByUrl(second.result.media.url)?.id, id);
    assert.ok(second.result.media.variants.length >= 1);
  });
});

describe("admin payload schema", () => {
  const base = {
    title: "Tour thử",
    summary: "Mô tả ngắn",
    categoryIds: ["cat_quy_nhon_phu_yen"],
    durationDays: 1,
    itinerary: [],
  };

  it("accepts a blank slug so the action can derive it from the title", () => {
    const tour = adminTourPayloadSchema.safeParse({ ...base, slug: "" });
    assert.equal(tour.success, true, "empty slug must be allowed through the schema");

    const article = adminArticlePayloadSchema.safeParse({
      slug: "",
      title: "Bài thử",
      excerpt: "Tóm tắt",
      publishedAt: "2026-10-17",
    });
    assert.equal(article.success, true, "empty slug must be allowed for articles too");
  });

  it("still rejects a slug with spaces or accents", () => {
    const bad = adminTourPayloadSchema.safeParse({ ...base, slug: "Tour Quy Nhơn" });
    assert.equal(bad.success, false);
  });
});

describe("shared settings are language independent", () => {
  it("shows the Vietnamese contact details on the English site too", async () => {
    const hotline = `09${Date.now().toString().slice(-8)}`;
    saveSettingSection("vi", "contact", { hotline, hotlineHref: `tel:+84${hotline.slice(1)}` });

    const snapshot = await loadPublishedSnapshot();
    const vi = await getSiteSettings("vi", snapshot);
    const en = await getSiteSettings("en", snapshot);

    assert.equal(vi.contact.hotline, hotline);
    assert.equal(en.contact.hotline, hotline, "the English site must use the owner's hotline");

    // Hero copy stays per-language.
    saveSettingSection("vi", "hero", { lead: "Chỉ tiếng Việt" });
    const snapshot2 = await loadPublishedSnapshot();
    assert.equal((await getSiteSettings("vi", snapshot2)).hero.lead, "Chỉ tiếng Việt");
    assert.notEqual((await getSiteSettings("en", snapshot2)).hero.lead, "Chỉ tiếng Việt");
  });
});
