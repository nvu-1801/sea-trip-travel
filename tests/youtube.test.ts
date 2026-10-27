import { test } from "node:test";
import assert from "node:assert/strict";
import { isYouTubeUrl, parseYouTubeUrl } from "../src/lib/youtube";

test("accepted YouTube forms produce one canonical id", () => {
  const forms = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    "youtu.be/dQw4w9WgXcQ",
  ];
  for (const form of forms) {
    const parsed = parseYouTubeUrl(form);
    assert.ok(parsed, `expected ${form} to parse`);
    assert.equal(parsed?.id, "dQw4w9WgXcQ");
    assert.equal(
      parsed?.watchUrl,
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    assert.equal(
      parsed?.embedUrl,
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  }
});

test("unsafe or unknown links are rejected", () => {
  for (const value of [
    "",
    "javascript:alert(1)",
    "https://evil.test/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch",
    "<iframe src='https://www.youtube.com/embed/dQw4w9WgXcQ'></iframe>",
    "https://www.youtube.com/embed/dQw4w9WgXcQ<script>",
    null,
    undefined,
    42,
  ]) {
    assert.equal(isYouTubeUrl(value), false, `expected reject: ${String(value)}`);
  }
});

test("missing scheme is tolerated only for YouTube hosts", () => {
  assert.equal(parseYouTubeUrl("youtube.com/watch?v=dQw4w9WgXcQ")?.id, "dQw4w9WgXcQ");
  assert.equal(parseYouTubeUrl("example.com/watch?v=dQw4w9WgXcQ"), null);
});
