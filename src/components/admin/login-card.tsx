import Link from "next/link";
import { LoginForm } from "@/app/(admin)/admin/login/login-form";

/**
 * The admin sign-in card.
 *
 * Shared by `/admin/login` and by the protected shell: when a session is missing
 * (anonymous visitor, or an expired cookie) the shell renders this inline instead
 * of calling `redirect()`. Under Cache Components a redirect thrown from inside
 * the streamed admin subtree renders an error page rather than a 307, so the
 * shell shows the form and the successful login navigates on the client.
 */
export function AdminLoginCard({
  notice,
  redirectTo = "/admin",
}: {
  notice?: string;
  redirectTo?: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-16">
      <div className="mb-8 text-center">
        <Link href="/" className="text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">
          SEA TRIP TRAVEL
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-foreground">Đăng nhập quản trị</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Chỉ dành cho quản trị viên. Hệ thống không có đăng ký công khai.
        </p>
      </div>

      {notice ? (
        <p className="mb-4 rounded-xl border border-border-strong bg-surface-muted px-4 py-3 text-sm text-foreground-muted">
          {notice}
        </p>
      ) : null}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <LoginForm redirectTo={redirectTo} />
      </div>

      <p className="mt-6 text-center text-xs text-foreground-subtle">
        Quên mật khẩu? Dùng lệnh{" "}
        <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono">
          npm run admin -- reset-password
        </code>{" "}
        trên máy chủ.
      </p>
    </main>
  );
}
