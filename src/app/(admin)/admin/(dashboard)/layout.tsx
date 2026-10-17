import Link from "next/link";
import { connection } from "next/server";
import { getCurrentAdmin, isAdminEnabled } from "@/server/auth/session";
import { logoutAction } from "@/server/admin/actions";
import { AdminNav } from "@/components/admin/nav";
import { SubmitButton } from "@/components/admin/buttons";
import { AdminLoginCard } from "@/components/admin/login-card";

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

/**
 * Protected admin shell.
 *
 * The guard runs on the server for every admin screen, so an anonymous request
 * never reaches a page component. When there is no valid session the shell
 * renders the sign-in card *instead of* calling `redirect()`: a redirect thrown
 * from inside the streamed admin subtree under Cache Components produces an error
 * page, not a 307. Pages repeat the cookie read so they are never prerendered.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await connection();

  // Read-only deployments (CONTENT_SOURCE=remote, or ADMIN_ENABLED=false) have no
  // database to write to, so say so instead of showing a form that cannot work.
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
  if (!admin) return <AdminLoginCard notice="Vui lòng đăng nhập để tiếp tục." />;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="brand-gradient h-0.5 w-full" aria-hidden="true" />
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
                ST
              </span>
              <span className="text-sm font-bold tracking-tight text-foreground">
                SEA TRIP <span className="text-primary-strong">Quản trị</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden text-xs font-semibold text-foreground-muted hover:text-primary-strong sm:inline-flex"
            >
              Xem website ↗
            </Link>
            <span className="hidden text-xs text-foreground-subtle sm:inline">
              {admin.username}
            </span>
            <form action={logoutAction}>
              <SubmitButton variant="secondary" pendingLabel="Đang thoát…" className="min-h-9 px-3 text-xs">
                Đăng xuất
              </SubmitButton>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-[100rem] px-4 pb-3 sm:px-6">
          <AdminNav variant="mobile" />
        </div>
      </header>

      <div className="mx-auto flex max-w-[100rem] gap-8 px-4 py-6 sm:px-6 lg:py-8">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-28">
            <AdminNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
