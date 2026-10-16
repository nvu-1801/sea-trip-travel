import Link from "next/link";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import type { Metadata } from "next";
import { countArticlesByState } from "@/server/repo/articles";
import { countLeadsByStatus } from "@/server/repo/leads";
import { countMedia } from "@/server/repo/media";
import { countToursByState, recentlyUpdatedTours } from "@/server/repo/tours";
import { listAudit } from "@/server/repo/admin";
import { AdminCard, CodeChip, PageHeader, StatCard, StatusPill } from "@/components/admin/ui";
import { AdminLoginCard } from "@/components/admin/login-card";

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

export const metadata: Metadata = { title: "Tổng quan" };

/**
 * Dashboard.
 *
 * Every number is a live count from SQLite — never a placeholder. "Nháp" counts
 * content that exists but is not public, which is the number the owner actually
 * needs to act on.
 */
export default async function AdminDashboardPage() {
  await connection();
  const admin = await getCurrentAdmin();
  if (!admin) return <AdminLoginCard notice="Vui lòng đăng nhập để tiếp tục." />;
  const tours = countToursByState();
  const articles = countArticlesByState();
  const leads = countLeadsByStatus();
  const media = countMedia();
  const recentTours = recentlyUpdatedTours(5);
  const audit = listAudit(6);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Tổng quan"
        description="Số liệu trực tiếp từ cơ sở dữ liệu. Nội dung nháp chưa hiển thị trên website."
        actions={
          <>
            <Link
              href="/admin/tours/new"
              className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-strong-hover"
            >
              + Thêm tour
            </Link>
            <Link
              href="/admin/articles/new"
              className="inline-flex min-h-11 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-foreground hover:bg-primary-soft"
            >
              + Thêm bài viết
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tour đã xuất bản"
          value={tours.published}
          hint={`${tours.draft} nháp · ${tours.hidden} đang ẩn`}
          href="/admin/tours"
        />
        <StatCard
          label="Bài viết đã xuất bản"
          value={articles.published}
          hint={`${articles.draft} nháp · ${articles.hidden} đang ẩn`}
          href="/admin/articles"
        />
        <StatCard
          label="Yêu cầu tư vấn mới"
          value={leads.new}
          hint={`${leads.total} tổng · ${leads.processing} đang xử lý`}
          href="/admin/leads"
        />
        <StatCard label="Ảnh trong thư viện" value={media} hint="Không tính ảnh đã xoá" href="/admin/media" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminCard>
          <h2 className="text-lg font-bold text-foreground">Tour cập nhật gần đây</h2>
          {recentTours.length === 0 ? (
            <p className="mt-3 text-sm text-foreground-muted">Chưa có tour nào.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {recentTours.map((record) => (
                <li key={record.tour.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/tours/${record.tour.id}`}
                      className="block truncate text-sm font-semibold text-foreground hover:text-primary-strong"
                    >
                      {record.tour.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <CodeChip>{record.tour.slug}</CodeChip>
                      <span className="text-xs text-foreground-subtle">
                        {new Date(record.tour.updatedAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>
                  <StatusPill
                    status={record.status}
                    label={record.status === "published" ? "Đã xuất bản" : record.status === "hidden" ? "Đang ẩn" : "Nháp"}
                  />
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard>
          <h2 className="text-lg font-bold text-foreground">Thao tác gần đây</h2>
          {audit.length === 0 ? (
            <p className="mt-3 text-sm text-foreground-muted">Chưa có thao tác nào được ghi lại.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {audit.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="flex items-center justify-between gap-3 py-3">
                  <span className="truncate text-sm text-foreground-muted">
                    {entry.summary ?? entry.action}
                  </span>
                  <span className="shrink-0 text-xs text-foreground-subtle">
                    {new Date(entry.at).toLocaleString("vi-VN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
