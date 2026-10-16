import type { Metadata } from "next";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTourRecordById } from "@/server/repo/tours";
import { listCategories, listDestinations } from "@/server/repo/taxonomy";
import { listMedia } from "@/server/repo/media";
import { PageHeader, StatusPill } from "@/components/admin/ui";
import { AdminLoginCard } from "@/components/admin/login-card";
import { TourForm } from "../tour-form";
import { tourToFormState } from "../tour-form-model";

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

export const metadata: Metadata = { title: "Sửa tour" };

export default async function EditTourPage({
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
  const record = getTourRecordById(id);
  if (!record || record.deletedAt) notFound();

  const categories = listCategories().map((category) => ({ id: category.id, name: category.name }));
  const destinations = listDestinations().map((destination) => ({
    id: destination.id,
    name: destination.name,
  }));
  const media = listMedia({ limit: 300 }).map((item) => ({
    id: item.id,
    url: item.url,
    alt: item.altDefault,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={record.tour.title}
        description={`Cập nhật lần cuối ${new Date(record.tour.updatedAt).toLocaleString("vi-VN")}`}
        actions={
          <>
            <StatusPill
              status={record.status}
              label={record.status === "published" ? "Đã xuất bản" : record.status === "hidden" ? "Đang ẩn" : "Nháp"}
            />
            <Link href="/admin/tours" className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground-muted hover:text-primary-strong">
              ← Danh sách tour
            </Link>
          </>
        }
      />
      <TourForm
        initial={tourToFormState(record)}
        categories={categories}
        destinations={destinations}
        media={media}
        saved={saved === "1"}
      />
    </div>
  );
}
