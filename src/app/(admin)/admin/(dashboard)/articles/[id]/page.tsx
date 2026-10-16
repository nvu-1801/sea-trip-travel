import type { Metadata } from "next";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleRecordById } from "@/server/repo/articles";
import { listDestinations } from "@/server/repo/taxonomy";
import { listPublishedTours } from "@/server/repo/tours";
import { listMedia } from "@/server/repo/media";
import { PageHeader, StatusPill } from "@/components/admin/ui";
import { AdminLoginCard } from "@/components/admin/login-card";
import { ArticleForm } from "../article-form";
import { articleToFormState } from "../article-form-model";

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

export const metadata: Metadata = { title: "Sửa bài viết" };

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await connection();
  const admin = await getCurrentAdmin();
  if (!admin) return <AdminLoginCard notice="Vui lòng đăng nhập để tiếp tục." />;
  const { id } = await params;
  const { saved } = await searchParams;
  const record = getArticleRecordById(id);
  if (!record || record.deletedAt) notFound();

  const destinations = listDestinations().map((destination) => ({ id: destination.id, name: destination.name }));
  const tours = listPublishedTours().map((tour) => ({ slug: tour.slug, title: tour.title }));
  const media = listMedia({ limit: 300 }).map((item) => ({ id: item.id, url: item.url, alt: item.altDefault }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={record.article.title}
        description={`Cập nhật lần cuối ${new Date(record.recordUpdatedAt).toLocaleString("vi-VN")}`}
        actions={
          <>
            <StatusPill
              status={record.status}
              label={record.status === "published" ? "Đã xuất bản" : record.status === "hidden" ? "Đang ẩn" : "Nháp"}
            />
            <Link href="/admin/articles" className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground-muted hover:text-primary-strong">
              ← Danh sách bài viết
            </Link>
          </>
        }
      />
      <ArticleForm
        initial={articleToFormState(record)}
        destinations={destinations}
        tours={tours}
        media={media}
        saved={saved === "1"}
      />
    </div>
  );
}
