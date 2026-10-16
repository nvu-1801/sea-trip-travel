import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentAdmin, isAdminEnabled } from "@/server/auth/session";
import { AdminLoginCard } from "@/components/admin/login-card";

/**
 * Admin login.
 *
 * No public registration: the only account is created from the CLI
 * (`npm run admin -- create-admin`). If the admin is disabled (remote/Vercel
 * profile), the whole area reports that instead of showing a dead form.
 */

export const metadata: Metadata = { title: "Đăng nhập" };

export const instant = false;

export default async function AdminLoginPage() {
  await connection();
  if (!isAdminEnabled()) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-16">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <h1 className="text-xl font-bold text-foreground">Khu quản trị không khả dụng</h1>
          <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
            Bản triển khai này đang chạy ở chế độ chỉ đọc nội dung (không có cơ sở dữ liệu). Hãy
            đăng nhập trên máy chủ VPS nơi đặt cơ sở dữ liệu.
          </p>
        </div>
      </main>
    );
  }

  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");

  return <AdminLoginCard />;
}
