import Link from "next/link";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import type { Metadata } from "next";
import {
  listTourRecords,
  listTrashedTours,
  type TourListOptions,
} from "@/server/repo/tours";
import { listCategories } from "@/server/repo/taxonomy";
import {
  deleteTourAction,
  restoreTourAction,
  setTourStatusAction,
  toggleTourFeaturedAction,
} from "@/server/admin/actions";
import { AdminCard, CodeChip, EmptyState, PageHeader, StatusPill } from "@/components/admin/ui";
import { AdminLoginCard } from "@/components/admin/login-card";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/buttons";
import { tourHasPrice } from "./tour-list-model";

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

export const metadata: Metadata = { title: "Tour" };

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  published: "Đã xuất bản",
  hidden: "Đang ẩn",
};

/**
 * Tour list with search and status filters.
 *
 * Filters live in the URL, so a filtered view is linkable and the back button
 * behaves. Trashed tours are listed separately with a restore action.
 */
export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; trash?: string }>;
}) {
  await connection();
  const admin = await getCurrentAdmin();
  if (!admin) return <AdminLoginCard notice="Vui lòng đăng nhập để tiếp tục." />;
  const params = await searchParams;
  const status = (params.status as TourListOptions["status"]) ?? "all";
  const query = params.q ?? "";
  const showTrash = params.trash === "1";

  const records = showTrash
    ? listTrashedTours()
    : listTourRecords({ status, query });
  const categories = listCategories();
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? id;

  const counts = {
    all: listTourRecords({ status: "all" }).length,
    published: listTourRecords({ status: "published" }).length,
    draft: listTourRecords({ status: "draft" }).length,
    hidden: listTourRecords({ status: "hidden" }).length,
  };
  const trashed = listTrashedTours();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tour"
        description="Thêm, sửa, xuất bản hoặc ẩn tour. Giá chưa có sẽ hiển thị “Liên tư vấn”."
        actions={
          <Link
            href="/admin/tours/new"
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-strong-hover"
          >
            + Thêm tour
          </Link>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground-muted">Tìm kiếm</span>
          <input
            name="q"
            defaultValue={query}
            placeholder="Tên hoặc slug"
            className="min-h-11 w-56 rounded-xl border border-border-strong bg-surface px-3.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground-muted">Trạng thái</span>
          <select
            name="status"
            defaultValue={status}
            className="min-h-11 rounded-xl border border-border-strong bg-surface px-3.5 text-sm"
          >
            <option value="all">Tất cả ({counts.all})</option>
            <option value="published">Đã xuất bản ({counts.published})</option>
            <option value="draft">Nháp ({counts.draft})</option>
            <option value="hidden">Đang ẩn ({counts.hidden})</option>
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold"
        >
          Lọc
        </button>
        {query || status !== "all" ? (
          <Link href="/admin/tours" className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground-muted hover:text-primary-strong">
            Xoá bộ lọc
          </Link>
        ) : null}
        <Link
          href={showTrash ? "/admin/tours" : "/admin/tours?trash=1"}
          className="ml-auto inline-flex min-h-11 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold"
        >
          {showTrash ? "← Về danh sách" : `Thùng rác (${trashed.length})`}
        </Link>
      </form>

      {records.length === 0 ? (
        <EmptyState
          title={showTrash ? "Thùng rác trống" : "Không có tour nào khớp"}
          description={
            showTrash
              ? "Các tour đã xoá mềm sẽ nằm ở đây và có thể khôi phục."
              : "Thử xoá bộ lọc, hoặc thêm tour mới."
          }
          action={
            showTrash ? undefined : (
              <Link href="/admin/tours/new" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">
                + Thêm tour
              </Link>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-foreground-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Tour</th>
                <th className="px-4 py-3 font-semibold">Danh mục</th>
                <th className="px-4 py-3 font-semibold">Giá</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((record) => (
                <tr key={record.tour.id} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`/admin/tours/${record.tour.id}`} className="font-semibold text-foreground hover:text-primary-strong">
                      {record.tour.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <CodeChip>{record.tour.slug}</CodeChip>
                      {record.tour.tourCode ? <CodeChip>{record.tour.tourCode}</CodeChip> : null}
                      {record.featured ? <span className="text-xs font-semibold text-primary-strong">★ Nổi bật</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {record.tour.categoryIds.map((id) => categoryName(id)).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    {tourHasPrice(record.tour) ? (
                      <span className="font-semibold text-foreground">
                        Từ {record.tour.priceFrom!.amount.toLocaleString("vi-VN")} ₫
                      </span>
                    ) : (
                      <span className="text-foreground-muted">Liên hệ tư vấn</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={record.status} label={STATUS_LABELS[record.status] ?? record.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {showTrash ? (
                        <form action={restoreTourAction}>
                          <input type="hidden" name="id" value={record.tour.id} />
                          <SubmitButton variant="secondary" className="min-h-9 px-3 text-xs">
                            Khôi phục
                          </SubmitButton>
                        </form>
                      ) : (
                        <>
                          <Link
                            href={`/admin/tours/${record.tour.id}`}
                            className="inline-flex min-h-9 items-center rounded-lg border border-border-strong bg-surface px-3 text-xs font-semibold"
                          >
                            Sửa
                          </Link>
                          {record.status !== "published" ? (
                            <form action={setTourStatusAction}>
                              <input type="hidden" name="id" value={record.tour.id} />
                              <input type="hidden" name="status" value="published" />
                              <SubmitButton variant="secondary" className="min-h-9 px-3 text-xs">
                                Xuất bản
                              </SubmitButton>
                            </form>
                          ) : (
                            <form action={setTourStatusAction}>
                              <input type="hidden" name="id" value={record.tour.id} />
                              <input type="hidden" name="status" value="hidden" />
                              <SubmitButton variant="secondary" className="min-h-9 px-3 text-xs">
                                Ẩn
                              </SubmitButton>
                            </form>
                          )}
                          <form action={toggleTourFeaturedAction}>
                            <input type="hidden" name="id" value={record.tour.id} />
                            <SubmitButton variant="ghost" className="min-h-9 px-3 text-xs">
                              {record.featured ? "Bỏ ghim" : "Ghim"}
                            </SubmitButton>
                          </form>
                          <form action={deleteTourAction}>
                            <input type="hidden" name="id" value={record.tour.id} />
                            <ConfirmSubmit
                              message={`Chuyển tour “${record.tour.title}” vào thùng rác?`}
                              className="min-h-9 px-3 text-xs"
                            >
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

      {!showTrash ? (
        <AdminCard>
          <p className="text-xs leading-relaxed text-foreground-subtle">
            Xoá là <strong>xóa mềm</strong>: tour được chuyển vào thùng rác và có thể khôi phục. Không xoá vĩnh viễn ở
            bước này. Danh mục hiển thị theo mã định danh nếu chưa có tên.
          </p>
        </AdminCard>
      ) : null}
    </div>
  );
}
