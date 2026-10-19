import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { db, audit } from "@/server/cms/db";
import { listLeads, encrypt, decrypt, markMail } from "@/server/cms/leads";
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
import { handle, jsonBody, reply } from "@/server/cms/http";
export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    return reply(listLeads());
  });
}
export async function PATCH(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const input = z
      .object({
        id: z.string().max(100),
        status: z.enum(["new", "contacted", "qualified", "won", "lost"]),
        note: z.string().max(2000),
      })
      .parse(await jsonBody(request, 10000));
    db()
      .prepare("UPDATE leads SET status=?,note=? WHERE id=?")
      .run(input.status, encrypt(input.note), input.id);
    audit("lead-update", input.id);
    return reply({ ok: true });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    await requireSession(request);
    if (!consumeLimit("retry-mail", 20, 3600000))
      return reply({ error: "Đã đạt giới hạn gửi lại trong giờ" }, 429);
    const { id } = z
      .object({ id: z.string().max(100) })
      .parse(await jsonBody(request, 1000));
    const row = db()
      .prepare("SELECT data,mail_status FROM leads WHERE id=?")
      .get(id) as { data: string; mail_status: string } | undefined;
    if (!row) return reply({ error: "Không có yêu cầu này" }, 404);
    if (row.mail_status === "sent")
      return reply({ error: "Email đã gửi thành công" }, 409);
    const lead = contactLeadSchema.parse(decrypt(row.data)),
      mailer = getMailer();
    if (!mailer.isConfigured())
      return reply({ error: "Cấu hình SMTP trước khi gửi lại" }, 503);
    const lock = db()
      .prepare(
        "UPDATE leads SET mail_status='sending' WHERE id=? AND mail_status NOT IN ('sent','sending')",
      )
      .run(id);
    if (!lock.changes)
      return reply({ error: "Email đang gửi hoặc đã gửi" }, 409);
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
      return reply(
        { error: "Chưa gửi được email. Yêu cầu vẫn được lưu." },
        502,
      );
    }
    markMail(id, result.ok ? "sent" : "failed");
    audit("lead-mail-retry", id);
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
    const { id } = z
      .object({ id: z.string().max(100) })
      .parse(await jsonBody(request, 1000));
    db().prepare("DELETE FROM leads WHERE id=?").run(id);
    audit("lead-delete", id);
    return reply({ ok: true });
  });
}
