import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import { AdminLoginCard } from "@/components/admin/login-card";
import { countTrashedArticles, listTrashedArticles } from "@/server/repo/articles";
import { countTrashedLeads, listTrashedLeads } from "@/server/repo/leads";
import { countTrashedMedia, listTrashedMedia } from "@/server/repo/media";
import { countTrashedTours, listTrashedTours } from "@/server/repo/tours";
import {
  restoreArticleAction,
  restoreLeadAction,
  restoreMediaAction,
  restoreTourAction,
} from "@/server/admin/actions";
import { AdminCard, CodeChip, EmptyState, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";

export const metadata: Metadata = { title: "Thùng rác" };

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

function formatWhen(value: string | null): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

function RestoreForm({ action, field, id }: { action: (formData: FormData) => void | Promise<void>; field: string; id: string }) {
  return (
    <form action={action}>
      <input type="hidden" name={field} value={id} />
      <SubmitButton variant="secondary" className="min-h-9 px-3 text-xs" pendingLabel="Đang khôi phục…">
        Khôi phục
      </SubmitButton>
    </form>
  );
}

/**
 * Unified trash.
 *
 * Every delete in the admin is a soft delete, so nothing is lost by accident:
 * tours (including the imported ST programmes), articles, media and consultation
 * requests all land here and can be restored.
 */
export default async function TrashPage() {
  await connection();
  const admin = await getCurrentAdmin();
  if (!admin) return <AdminLoginCard notice="Vui lòng đăng nhập để tiếp tục." />;

  const tours = listTrashedTours();
  const articles = listTrashedArticles();
  const media = listTrashedMedia();
  const leads = listTrashedLeads();
  const total =
    countTrashedTours() + countTrashedArticles() + countTrashedMedia() + countTrashedLeads();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Thùng rác"
        description="Mọi thao tác xoá trong khu quản trị đều là xoá mềm. Nội dung ở đây vẫn nằm trong cơ sở dữ liệu và có thể khôi phục bất cứ lúc nào."
      />

      {total === 0 ? (
        <EmptyState
          title="Thùng rác trống"
          description="Khi bạn xoá tour, bài viết, ảnh hoặc yêu cầu tư vấn, chúng sẽ được chuyển vào đây thay vì bị xoá vĩnh viễn."
        />
      ) : null}

      {/* --- Tours ---------------------------------------------------------- */}
      {tours.length > 0 ? (
        <AdminCard>
          <h2 className="text-lg font-bold text-foreground">Tour ({tours.length})</h2>
          <ul className="mt-4 divide-y divide-border">
            {tours.map((record) => (
              <li key={record.tour.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{record.tour.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {record.tour.tourCode ? <CodeChip>{record.tour.tourCode}</CodeChip> : null}
                    <CodeChip>{record.tour.slug}</CodeChip>
                    <span className="text-xs text-foreground-subtle">
                      xoá {formatWhen(record.deletedAt)} · {record.status === "published" ? "đã xuất bản" : record.status}
                    </span>
                  </div>
                </div>
                <RestoreForm action={restoreTourAction} field="id" id={record.tour.id} />
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      {/* --- Articles ------------------------------------------------------- */}
      {articles.length > 0 ? (
        <AdminCard>
          <h2 className="text-lg font-bold text-foreground">Bài viết ({articles.length})</h2>
          <ul className="mt-4 divide-y divide-border">
            {articles.map((record) => (
              <li key={record.article.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{record.article.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <CodeChip>{record.article.slug}</CodeChip>
                    <span className="text-xs text-foreground-subtle">xoá {formatWhen(record.deletedAt)}</span>
                  </div>
                </div>
                <RestoreForm action={restoreArticleAction} field="id" id={record.article.id} />
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      {/* --- Media ---------------------------------------------------------- */}
      {media.length > 0 ? (
        <AdminCard>
          <h2 className="text-lg font-bold text-foreground">Ảnh ({media.length})</h2>
          <ul className="mt-4 divide-y divide-border">
            {media.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.originalName ?? item.filename ?? item.id}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <CodeChip>{item.url}</CodeChip>
                    <span className="text-xs text-foreground-subtle">xoá {formatWhen(item.deletedAt)}</span>
                  </div>
                </div>
                <RestoreForm action={restoreMediaAction} field="id" id={item.id} />
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      {/* --- Leads ---------------------------------------------------------- */}
      {leads.length > 0 ? (
        <AdminCard>
          <h2 className="text-lg font-bold text-foreground">Yêu cầu tư vấn ({leads.length})</h2>
          <ul className="mt-4 divide-y divide-border">
            {leads.map((lead) => (
              <li key={lead.requestId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{lead.fullName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <CodeChip>{lead.requestId}</CodeChip>
                    <span className="text-xs text-foreground-subtle">
                      nhận {formatWhen(lead.receivedAt)}
                    </span>
                  </div>
                </div>
                <RestoreForm action={restoreLeadAction} field="requestId" id={lead.requestId} />
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      <AdminCard>
        <p className="text-xs leading-relaxed text-foreground-subtle">
          Nội dung đã xoá mềm <strong>không</strong> xuất hiện trên website, trong API công khai hay
          trong sitemap. Việc xoá vĩnh viễn chưa được mở trong phiên bản này — cần khôi phục thì bấm
          nút bên cạnh.
        </p>
      </AdminCard>

      <p className="text-xs text-foreground-subtle">
        <Link href="/admin/tours" className="font-semibold text-primary-strong hover:underline">
          ← Về danh sách tour
        </Link>
      </p>
    </div>
  );
}
