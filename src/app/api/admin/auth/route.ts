import { z } from "zod";
import {
  login,
  logout,
  requireSession,
  hashPassword,
  verifyPassword,
} from "@/server/cms/auth";
import { db } from "@/server/cms/db";
import { auditFailure, auditRequest } from "@/server/cms/audit";
import { handle, jsonBody, reply } from "@/server/cms/http";
export async function GET() {
  return handle(async () => {
    const value = await requireSession();
    return reply({ csrf: value.csrf });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    const data = z
      .object({
        username: z.string().min(1).max(80),
        password: z.string().min(1).max(200),
        remember: z.boolean().optional(),
      })
      .parse(await jsonBody(request, 4096));
    return reply(
      await login(data.username, data.password, request, data.remember ?? false),
    );
  });
}
export async function DELETE(request: Request) {
  return handle(async () => {
    await requireSession(request);
    auditRequest(request, "logout", "admin");
    await logout();
    return reply({ ok: true });
  });
}
export async function PATCH(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const data = z
      .object({
        current: z.string().max(200),
        password: z.string().min(14).max(200),
      })
      .parse(await jsonBody(request, 4096));
    const user = db()
      .prepare("SELECT password FROM admin WHERE id=1")
      .get() as { password: string };
    if (!verifyPassword(data.current, user.password)) {
      auditFailure(
        request,
        "password-change",
        "admin",
        "Mật khẩu hiện tại không đúng",
      );
      return reply({ error: "Mật khẩu hiện tại không đúng" }, 400);
    }
    db()
      .prepare("UPDATE admin SET password=? WHERE id=1")
      .run(hashPassword(data.password));
    db().exec("DELETE FROM sessions");
    auditRequest(request, "password-change", "admin");
    await logout();
    return reply({ ok: true });
  });
}
