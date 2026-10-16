import Link from "next/link";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLead } from "@/server/repo/leads";
import { addLeadNoteAction, deleteLeadNoteAction, updateLeadStatusAction } from "@/server/admin/actions";
import { AdminCard, CodeChip, PageHeader, StatusPill } from "@/components/admin/ui";
import { AdminLoginCard } from "@/components/admin/login-card";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/buttons";

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

export const metadata: Metadata = { title: "Chi tiết yêu cầu" };

const STATUS_LABELS: Record<string, string> = {
  new: "Mới",
  processing: "Đang xử lý",
  done: "Đã xử lý",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-0 sm:flex-row sm:gap-4">
      <dt className="w-48 shrink-0 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const admin = await getCurrentAdmin();
  if (!admin) return <AdminLoginCard notice="Vui lòng đăng nhập để tiếp tục." />;
  const { id } = await params;
  const lead = getLead(id);
  if (!lead) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={lead.fullName}
        description={`Nhận lúc ${new Date(lead.receivedAt).toLocaleString("vi-VN")}`}
        actions={
          <>
            <StatusPill status={lead.status} label={STATUS_LABELS[lead.status] ?? lead.status} />
            <Link href="/admin/leads" className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground-muted hover:text-primary-strong">
              ← Danh sách
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AdminCard className="lg:col-span-2">
          <h2 className="text-lg font-bold text-foreground">Thông tin khách</h2>
          <dl className="mt-4">
            <Row label="Mã yêu cầu">
              <CodeChip>{lead.requestId}</CodeChip>
            </Row>
            <Row label="Họ tên">{lead.fullName}</Row>
            <Row label="Điện thoại">
              <a href={`tel:${lead.phone}`} className="font-semibold text-primary-strong">
                {lead.phone}
              </a>
            </Row>
            <Row label="Email">
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="font-semibold text-primary-strong">
                  {lead.email}
                </a>
              ) : (
                <span className="text-foreground-subtle">Không cung cấp</span>
              )}
            </Row>
            <Row label="Tour quan tâm">
              {lead.tourSlug ? <CodeChip>{lead.tourSlug}</CodeChip> : <span className="text-foreground-subtle">—</span>}
            </Row>
            <Row label="Nội dung khác">{lead.interest ?? <span className="text-foreground-subtle">—</span>}</Row>
            <Row label="Ngày dự kiến">{lead.travelDate ?? <span className="text-foreground-subtle">—</span>}</Row>
            <Row label="Số người">{lead.partySize ?? <span className="text-foreground-subtle">—</span>}</Row>
            <Row label="Lời nhắn">
              {lead.message ? <span className="whitespace-pre-wrap">{lead.message}</span> : <span className="text-foreground-subtle">—</span>}
            </Row>
            <Row label="Trang nguồn">
              {lead.sourcePage ? <span className="break-all text-xs">{lead.sourcePage}</span> : <span className="text-foreground-subtle">—</span>}
            </Row>
            <Row label="Ngôn ngữ">{lead.locale === "en" ? "Tiếng Anh" : "Tiếng Việt"}</Row>
            <Row label="Nguồn (UTM)">
              {lead.utm && Object.keys(lead.utm).length > 0 ? (
                <span className="text-xs">{Object.entries(lead.utm).map(([k, v]) => `${k}=${v}`).join(" · ")}</span>
              ) : (
                <span className="text-foreground-subtle">—</span>
              )}
            </Row>
          </dl>
        </AdminCard>

        <div className="flex flex-col gap-6">
          <AdminCard>
            <h2 className="text-lg font-bold text-foreground">Trạng thái xử lý</h2>
            <div className="mt-4 flex flex-col gap-2">
              {(["new", "processing", "done"] as const).map((status) => (
                <form key={status} action={updateLeadStatusAction}>
                  <input type="hidden" name="requestId" value={lead.requestId} />
                  <input type="hidden" name="status" value={status} />
                  <SubmitButton
                    variant={lead.status === status ? "primary" : "secondary"}
                    className="w-full"
                  >
                    {STATUS_LABELS[status]}
                  </SubmitButton>
                </form>
              ))}
            </div>
          </AdminCard>

          <AdminCard>
            <h2 className="text-lg font-bold text-foreground">Ghi chú nội bộ</h2>
            <form action={addLeadNoteAction} className="mt-4 flex flex-col gap-3">
              <input type="hidden" name="requestId" value={lead.requestId} />
              <textarea
                name="body"
                rows={3}
                required
                placeholder="Đã gọi lúc 10h, khách cân nhắc…"
                className="w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-sm"
              />
              <SubmitButton variant="secondary">Thêm ghi chú</SubmitButton>
            </form>

            {lead.notes.length > 0 ? (
              <ul className="mt-5 divide-y divide-border border-t border-border">
                {lead.notes.map((note) => (
                  <li key={note.id} className="py-3">
                    <p className="whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-foreground-subtle">
                        {new Date(note.createdAt).toLocaleString("vi-VN")}
                      </span>
                      <form action={deleteLeadNoteAction}>
                        <input type="hidden" name="requestId" value={lead.requestId} />
                        <input type="hidden" name="noteId" value={note.id} />
                        <ConfirmSubmit message="Xoá ghi chú này?" className="min-h-7 px-2 text-xs">
                          Xoá
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-foreground-muted">Chưa có ghi chú.</p>
            )}
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
