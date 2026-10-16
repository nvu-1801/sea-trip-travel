import type { Metadata } from "next";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import Link from "next/link";
import { listDestinations } from "@/server/repo/taxonomy";
import { listPublishedTours } from "@/server/repo/tours";
import { listMedia } from "@/server/repo/media";
import { PageHeader } from "@/components/admin/ui";
import { AdminLoginCard } from "@/components/admin/login-card";
import { ArticleForm } from "../article-form";
import { emptyArticleForm } from "../article-form-model";

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

export const metadata: Metadata = { title: "Thêm bài viết" };

export default async function NewArticlePage() {
  await connection();
  const admin = await getCurrentAdmin();
  if (!admin) return <AdminLoginCard notice="Vui lòng đăng nhập để tiếp tục." />;
  const destinations = listDestinations().map((destination) => ({ id: destination.id, name: destination.name }));
  const tours = listPublishedTours().map((tour) => ({ slug: tour.slug, title: tour.title }));
  const media = listMedia({ limit: 300 }).map((item) => ({ id: item.id, url: item.url, alt: item.altDefault }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Thêm bài viết"
        description="Bài mới mặc định ở trạng thái Nháp — chỉ hiển thị sau khi bạn chọn Xuất bản."
        actions={
          <Link href="/admin/articles" className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground-muted hover:text-primary-strong">
            ← Danh sách bài viết
          </Link>
        }
      />
      <ArticleForm initial={emptyArticleForm()} destinations={destinations} tours={tours} media={media} />
    </div>
  );
}
