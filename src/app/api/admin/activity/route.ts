import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { db } from "@/server/cms/db";
import { handle, reply } from "@/server/cms/http";
import {
  ACTIVITY_PAGE_LIMIT,
  ACTIVITY_SCAN_LIMIT,
  activityActionOptions,
  activityAdminOptions,
  annotateActivity,
  countFlagged,
  evaluateActivity,
  filterActivityRows,
  parseAuditDetails,
  summarizeActivity,
  type AuditStatus,
  type RawActivity,
} from "@/lib/audit-activity";

export const dynamic = "force-dynamic";

/**
 * Read-only activity feed.
 *
 * This endpoint never writes to `audit`. It reads the newest N rows in the
 * selected window, derives flags, then applies the admin/action/result/search
 * filters in memory so Vietnamese text and mapped labels can be searched too.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

type AuditDbRow = {
  id: number;
  action: string;
  target: string;
  at: string;
  actor: string | null;
  ip: string | null;
  status: string | null;
  details: string | null;
};

function startOfVietnamDay(value: string): Date | null {
  if (!DATE_ONLY.test(value)) return null;
  const date = new Date(`${value}T00:00:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const url = new URL(request.url);

    const days = z.coerce
      .number()
      .int()
      .min(1)
      .max(90)
      .catch(7)
      .parse(url.searchParams.get("days") ?? "7");

    const now = new Date();
    let from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    let to = now;

    // Optional explicit dates, interpreted as Vietnam calendar days. The end
    // date is inclusive: "to=2026-10-22" includes all of 22/10 in Vietnam.
    const fromDate = startOfVietnamDay(url.searchParams.get("from") ?? "");
    const toDate = startOfVietnamDay(url.searchParams.get("to") ?? "");
    if (fromDate && toDate) {
      const exclusiveEnd = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);
      if (fromDate.getTime() < exclusiveEnd.getTime()) {
        from = fromDate;
        to = exclusiveEnd;
      }
    }

    const admin = (url.searchParams.get("admin") ?? "all").slice(0, 120);
    const action = (url.searchParams.get("action") ?? "all").slice(0, 80);
    const status = z.enum(["all", "success", "failure"]).catch("all").parse(
      url.searchParams.get("status") ?? "all",
    );
    const q = (url.searchParams.get("q") ?? "").slice(0, 120);

    const rows = db()
      .prepare(
        `SELECT id, action, target, created_at AS at, actor, ip,
                COALESCE(status, 'success') AS status, details
           FROM audit
          WHERE created_at >= ? AND created_at < ?
          ORDER BY created_at DESC, id DESC
          LIMIT ?`,
      )
      .all(
        from.toISOString(),
        to.toISOString(),
        ACTIVITY_SCAN_LIMIT + 1,
      ) as AuditDbRow[];

    const truncated = rows.length > ACTIVITY_SCAN_LIMIT;
    const raw: RawActivity[] = rows.slice(0, ACTIVITY_SCAN_LIMIT).map((row) => ({
      id: Number(row.id),
      action: String(row.action),
      target: String(row.target),
      at: String(row.at),
      actor: row.actor ? String(row.actor) : null,
      ip: row.ip ? String(row.ip) : null,
      status: (row.status === "failure" ? "failure" : "success") as AuditStatus,
      details: parseAuditDetails(row.details),
    }));

    const annotated = annotateActivity(raw);
    const summary = summarizeActivity(raw, truncated);
    summary.flagged = countFlagged(annotated);

    const matching = filterActivityRows(annotated, {
      admin,
      action,
      status,
      q,
    });

    const missing: string[] = [];
    if (summary.total === 0) {
      missing.push("Chưa có bản ghi hoạt động trong khoảng thời gian này.");
    }
    if (summary.incomplete > 0) {
      missing.push(
        `${summary.incomplete} bản ghi thiếu thông tin người thực hiện hoặc địa chỉ IP (thường là bản ghi cũ).`,
      );
    }
    if (truncated) {
      missing.push(
        `Chỉ đọc ${ACTIVITY_SCAN_LIMIT} bản ghi gần nhất trong khoảng thời gian này.`,
      );
    }

    return reply({
      generatedAt: now.toISOString(),
      range: { from: from.toISOString(), to: to.toISOString(), days },
      summary,
      decision: evaluateActivity(summary),
      rows: matching.slice(0, ACTIVITY_PAGE_LIMIT),
      matchingCount: matching.length,
      pageLimit: ACTIVITY_PAGE_LIMIT,
      missing,
      options: {
        actions: [
          { value: "all", label: "Tất cả thao tác" },
          ...activityActionOptions(raw),
        ],
        admins: [
          { value: "all", label: "Tất cả admin" },
          ...activityAdminOptions(raw),
        ],
      },
    });
  });
}
