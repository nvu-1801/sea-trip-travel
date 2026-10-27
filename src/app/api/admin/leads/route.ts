import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { db } from "@/server/cms/db";
import { auditFailure, auditRequest } from "@/server/cms/audit";
import {
  listLeads,
  encrypt,
  decrypt,
  markMail,
  unreadLeadCount,
  markLeadRead,
  listTrashedLeads,
  trashedLeadCount,
  softDeleteLead,
  restoreLead,
  purgeLead,
} from "@/server/cms/leads";
import { consumeLimit } from "@/server/cms/store";
import { getMailer } from "@/server/email/mailer";
import { contactLeadSchema } from "@/domain/lead";
import { getTourBySlug } from "@/lib/data/tours";
import {
  buildLeadSubject,
  buildLeadNotificationHtml,
  buildLeadNotificationText,
} from "@/server/email/templates/lead-notification";
import { siteConfig } from "@/config/runtime-site";
import { localizePath } from "@/i18n/routing";
import { handle, jsonBody, reply } from "@/server/cms/http";

/**
 * Resolve the tour a lead picked so the admin can open the exact page.
 * Cached per request: `getTourBySlug` re-reads the published collection.
 */
function withTourInfo(rows: ReturnType<typeof listLeads>) {
  const cache = new Map<string, { title: string; href: string } | null>();
  return rows.map((row) => {
    const raw = row.data as Record<string, unknown>;
    const slug = typeof raw.tourSlug === "string" ? raw.tourSlug : "";
    if (!slug) return row;
    const locale = raw.locale === "en" ? "en" : "vi";
    const key = `${locale}|${slug}`;
    if (!cache.has(key)) {
      const tour = getTourBySlug(slug, locale);
      cache.set(
        key,
        tour
          ? {
              title: tour.title,
              href: localizePath(locale, `/tour/${tour.slug}`),
            }
          : null,
      );
    }
    const meta = cache.get(key);
    if (!meta) {
      // `null` (not missing) tells the UI the tour is no longer published.
      return { ...row, tourHref: null };
    }
    return { ...row, tourTitle: meta.title, tourHref: meta.href };
  });
}

export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const params = new URL(request.url).searchParams;
    if (params.get("unread") === "1") {
      return reply({
        count: unreadLeadCount(),
        trash: trashedLeadCount(),
      });
    }
    if (params.get("trash") === "1") {
      return reply(withTourInfo(listTrashedLeads()));
    }
    return reply(withTourInfo(listLeads()));
  });
}
export async function PATCH(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const body = await jsonBody(request, 10000);
    if (body?.action === "mark-read") {
      const { id } = z.object({ id: z.string().min(1).max(100) }).parse(body);
      if (!markLeadRead(id))
        return reply({ error: "Không có yêu cầu này" }, 404);
      return reply({ ok: true, count: unreadLeadCount() });
    }
    if (body?.action === "restore") {
      const { id } = z.object({ id: z.string().min(1).max(100) }).parse(body);
      const before = db()
        .prepare("SELECT status FROM leads WHERE id=? AND deleted_at IS NOT NULL")
        .get(id) as { status: string } | undefined;
      if (!restoreLead(id)) {
        auditFailure(
          request,
          "lead-restore",
          id,
          "Không tìm thấy yêu cầu trong thùng rác",
        );
        return reply(
          { error: "Không có yêu cầu này trong thùng rác" },
          404,
        );
      }
      auditRequest(request, "lead-restore", id, {
        details: {
          leadId: id,
          ...(before ? { after: { status: before.status } } : {}),
        },
      });
      return reply({ ok: true });
    }
    const input = z
      .object({
        id: z.string().max(100),
        status: z.enum(["new", "contacted", "qualified", "won", "lost"]),
        note: z.string().max(2000),
      })
      .parse(body);
    const before = db()
      .prepare("SELECT status FROM leads WHERE id=?")
      .get(input.id) as { status: string } | undefined;
    if (!before) {
      auditFailure(
        request,
        "lead-update",
        input.id,
        "Không tìm thấy yêu cầu tư vấn",
      );
      return reply({ error: "Không có yêu cầu này" }, 404);
    }
    db()
      .prepare("UPDATE leads SET status=?,note=? WHERE id=?")
      .run(input.status, encrypt(input.note), input.id);
    auditRequest(request, "lead-update", input.id, {
      details: {
        leadId: input.id,
        before: { status: before.status },
        after: { status: input.status },
      },
    });
    return reply({ ok: true });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    await requireSession(request);
    if (!consumeLimit("retry-mail", 20, 3600000)) {
      auditFailure(
        request,
        "lead-mail-retry",
        "rate-limit",
        "Đã đạt giới hạn gửi lại trong giờ",
      );
      return reply({ error: "Đã đạt giới hạn gửi lại trong giờ" }, 429);
    }
    const { id } = z
      .object({ id: z.string().max(100) })
      .parse(await jsonBody(request, 1000));
    const row = db()
      .prepare(
        "SELECT data,mail_status,deleted_at FROM leads WHERE id=?",
      )
      .get(id) as
      | { data: string; mail_status: string; deleted_at: string | null }
      | undefined;
    if (!row || row.deleted_at) {
      auditFailure(
        request,
        "lead-mail-retry",
        id,
        "Không tìm thấy yêu cầu tư vấn",
      );
      return reply({ error: "Không có yêu cầu này" }, 404);
    }
    if (row.mail_status === "sent") {
      auditFailure(
        request,
        "lead-mail-retry",
        id,
        "Email đã gửi thành công trước đó",
      );
      return reply({ error: "Email đã gửi thành công" }, 409);
    }
    const lead = contactLeadSchema.parse(decrypt(row.data)),
      mailer = getMailer();
    if (!mailer.isConfigured()) {
      auditFailure(request, "lead-mail-retry", id, "Chưa cấu hình SMTP");
      return reply({ error: "Cấu hình SMTP trước khi gửi lại" }, 503);
    }
    const lock = db()
      .prepare(
        "UPDATE leads SET mail_status='sending' WHERE id=? AND mail_status NOT IN ('sent','sending')",
      )
      .run(id);
    if (!lock.changes) {
      auditFailure(
        request,
        "lead-mail-retry",
        id,
        "Email đang gửi hoặc đã gửi",
      );
      return reply({ error: "Email đang gửi hoặc đã gửi" }, 409);
    }
    const context = {
      lead,
      tourTitle: lead.tourSlug
        ? getTourBySlug(lead.tourSlug, lead.locale)?.title
        : undefined,
    };
    let result;
    try {
      result = await mailer.send({
        to: (process.env.SALES_RECIPIENTS ?? siteConfig.contact.email)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        from: [
          process.env.MAIL_FROM_NAME ?? siteConfig.name,
          "<" + (process.env.MAIL_FROM_EMAIL ?? siteConfig.contact.email) + ">",
        ].join(" "),
        ...(lead.email ? { replyTo: lead.email } : {}),
        subject: buildLeadSubject(context),
        html: buildLeadNotificationHtml(context),
        text: buildLeadNotificationText(context),
      });
    } catch {
      markMail(id, "failed");
      auditFailure(request, "lead-mail-retry", id, "Lỗi khi gửi email", {
        leadId: id,
        mailStatus: "failed",
      });
      return reply(
        { error: "Chưa gửi được email. Yêu cầu vẫn được lưu." },
        502,
      );
    }
    markMail(id, result.ok ? "sent" : "failed");
    if (result.ok) {
      auditRequest(request, "lead-mail-retry", id, {
        details: { leadId: id, mailStatus: "sent" },
      });
    } else {
      auditFailure(
        request,
        "lead-mail-retry",
        id,
        "Nhà cung cấp email từ chối gửi",
        {
          leadId: id,
          mailStatus: "failed",
        },
      );
    }
    return reply(
      result.ok
        ? { ok: true }
        : { error: "Chưa gửi được email. Yêu cầu vẫn được lưu." },
      result.ok ? 200 : 502,
    );
  });
}
export async function DELETE(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const { id, purge } = z
      .object({
        id: z.string().min(1).max(100),
        purge: z.boolean().optional(),
      })
      .parse(await jsonBody(request, 1000));
    const before = db()
      .prepare("SELECT status, deleted_at FROM leads WHERE id=?")
      .get(id) as { status: string; deleted_at: string | null } | undefined;

    if (purge) {
      if (!purgeLead(id)) {
        auditFailure(
          request,
          "lead-purge",
          id,
          "Chỉ xóa vĩnh viễn được mục đang ở thùng rác",
        );
        return reply(
          { error: "Chỉ xóa vĩnh viễn được mục đang ở Thùng rác" },
          404,
        );
      }
      auditRequest(request, "lead-purge", id, {
        details: {
          leadId: id,
          ...(before ? { before: { status: before.status } } : {}),
        },
      });
      return reply({ ok: true });
    }

    if (!softDeleteLead(id)) {
      auditFailure(request, "lead-trash", id, "Không tìm thấy yêu cầu tư vấn");
      return reply({ error: "Không có yêu cầu này" }, 404);
    }
    auditRequest(request, "lead-trash", id, {
      details: {
        leadId: id,
        ...(before ? { before: { status: before.status } } : {}),
      },
    });
    return reply({ ok: true });
  });
}
