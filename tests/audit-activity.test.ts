import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  activityActionLabel,
  activityDetailItems,
  activityTargetLabel,
  annotateActivity,
  evaluateActivity,
  filterActivityRows,
  formatActivityTime,
  parseAuditDetails,
  summarizeActivity,
  type RawActivity,
} from "../src/lib/audit-activity";

/**
 * The activity page is allowed to raise a concern only when the log supports
 * it. These tests lock the rules and the Vietnamese labels, including the
 * "insufficient data" path for old records.
 */

function raw(overrides: Partial<RawActivity> = {}): RawActivity {
  return {
    id: 1,
    action: "publish",
    target: "tours/tour_1",
    at: "2026-10-22T01:00:00.000Z",
    actor: "admin",
    ip: "203.0.113.10",
    status: "success",
    details: {
      record: {
        title: "Quy Nhơn 3 ngày 2 đêm",
        stateBefore: "draft",
        stateAfter: "published",
      },
      changes: [
        { label: "Giá từ", before: 2500000, after: 2700000 },
      ],
    },
    ...overrides,
  };
}

describe("audit activity — nhãn dễ hiểu", () => {
  it("dịch hành động quen thuộc sang tiếng Việt", () => {
    assert.equal(activityActionLabel("publish"), "Xuất bản nội dung");
    assert.equal(activityActionLabel("lead-delete"), "Xóa yêu cầu tư vấn");
    assert.equal(
      activityActionLabel("update_user_role"),
      "Hoạt động khác",
    );
  });

  it("mô tả đối tượng bằng tên nội dung thay vì mã kỹ thuật", () => {
    assert.equal(
      activityTargetLabel(raw()),
      "Tour du lịch · Quy Nhơn 3 ngày 2 đêm",
    );
    assert.equal(
      activityTargetLabel(
        raw({
          action: "upload",
          target: "uuid",
          details: { name: "anh-bien.webp" },
        }),
      ),
      "Ảnh · anh-bien.webp",
    );
    assert.equal(
      activityTargetLabel(
        raw({
          action: "lead-update",
          target: "STT-20261022-ABCD",
          details: { leadId: "STT-20261022-ABCD" },
        }),
      ),
      "Yêu cầu tư vấn · STT-20261022-ABCD",
    );
  });

  it("hiển thị thời gian theo giờ Việt Nam", () => {
    assert.equal(
      formatActivityTime("2026-10-22T00:00:00.000Z"),
      "22/10/2026 lúc 07:00",
    );
    assert.equal(formatActivityTime("not-a-date"), "Không đủ dữ liệu");
  });
});

describe("audit activity — quy tắc đánh dấu", () => {
  it("đánh dấu thao tác thất bại", () => {
    const [row] = annotateActivity([
      raw({ id: 1, action: "content-save-failed", status: "failure" }),
    ]);
    assert.equal(row.flagged, true);
    assert.ok(row.flags.some((flag) => flag.code === "failure"));
    assert.match(row.flags[0].reason, /không thành công/);
  });

  it("đánh dấu xóa dữ liệu và thay đổi mật khẩu", () => {
    const rows = annotateActivity([
      raw({ id: 1, action: "lead-delete", details: { leadId: "STT-1" } }),
      raw({ id: 2, action: "password-change", target: "admin" }),
      raw({ id: 3, action: "bootstrap", target: "admin" }),
    ]);
    assert.ok(rows[0].flags.some((flag) => flag.code === "delete"));
    assert.ok(rows[1].flags.some((flag) => flag.code === "access-change"));
    assert.ok(rows[2].flags.some((flag) => flag.code === "access-change"));
  });

  it("không đánh dấu đăng nhập thành công thông thường", () => {
    const [row] = annotateActivity([
      raw({ action: "login", target: "admin" }),
    ]);
    assert.equal(row.flagged, false);
    assert.equal(row.flags.length, 0);
  });

  it("đánh dấu 3 lần đăng nhập thất bại từ cùng IP trong 15 phút", () => {
    const rows = annotateActivity([
      raw({
        id: 1,
        action: "login-failed",
        target: "admin",
        actor: null,
        at: "2026-10-22T01:00:00.000Z",
        status: "failure",
        details: { usernameTried: "admin" },
      }),
      raw({
        id: 2,
        action: "login-failed",
        target: "admin",
        actor: null,
        at: "2026-10-22T01:05:00.000Z",
        status: "failure",
        details: { usernameTried: "admin" },
      }),
      raw({
        id: 3,
        action: "login-failed",
        target: "admin",
        actor: null,
        at: "2026-10-22T01:10:00.000Z",
        status: "failure",
        details: { usernameTried: "admin" },
      }),
    ]);
    const repeated = rows[2].flags.find(
      (flag) => flag.code === "repeated-login-failure",
    );
    assert.ok(repeated);
    assert.match(repeated.reason, /3 lần/);
  });

  it("không đánh dấu khi chỉ có 2 lần đăng nhập thất bại", () => {
    const rows = annotateActivity([
      raw({
        id: 1,
        action: "login-failed",
        actor: null,
        status: "failure",
        at: "2026-10-22T01:00:00.000Z",
      }),
      raw({
        id: 2,
        action: "login-failed",
        actor: null,
        status: "failure",
        at: "2026-10-22T01:05:00.000Z",
      }),
    ]);
    assert.ok(
      rows.every((row) =>
        row.flags.every((flag) => flag.code !== "repeated-login-failure"),
      ),
    );
  });

  it("đếm 2 lần thất bại ở hai IP khác nhau là hai sự kiện riêng", () => {
    const rows = annotateActivity([
      raw({
        id: 1,
        action: "login-failed",
        actor: null,
        status: "failure",
        ip: "203.0.113.1",
        at: "2026-10-22T01:00:00.000Z",
      }),
      raw({
        id: 2,
        action: "login-failed",
        actor: null,
        status: "failure",
        ip: "203.0.113.2",
        at: "2026-10-22T01:01:00.000Z",
      }),
    ]);
    assert.ok(
      rows.every((row) =>
        row.flags.every((flag) => flag.code !== "repeated-login-failure"),
      ),
    );
  });
});

describe("audit activity — trạng thái tổng quan", () => {
  it("log trống là chưa đủ dữ liệu, không phải bình thường", () => {
    const decision = evaluateActivity({
      total: 0,
      admins: 0,
      success: 0,
      failure: 0,
      flagged: 0,
      incomplete: 0,
      truncated: false,
    });
    assert.equal(decision.status, "insufficient");
    assert.match(decision.explanation, /thiếu log/);
  });

  it("có sự kiện bị đánh dấu thì cần xem lại", () => {
    const summary = summarizeActivity([raw()]);
    summary.flagged = 1;
    const decision = evaluateActivity(summary);
    assert.equal(decision.status, "review");
    assert.match(decision.explanation, /1 hoạt động/);
  });

  it("bản ghi cũ thiếu người thực hiện/IP thì chưa đủ dữ liệu", () => {
    const summary = summarizeActivity([
      raw({ actor: null, ip: null }),
    ]);
    const decision = evaluateActivity(summary);
    assert.equal(decision.status, "insufficient");
    assert.ok(decision.notes.some((note) => note.includes("thiếu thông tin")));
  });

  it("đủ dữ liệu và không có cờ thì bình thường", () => {
    const summary = summarizeActivity([raw()]);
    const decision = evaluateActivity(summary);
    assert.equal(decision.status, "normal");
  });

  it("đếm admin, thành công, thất bại và bản ghi thiếu dữ liệu", () => {
    const summary = summarizeActivity([
      raw({ id: 1, actor: "admin" }),
      raw({ id: 2, actor: "admin", status: "failure" }),
      raw({ id: 3, actor: null, ip: null }),
    ]);
    assert.equal(summary.total, 3);
    assert.equal(summary.admins, 1);
    assert.equal(summary.success, 2);
    assert.equal(summary.failure, 1);
    assert.equal(summary.incomplete, 1);
  });
});

describe("audit activity — chi tiết và bộ lọc", () => {
  it("dựng thông tin trước/sau dễ đọc", () => {
    const items = activityDetailItems(raw());
    assert.ok(
      items.some(
        (item) =>
          item.label === "Trạng thái nội dung" &&
          item.before === "Bản nháp" &&
          item.after === "Đang xuất bản",
      ),
    );
    assert.ok(
      items.some(
        (item) =>
          item.label === "Giá từ" &&
          item.before === "2.500.000" &&
          item.after === "2.700.000",
      ),
    );
  });

  it("hiển thị lý do đăng nhập thất bại mà không lộ mật khẩu", () => {
    const items = activityDetailItems(
      raw({
        action: "login-failed",
        details: {
          usernameTried: "admin",
          reason: "Tên đăng nhập hoặc mật khẩu không đúng",
        },
      }),
    );
    assert.ok(items.some((item) => item.label === "Tên đăng nhập đã thử"));
    assert.ok(items.some((item) => item.label === "Ghi nhận của hệ thống"));
    assert.ok(!JSON.stringify(items).toLowerCase().includes("password"));
  });

  it("hiển thị trạng thái trước của yêu cầu tư vấn khi xóa", () => {
    const items = activityDetailItems(
      raw({
        action: "lead-delete",
        details: { leadId: "STT-1", before: { status: "contacted" } },
      }),
    );
    assert.ok(
      items.some(
        (item) =>
          item.label === "Trạng thái yêu cầu" &&
          item.before === "Đã liên hệ" &&
          item.after === "Đã xóa",
      ),
    );
  });

  it("lọc theo admin, loại thao tác, kết quả và tìm không dấu", () => {
    const rows = annotateActivity([
      raw({ id: 1, action: "publish", actor: "admin" }),
      raw({
        id: 2,
        action: "lead-delete",
        actor: "owner",
        status: "failure",
        details: { leadId: "STT-1" },
      }),
    ]);
    assert.equal(
      filterActivityRows(rows, { admin: "owner" }).length,
      1,
    );
    assert.equal(
      filterActivityRows(rows, { action: "lead-delete" }).length,
      1,
    );
    assert.equal(
      filterActivityRows(rows, { status: "failure" }).length,
      1,
    );
    assert.equal(
      filterActivityRows(rows, { q: "quy nhon" }).length,
      1,
      "tìm theo tên tour phải bỏ dấu tiếng Việt",
    );
  });

  it("đọc details JSON an toàn", () => {
    assert.deepEqual(parseAuditDetails('{"record":{"title":"A"}}'), {
      record: { title: "A" },
    });
    assert.equal(parseAuditDetails("not json"), null);
    assert.equal(parseAuditDetails("[1,2]"), null);
  });
});
