import Link from "next/link";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import type { Metadata } from "next";
import {
  countTrashedArticles,
  listArticleRecords,
  listTrashedArticles,
  type ArticleListOptions,
} from "@/server/repo/articles";
import {
  deleteArticleAction,
  restoreArticleAction,
  setArticleStatusAction,
  toggleArticleFeaturedAction,
} from "@/server/admin/actions";
import { AdminCard, CodeChip, EmptyState, PageHeader, StatusPill } from "@/components/admin/ui";
import { AdminLoginCard } from "@/components/admin/login-card";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/buttons";

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

export const metadata: Metadata = { title: "Bài viết" };

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  published: "Đã xuất bản",
  hidden: "Đang ẩn",
};

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; trash?: string }>;
}) {
  await connection();
  const admin = await getCurrentAdmin();
  if (!admin) return <AdminLoginCard notice="Vui lòng đăng nhập để tiếp tục." />;
  const params = await searchParams;
  const status = (params.status as ArticleListOptions["status"]) ?? "all";
  const query = params.q ?? "";
  const showTrash = params.trash === "1";

  const records = showTrash ? listTrashedArticles() : listArticleRecords({ status, query });
  const trashedCount = countTrashedArticles();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bài viết"
        description="Cẩm nang du lịch. Bài ở trạng thái Nháp không xuất hiện trên website hoặc API công khai."
        actions={
          <Link
            href="/admin/articles/new"
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-strong-hover"
          >
            + Thêm bài viết
          </Link>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground-muted">Tìm kiếm</span>
          <input
            name="q"
            defaultValue={query}
            placeholder="Tiêu đề hoặc slug"
            className="min-h-11 w-56 rounded-xl border border-border-strong bg-surface px-3.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground-muted">Trạng thái</span>
          <select name="status" defaultValue={status} className="min-h-11 rounded-xl border border-border-strong bg-surface px-3.5 text-sm">
            <option value="all">Tất cả</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Nháp</option>
            <option value="hidden">Đang ẩn</option>
          </select>
        </label>
        <button type="submit" className="inline-flex min-h-11 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold">
          Lọc
        </button>
        {query || status !== "all" ? (
          <Link href="/admin/articles" className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground-muted hover:text-primary-strong">
            Xoá bộ lọc
          </Link>
        ) : null}
        <Link
          href={showTrash ? "/admin/articles" : "/admin/articles?trash=1"}
          className="ml-auto inline-flex min-h-11 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold"
        >
          {showTrash ? "← Về danh sách" : `Thùng rác (${trashedCount})`}
        </Link>
      </form>

      {records.length === 0 ? (
        <EmptyState
          title={showTrash ? "Thùng rác trống" : "Không có bài viết nào khớp"}
          description={showTrash ? "Bài viết đã xoá mềm nằm ở đây và có thể khôi phục." : "Thử xoá bộ lọc, hoặc thêm bài mới."}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-foreground-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Bài viết</th>
                <th className="px-4 py-3 font-semibold">Ngày đăng</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((record) => (
                <tr key={record.article.id} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`/admin/articles/${record.article.id}`} className="font-semibold text-foreground hover:text-primary-strong">
                      {record.article.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <CodeChip>{record.article.slug}</CodeChip>
                      {record.featured ? <span className="text-xs font-semibold text-primary-strong">★ Nổi bật</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">{record.article.publishedAt}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={record.status} label={STATUS_LABELS[record.status] ?? record.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {showTrash ? (
                        <form action={restoreArticleAction}>
                          <input type="hidden" name="id" value={record.article.id} />
                          <SubmitButton variant="secondary" className="min-h-9 px-3 text-xs">
                            Khôi phục
                          </SubmitButton>
                        </form>
                      ) : (
                        <>
                          <Link
                            href={`/admin/articles/${record.article.id}`}
                            className="inline-flex min-h-9 items-center rounded-lg border border-border-strong bg-surface px-3 text-xs font-semibold"
                          >
                            Sửa
                          </Link>
                          <form action={setArticleStatusAction}>
                            <input type="hidden" name="id" value={record.article.id} />
                            <input type="hidden" name="status" value={record.status === "published" ? "hidden" : "published"} />
                            <SubmitButton variant="secondary" className="min-h-9 px-3 text-xs">
                              {record.status === "published" ? "Ẩn" : "Xuất bản"}
                            </SubmitButton>
                          </form>
                          <form action={toggleArticleFeaturedAction}>
                            <input type="hidden" name="id" value={record.article.id} />
                            <SubmitButton variant="ghost" className="min-h-9 px-3 text-xs">
                              {record.featured ? "Bỏ ghim" : "Ghim"}
                            </SubmitButton>
                          </form>
                          <form action={deleteArticleAction}>
                            <input type="hidden" name="id" value={record.article.id} />
                            <ConfirmSubmit message={`Chuyển bài “${record.article.title}” vào thùng rác?`} className="min-h-9 px-3 text-xs">
                              Xoá
                            </ConfirmSubmit>
                          </form>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminCard>
        <p className="text-xs leading-relaxed text-foreground-subtle">
          Xoá là xóa mềm và có thể khôi phục. Chỉ bài <strong>Đã xuất bản</strong> mới xuất hiện trên website và trong API
          nội dung công khai.
        </p>
      </AdminCard>
    </div>
  );
}
