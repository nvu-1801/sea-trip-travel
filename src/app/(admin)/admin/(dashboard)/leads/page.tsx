import Link from "next/link";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import type { Metadata } from "next";
import { countLeads, listLeads, type LeadListOptions } from "@/server/repo/leads";
import { EmptyState, PageHeader, StatusPill } from "@/components/admin/ui";
import { AdminLoginCard } from "@/components/admin/login-card";

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

export const metadata: Metadata = { title: "Yêu cầu tư vấn" };

const STATUS_LABELS: Record<string, string> = {
  new: "Mới",
  processing: "Đang xử lý",
  done: "Đã xử lý",
};

const EMAIL_STATUS_LABELS: Record<string, string> = {
  pending: "chờ gửi email",
  sent: "đã gửi email",
  failed: "email lỗi",
  not_configured: "email chưa cấu hình",
};

/** Partially mask a phone number in a list view; the detail page shows it in full. */
function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const head = user.slice(0, 2);
  return `${head}***@${domain}`;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await connection();
  const admin = await getCurrentAdmin();
  if (!admin) return <AdminLoginCard notice="Vui lòng đăng nhập để tiếp tục." />;
  const params = await searchParams;
  const status = (params.status as LeadListOptions["status"]) ?? "all";
  const query = params.q ?? "";

  const leads = listLeads({ status, query, limit: 100 });
  const counts = {
    all: countLeads({}),
    new: countLeads({ status: "new" }),
    processing: countLeads({ status: "processing" }),
    done: countLeads({ status: "done" }),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Yêu cầu tư vấn"
        description="Khách gửi từ form trên website. Dữ liệu lưu thật trong cơ sở dữ liệu; email chỉ là thông báo phụ."
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground-muted">Tìm kiếm</span>
          <input
            name="q"
            defaultValue={query}
            placeholder="Tên, số điện thoại, mã yêu cầu"
            className="min-h-11 w-64 rounded-xl border border-border-strong bg-surface px-3.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground-muted">Trạng thái</span>
          <select name="status" defaultValue={status} className="min-h-11 rounded-xl border border-border-strong bg-surface px-3.5 text-sm">
            <option value="all">Tất cả ({counts.all})</option>
            <option value="new">Mới ({counts.new})</option>
            <option value="processing">Đang xử lý ({counts.processing})</option>
            <option value="done">Đã xử lý ({counts.done})</option>
          </select>
        </label>
        <button type="submit" className="inline-flex min-h-11 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold">
          Lọc
        </button>
        {query || status !== "all" ? (
          <Link href="/admin/leads" className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground-muted hover:text-primary-strong">
            Xoá bộ lọc
          </Link>
        ) : null}
      </form>

      {leads.length === 0 ? (
        <EmptyState
          title="Chưa có yêu cầu nào"
          description="Khi khách gửi form tư vấn trên website, yêu cầu sẽ xuất hiện ở đây."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-foreground-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Khách</th>
                <th className="px-4 py-3 font-semibold">Liên hệ</th>
                <th className="px-4 py-3 font-semibold">Quan tâm</th>
                <th className="px-4 py-3 font-semibold">Thời gian</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((lead) => (
                <tr key={lead.requestId} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`/admin/leads/${lead.requestId}`} className="font-semibold text-foreground hover:text-primary-strong">
                      {lead.fullName}
                    </Link>
                    <p className="mt-1 font-mono text-xs text-foreground-subtle">{lead.requestId}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">
                    <p>{maskPhone(lead.phone)}</p>
                    {lead.email ? <p className="text-xs">{maskEmail(lead.email)}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {lead.tourSlug ? <p className="text-xs">{lead.tourSlug}</p> : null}
                    {lead.interest ? <p className="text-xs">{lead.interest}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">
                    <p>{new Date(lead.receivedAt).toLocaleString("vi-VN")}</p>
                    <p className="text-xs text-foreground-subtle">
                      {EMAIL_STATUS_LABELS[lead.emailStatus] ?? lead.emailStatus}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={lead.status} label={STATUS_LABELS[lead.status] ?? lead.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
