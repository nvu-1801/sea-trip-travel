import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaSelectOptions } from "../src/lib/admin-media-options";

test("tour/hero aliases yield one option per src without losing library metadata", () => {
  const library = [
    { id: "upload-1", src: "/api/media/upload.webp", alt: "Uploaded photo" },
    { id: "original:/images/hero/blue-bay.webp", src: "/images/hero/blue-bay.webp", alt: "Tour cover" },
    { id: "hero:/images/hero/blue-bay.webp", src: "/images/hero/blue-bay.webp", alt: "Hero caption" },
    { id: "original:/images/tours/other.webp", src: "/images/tours/other.webp", alt: "Tour cover" },
  ];
  const snapshot = structuredClone(library);
  const options = mediaSelectOptions(library);
  assert.deepEqual(options, [
    { value: "/api/media/upload.webp", label: "Uploaded photo" },
    { value: "/images/hero/blue-bay.webp", label: "Tour cover" },
    { value: "/images/tours/other.webp", label: "Tour cover" },
  ]);
  assert.deepEqual(library, snapshot);
  assert.deepEqual(mediaSelectOptions([...library, ...library]), options);
});
