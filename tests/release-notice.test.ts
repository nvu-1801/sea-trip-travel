import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildReleaseNoticeHtml,
  buildReleaseNoticeSubject,
  buildReleaseNoticeText,
  formatUpdatedAt,
  isCustomerFacingNote,
  parseRecipients,
  parseReleaseManifest,
  safeSiteUrl,
  selectReleaseNotes,
} from "../scripts/lib/release-notice.mjs";

it("release manifest includes notes and the previous release on merge commits", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "seatrip-release-history-"));
  const env = {
    // Git hooks export repository context; fixtures must never inherit it.
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
    NODE_ENV: process.env.NODE_ENV,
    GIT_AUTHOR_NAME: "Release fixture",
    GIT_AUTHOR_EMAIL: "fixture@example.com",
    GIT_COMMITTER_NAME: "Release fixture",
    GIT_COMMITTER_EMAIL: "fixture@example.com",
  };
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: directory, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  try {
    git("init");
    git("commit", "--allow-empty", "-m", "Initial release");
    const previous = git("rev-parse", "HEAD");
    const branch = git("symbolic-ref", "--short", "HEAD");
    git("checkout", "-b", "feature");
    git("commit", "--allow-empty", "-m", "Technical change");
    git("checkout", branch);
    const note = "Thông tin giá tour được kiểm tra trước khi lưu";
    git("merge", "--no-ff", "feature", "-m", "Merge release", "-m", `Customer-Note: ${note}`);
    const head = git("rev-parse", "HEAD");
    const runner = fileURLToPath(new URL("../scripts/build-release-notes.mjs", import.meta.url));
    const output = execFileSync(process.execPath, [runner], {
      cwd: directory,
      env: { ...env, GITHUB_SHA: head },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const manifest = JSON.parse(output);
    assert.equal(manifest.head, head);
    assert.deepEqual(manifest.notes[head], [note]);
    assert.ok(manifest.order.includes(previous));
    assert.deepEqual(selectReleaseNotes(manifest, { headSha: head, previousSha: previous }).items, [note]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

/**
 * Email "website vừa được cập nhật" chỉ được nói về những thay đổi khách hàng
 * thực sự nhìn thấy, và phải im lặng khi không có ghi chú nào. Các test dưới
 * đây khoá đúng những hành vi đó.
 */

const sha = (character: string) => character.repeat(40);
const HEAD = sha("a");
const MIDDLE = sha("b");
const PREVIOUS = sha("c");
const OLDER = sha("d");

const manifest = {
  version: 2,
  head: HEAD,
  order: [HEAD, MIDDLE, PREVIOUS, OLDER],
  notes: {
    [HEAD]: ["Bộ lọc tìm tour nhanh và dễ dùng hơn trên điện thoại"],
    [MIDDLE]: ["Trang tour mới giúp khách xem lịch trình và giá rõ ràng hơn"],
    [OLDER]: ["Thông tin liên hệ được cập nhật đầy đủ hơn"],
  },
};

describe("release notice — chọn đúng thay đổi của đợt deploy", () => {
  it("chỉ lấy commit giữa bản đang chạy và bản mới, theo thứ tự thời gian", () => {
    const result = selectReleaseNotes(manifest, { headSha: HEAD, previousSha: PREVIOUS });
    assert.deepEqual(result.items, [
      "Trang tour mới giúp khách xem lịch trình và giá rõ ràng hơn",
      "Bộ lọc tìm tour nhanh và dễ dùng hơn trên điện thoại",
    ]);
    assert.equal(result.rejected.length, 0);
  });

  it("không lấy thay đổi của bản đã thông báo trước đó", () => {
    const result = selectReleaseNotes(manifest, { headSha: HEAD, previousSha: PREVIOUS });
    assert.ok(!result.items.some((item: string) => item.includes("Thông tin liên hệ")));
  });

  it("khi chưa biết bản trước, chỉ lấy commit mới nhất — không đổ cả lịch sử", () => {
    const result = selectReleaseNotes(manifest, { headSha: HEAD, previousSha: "" });
    assert.deepEqual(result.items, ["Bộ lọc tìm tour nhanh và dễ dùng hơn trên điện thoại"]);
  });

  it("khi bản trước không còn trong lịch sử, cũng chỉ lấy commit mới nhất", () => {
    const result = selectReleaseNotes(manifest, { headSha: HEAD, previousSha: sha("e") });
    assert.deepEqual(result.items, ["Bộ lọc tìm tour nhanh và dễ dùng hơn trên điện thoại"]);
  });

  it("không lặp lại cùng một nội dung", () => {
    const duplicated = {
      ...manifest,
      notes: {
        [HEAD]: ["Trang chủ hiển thị ảnh tour rõ hơn", "Trang chủ hiển thị ảnh tour rõ hơn"],
        [MIDDLE]: ["Trang chủ hiển thị ảnh tour rõ hơn"],
      },
    };
    const result = selectReleaseNotes(duplicated, { headSha: HEAD, previousSha: PREVIOUS });
    assert.deepEqual(result.items, ["Trang chủ hiển thị ảnh tour rõ hơn"]);
  });

  it("trả về rỗng khi SHA của bản deploy không có trong manifest", () => {
    const result = selectReleaseNotes(manifest, { headSha: sha("f"), previousSha: PREVIOUS });
    assert.deepEqual(result.items, []);
  });

  it("trả về rỗng khi bản trước chính là bản mới", () => {
    const result = selectReleaseNotes(manifest, { headSha: HEAD, previousSha: HEAD });
    assert.deepEqual(result.items, []);
  });
});

describe("release notice — không đưa chi tiết nội bộ vào email", () => {
  const internalNotes = [
    "Fix bug trong src/app/page.tsx",
    "Cập nhật API /api/leads",
    "Deploy commit 90b62ef",
    "Thêm migration cho database",
    "Xem https://github.com/example/repo",
    "refactor component TourCard",
    "Sửa <strong>HTML</strong> của trang chủ",
    "Hotfix CSS cho header",
    "Nâng cấp server lên Node 22",
  ];

  it("loại bỏ URL, tên tệp, mã commit và thuật ngữ kỹ thuật", () => {
    for (const note of internalNotes) {
      assert.equal(isCustomerFacingNote(note), false, `phải loại: ${note}`);
    }
  });

  it("giữ lại câu mô tả khách hàng hiểu được", () => {
    for (const note of [
      "Trang tour mới giúp khách xem lịch trình rõ hơn",
      "Bộ lọc tìm tour nhanh hơn trên điện thoại",
      "Thông tin liên hệ được cập nhật đầy đủ",
      "Đặt tour dễ hơn với biểu mẫu ngắn gọn",
    ]) {
      assert.equal(isCustomerFacingNote(note), true, `phải giữ: ${note}`);
    }
  });

  it("ghi chú bị loại không xuất hiện trong HTML hoặc văn bản thuần", () => {
    const dirty = {
      version: 2,
      head: HEAD,
      order: [HEAD],
      notes: {
        [HEAD]: [
          "Sửa src/app/page.tsx và deploy commit 90b62ef",
          "Trang chủ hiển thị ảnh tour rõ hơn",
        ],
      },
    };
    const result = selectReleaseNotes(dirty, { headSha: HEAD, previousSha: "" });
    assert.deepEqual(result.items, ["Trang chủ hiển thị ảnh tour rõ hơn"]);
    assert.equal(result.rejected.length, 1);

    const context = {
      siteName: "SEA TRIP TRAVEL",
      siteUrl: "https://sea-trip.example",
      updatedAt: new Date("2026-10-22T00:00:00Z"),
      items: result.items,
    };
    for (const output of [buildReleaseNoticeHtml(context), buildReleaseNoticeText(context)]) {
      assert.ok(!output.includes("90b62ef"));
      assert.ok(!output.includes("page.tsx"));
      assert.ok(!output.includes("deploy"));
    }
  });
});

describe("release notice — nội dung email", () => {
  const context = {
    siteName: "SEA TRIP TRAVEL",
    siteUrl: "https://sea-trip.example",
    updatedAt: new Date("2026-10-22T00:00:00Z"),
    items: ["Trang tour mới giúp khách xem lịch trình rõ hơn"],
  };

  it("có tên website, thời điểm cập nhật, danh sách thay đổi và nút Xem website", () => {
    const html = buildReleaseNoticeHtml(context);
    assert.match(html, /SEA TRIP TRAVEL/);
    assert.match(html, /22\/10\/2026/);
    assert.match(html, /Trang tour mới giúp khách xem lịch trình rõ hơn/);
    assert.match(html, /Xem website/);
    assert.match(html, /href="https:\/\/sea-trip\.example"/);
  });

  it("không chứa mã commit hay biến môi trường", () => {
    const html = buildReleaseNoticeHtml(context);
    const text = buildReleaseNoticeText(context);
    for (const output of [html, text]) {
      assert.ok(!output.includes(HEAD));
      assert.ok(!output.includes("RELEASE_NOTICE"));
      assert.ok(!output.includes("SMTP"));
    }
  });

  it("escape HTML trong ghi chú", () => {
    const html = buildReleaseNoticeHtml({
      ...context,
      items: ['Ưu đãi "hè" & quà tặng <3'],
    });
    assert.ok(html.includes("Ưu đãi &quot;hè&quot; &amp; quà tặng &lt;3"));
    assert.ok(!html.includes("quà tặng <3"));
  });

  it("nói thật là không có ghi chú thay đổi khi danh sách rỗng", () => {
    const html = buildReleaseNoticeHtml({ ...context, items: [] });
    const text = buildReleaseNoticeText({ ...context, items: [] });
    for (const output of [html, text]) {
      assert.match(output, /không kèm ghi chú thay đổi dành cho khách hàng/);
      assert.ok(!output.includes("Điểm mới khách hàng sẽ thấy"));
    }
  });

  it("có phiên bản văn bản thuần đầy đủ", () => {
    const text = buildReleaseNoticeText(context);
    assert.match(text, /SEA TRIP TRAVEL/);
    assert.match(text, /22\/10\/2026/);
    assert.match(text, /1\. Trang tour mới/);
    assert.match(text, /Xem website: https:\/\/sea-trip\.example/);
    assert.ok(!text.includes("<a "));
  });

  it("tiêu đề nêu website và ngày cập nhật", () => {
    const subject = buildReleaseNoticeSubject({
      siteName: "SEA TRIP TRAVEL",
      updatedAt: new Date("2026-10-22T00:00:00Z"),
    });
    assert.match(subject, /SEA TRIP TRAVEL/);
    assert.match(subject, /22\/10\/2026/);
  });

  it("hiển thị giờ Việt Nam", () => {
    const label = formatUpdatedAt(new Date("2026-10-22T00:00:00Z"));
    assert.match(label, /22\/10\/2026/);
    assert.match(label, /07:00/);
    assert.match(label, /Thứ Năm/);
  });
});

describe("release notice — cấu hình", () => {
  it("đọc manifest hợp lệ và bỏ qua dữ liệu sai", () => {
    const parsed = parseReleaseManifest(JSON.stringify(manifest));
    assert.equal(parsed.head, HEAD);
    assert.deepEqual(parsed.order, manifest.order);

    assert.deepEqual(parseReleaseManifest("not json"), {
      version: 2,
      head: null,
      order: [],
      notes: {},
    });
    assert.deepEqual(parseReleaseManifest(""), {
      version: 2,
      head: null,
      order: [],
      notes: {},
    });
  });

  it("chỉ nhận địa chỉ email hợp lệ và không trùng", () => {
    assert.deepEqual(
      parseRecipients("chu@example.com, chu@example.com; sai, ban@example.vn"),
      ["chu@example.com", "ban@example.vn"],
    );
    assert.deepEqual(parseRecipients(""), []);
  });

  it("chỉ chấp nhận URL website http(s)", () => {
    assert.equal(safeSiteUrl("https://sea-trip.example/"), "https://sea-trip.example");
    assert.equal(safeSiteUrl("https://sea-trip.example/tour/"), "https://sea-trip.example/tour");
    assert.equal(safeSiteUrl("javascript:alert(1)"), null);
    assert.equal(safeSiteUrl(""), null);
  });
});
