import Image from "next/image";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import Link from "next/link";
import type { Metadata } from "next";
import { countTrashedMedia, listMedia } from "@/server/repo/media";
import { AdminCard, EmptyState, PageHeader } from "@/components/admin/ui";
import { AdminLoginCard } from "@/components/admin/login-card";
import { MediaAltForm, MediaDeleteForm, MediaRestoreForm, MediaUploader } from "./media-manager";

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

export const metadata: Metadata = { title: "Thư viện ảnh" };

/**
 * Media library.
 *
 * The 28 approved photographs ship under `public/images/tours` and are registered
 * as `static` rows, so their URLs are shown here unchanged — picking one never
 * rewrites a live URL.
 */
export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; trash?: string }>;
}) {
  await connection();
  const admin = await getCurrentAdmin();
  if (!admin) return <AdminLoginCard notice="Vui lòng đăng nhập để tiếp tục." />;
  const params = await searchParams;
  const query = params.q ?? "";
  const showTrash = params.trash === "1";

  const items = listMedia({ query, includeDeleted: showTrash, storage: "all" }).filter((item) =>
    showTrash ? Boolean(item.deletedAt) : !item.deletedAt,
  );
  const trashedCount = countTrashedMedia();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Thư viện ảnh"
        description="Ảnh tải lên được lưu ngoài cơ sở dữ liệu và phục vụ qua /media. Ảnh có sẵn giữ nguyên đường dẫn /images/… cũ."
        actions={
          <Link
            href={showTrash ? "/admin/media" : "/admin/media?trash=1"}
            className="inline-flex min-h-11 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold"
          >
            {showTrash ? "← Về thư viện" : `Thùng rác (${trashedCount})`}
          </Link>
        }
      />

      {!showTrash ? <MediaUploader /> : null}

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground-muted">Tìm theo tên hoặc alt</span>
          <input
            name="q"
            defaultValue={query}
            className="min-h-11 w-64 rounded-xl border border-border-strong bg-surface px-3.5 text-sm"
          />
        </label>
        <button type="submit" className="inline-flex min-h-11 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold">
          Tìm
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title={showTrash ? "Thùng rác trống" : "Chưa có ảnh nào"}
          description={showTrash ? "Ảnh đã xoá mềm nằm ở đây." : "Tải ảnh lên để bắt đầu xây thư viện."}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <AdminCard className="h-full">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-surface-muted">
                  <Image
                    src={item.url}
                    alt={item.altDefault ?? item.originalName ?? "Ảnh"}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                    unoptimized={item.storage === "static"}
                  />
                </div>
                <div className="mt-3">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.originalName ?? item.filename ?? item.id}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground-subtle">
                    <span>{item.storage === "static" ? "Ảnh có sẵn" : "Ảnh tải lên"}</span>
                    <span>·</span>
                    <span>{Math.max(1, Math.round(item.bytes / 1024))} KB</span>
                    {item.width && item.height ? (
                      <>
                        <span>·</span>
                        <span>
                          {item.width}×{item.height}
                        </span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 break-all text-xs text-foreground-subtle">
                    <code>{item.url}</code>
                  </p>
                </div>

                {item.deletedAt ? (
                  <MediaRestoreForm id={item.id} />
                ) : (
                  <>
                    <MediaAltForm id={item.id} alt={item.altDefault ?? ""} />
                    {item.storage === "upload" ? <MediaDeleteForm id={item.id} url={item.url} /> : null}
                  </>
                )}
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
