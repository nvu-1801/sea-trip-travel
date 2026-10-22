import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultLanding } from "../src/domain/landing";
import { homeSectionDraft } from "../src/lib/admin-home-draft";

test("a legacy landing row without a section opens with the default section", () => {
  const legacy = structuredClone(defaultLanding) as Record<string, unknown>;
  delete legacy.regions;

  const draft = homeSectionDraft(legacy, "regions");
  assert.deepEqual(draft.regions, defaultLanding.regions);
  assert.equal(draft.id, defaultLanding.id);
});

test("saved home copy wins over the default fallback", () => {
  const saved = structuredClone(defaultLanding) as Record<string, unknown>;
  saved.regions = {
    ...defaultLanding.regions,
    titleA: "Tiêu đề đã lưu",
  };
  const draft = homeSectionDraft(saved, "regions");
  assert.equal(
    (draft.regions as { titleA: string }).titleA,
    "Tiêu đề đã lưu",
  );
});

test("hero draft is returned unchanged", () => {
  const saved = { id: "hero", mode: "collage" };
  assert.deepEqual(homeSectionDraft(saved, "hero"), saved);
});
