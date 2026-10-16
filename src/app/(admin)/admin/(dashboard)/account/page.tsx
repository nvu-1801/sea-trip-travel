import type { Metadata } from "next";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import { AdminCard, PageHeader } from "@/components/admin/ui";
import { AdminLoginCard } from "@/components/admin/login-card";
import { PasswordForm } from "./password-form";

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

export const metadata: Metadata = { title: "Tài khoản" };

export default async function AccountPage() {
  await connection();
  // The (dashboard) layout owns the guard; this read keeps the page out of the
  // static shell and provides the identity shown here.
  const admin = await getCurrentAdmin();
  if (!admin) return <AdminLoginCard notice="Vui lòng đăng nhập để tiếp tục." />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Tài khoản" description="Hệ thống chỉ dùng một tài khoản quản trị." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminCard>
          <h2 className="text-lg font-bold text-foreground">Thông tin</h2>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
              <dt className="text-foreground-subtle">Tên đăng nhập</dt>
              <dd className="font-semibold text-foreground">{admin.username}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-foreground-subtle">Mã phiên</dt>
              <dd className="font-mono text-xs text-foreground-muted">{admin.sessionId}</dd>
            </div>
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-foreground-subtle">
            Quên mật khẩu? Trên máy chủ, chạy{" "}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono">
              npm run admin -- reset-password --username {admin.username}
            </code>
            . Không có chức năng đặt lại qua email và không có đăng ký công khai.
          </p>
        </AdminCard>

        <AdminCard>
          <h2 className="text-lg font-bold text-foreground">Đổi mật khẩu</h2>
          <div className="mt-4">
            <PasswordForm />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
