"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  adminArticlePayloadSchema,
  adminTourPayloadSchema,
  changePasswordFormSchema,
  leadStatusSchema,
  loginFormSchema,
  type AdminArticlePayload,
  type AdminTourPayload,
} from "@/domain/admin";
import { SITE_SETTING_KEYS, type SiteSettingKey } from "@/domain/settings";
import type { ArticleBlock } from "@/domain/article";
import type { Tour } from "@/domain/tour";
import { newId, nowIso } from "@/server/db/json";
import { CONTENT_TAG } from "@/lib/data/snapshot";
import { changePassword, getCurrentAdmin, login, logout } from "@/server/auth/session";
import {
  getTourRecordById,
  listPublishedTours,
  nextTourSortOrder,
  restoreTour,
  saveTour,
  setTourFlags,
  setTourStatus,
  softDeleteTour,
  tourSlugExists,
} from "@/server/repo/tours";
import {
  articleSlugExists,
  getArticleRecordById,
  nextArticleSortOrder,
  restoreArticle,
  saveArticle,
  setArticleFlags,
  setArticleStatus,
  softDeleteArticle,
} from "@/server/repo/articles";
import {
  getMedia,
  listMedia,
  mediaReferences,
  restoreMedia,
  setMediaAlt,
  softDeleteMedia,
} from "@/server/repo/media";
import { addLeadNote, deleteLeadNote, updateLeadStatus } from "@/server/repo/leads";
import { saveSettingSection } from "@/server/repo/settings";
import { recordAudit } from "@/server/repo/admin";
import { fieldErrorsFrom, type ActionState } from "./action-state";

/**
 * Admin mutations.
 *
 * Every exported function re-checks the session: a Server Action is a public
 * POST endpoint, so "the UI only shows it to the admin" is not authorisation.
 * After any write that changes public content we expire the `content` cache tag,
 * which is the single invalidation rule the whole site relies on.
 */

/* --- Shared helpers ------------------------------------------------------- */

async function requireAdminOrRedirect() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Expire the public content cache so the landing page reflects the change. */
function refreshContent(): void {
  try {
    updateTag(CONTENT_TAG);
  } catch {
    // `updateTag` is a no-op outside a request context.
  }
}

function jsonField<T>(form: FormData, key: string): T | null {
  const raw = form.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function text(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

/* --- Auth ----------------------------------------------------------------- */

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginFormSchema.safeParse({
    username: form.get("username"),
    password: form.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Vui lòng kiểm tra thông tin đăng nhập.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const result = await login(parsed.data.username, parsed.data.password, {
    userAgent: form.get("userAgent")?.toString(),
    ip: (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, message: "Đăng nhập thành công." };
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdminOrRedirect();
  const parsed = changePasswordFormSchema.safeParse({
    currentPassword: form.get("currentPassword"),
    nextPassword: form.get("nextPassword"),
    confirmPassword: form.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Vui lòng kiểm tra các trường.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  if (parsed.data.nextPassword !== parsed.data.confirmPassword) {
    return { ok: false, message: "Hai lần nhập mật khẩu mới không khớp.", fieldErrors: { confirmPassword: ["Không khớp"] } };
  }
  try {
    await changePassword(admin, parsed.data.currentPassword, parsed.data.nextPassword);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không đổi được mật khẩu.";
    return { ok: false, message };
  }
  recordAudit({ actor: admin.username, action: "password.change", entity: "admin_user", entityId: admin.id });
  return { ok: true, message: "Đã đổi mật khẩu. Các phiên đăng nhập khác đã bị thu hồi." };
}

/* --- Tours ---------------------------------------------------------------- */

function uniqueSlug(base: string, fallback: string): string {
  return base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

function buildTour(payload: AdminTourPayload, id: string): Tour {
  const minAdult = payload.pricingOptions.length
    ? Math.min(...payload.pricingOptions.map((option) => option.adultPrice))
    : null;

  return {
    id,
    slug: payload.slug,
    title: payload.title,
    summary: payload.summary,
    categoryIds: payload.categoryIds,
    destinationIds: payload.destinationIds,
    duration: { days: payload.durationDays, nights: payload.durationNights },
    departurePoints: payload.departurePoints,
    returnPoints: payload.returnPoints,
    transport: payload.transport,
    tourCode: payload.tourCode,
    sourceDocuments: [],
    pricingOptions: payload.pricingOptions.map((option, index) => ({
      id: option.id ?? `pkg_${index + 1}`,
      label: option.label,
      accommodationClass: option.accommodationClass,
      adultPrice: option.adultPrice,
      childPrice: option.childPrice,
      surcharge: option.surcharge,
      validFrom: option.validFrom,
      validTo: option.validTo,
      note: option.note,
    })),
    gifts: payload.gifts,
    // A tour with no published package is "Liên hệ tư vấn" — never 0 ₫.
    priceFrom: minAdult === null ? null : { amount: minAdult, currency: "VND" },
    priceNote: payload.priceNote,
    highlights: payload.highlights,
    images: payload.images,
    overview: payload.overview,
    itinerary: payload.itinerary.map((day, index) => ({
      id: newId(`day${index + 1}`),
      index: index + 1,
      title: day.title,
      summary: day.summary,
      activities: day.activities,
      meals: day.meals,
      places: day.places,
      accommodation: day.accommodation,
    })),
    included: payload.included,
    excluded: payload.excluded,
    notes: payload.notes,
    policies: payload.policies,
    tags: payload.tags,
    seo:
      payload.seoTitle || payload.seoDescription || payload.seoOgImage
        ? { title: payload.seoTitle, description: payload.seoDescription, ogImage: payload.seoOgImage }
        : undefined,
    contentStatus: payload.contentStatus,
    updatedAt: nowIso(),
  };
}

export async function saveTourAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdminOrRedirect();
  const raw = jsonField<Record<string, unknown>>(form, "payload");
  if (!raw) return { ok: false, message: "Không đọc được dữ liệu biểu mẫu." };

  const parsed = adminTourPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  const payload = parsed.data;

  const existing = payload.id ? getTourRecordById(payload.id) : undefined;
  if (!existing && payload.id) return { ok: false, message: "Tour không tồn tại." };

  const id = existing?.tour.id ?? newId("tour");
  const slug = existing ? payload.slug : uniqueSlug(payload.slug, id);
  if (tourSlugExists(slug, existing?.tour.id)) {
    return { ok: false, message: `Slug "${slug}" đã được dùng cho tour khác.`, fieldErrors: { slug: ["Slug đã tồn tại"] } };
  }

  let saved;
  try {
    saved = saveTour({
      tour: buildTour({ ...payload, slug }, id),
      status: payload.status,
      featured: payload.featured,
      sortOrder: payload.sortOrder || existing?.sortOrder || nextTourSortOrder(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không lưu được tour.";
    return { ok: false, message };
  }

  recordAudit({
    actor: admin.username,
    action: existing ? "tour.update" : "tour.create",
    entity: "tour",
    entityId: saved.tour.id,
    summary: saved.tour.title,
  });
  refreshContent();
  revalidatePath("/admin/tours");
  redirect(`/admin/tours/${saved.tour.id}?saved=1`);
}

export type TourListFilters = { status?: string; q?: string; category?: string };

export async function setTourStatusAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = text(form, "id");
  const status = text(form, "status") as "draft" | "published" | "hidden";
  if (!id || !["draft", "published", "hidden"].includes(status)) return;
  setTourStatus(id, status);
  refreshContent();
  revalidatePath("/admin/tours");
}

export async function toggleTourFeaturedAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = text(form, "id");
  const record = getTourRecordById(id);
  if (!record) return;
  setTourFlags(id, { featured: !record.featured });
  refreshContent();
  revalidatePath("/admin/tours");
}

export async function setTourOrderAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = text(form, "id");
  const order = Number(text(form, "sortOrder"));
  if (!id || !Number.isFinite(order)) return;
  setTourFlags(id, { sortOrder: order });
  refreshContent();
  revalidatePath("/admin/tours");
}

export async function deleteTourAction(form: FormData): Promise<void> {
  const admin = await requireAdminOrRedirect();
  const id = text(form, "id");
  if (!id) return;
  softDeleteTour(id);
  recordAudit({ actor: admin.username, action: "tour.trash", entity: "tour", entityId: id });
  refreshContent();
  revalidatePath("/admin/tours");
}

export async function restoreTourAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = text(form, "id");
  if (!id) return;
  restoreTour(id);
  refreshContent();
  revalidatePath("/admin/tours");
}

/* --- Articles ------------------------------------------------------------- */

function buildArticle(payload: AdminArticlePayload, id: string) {
  return {
    id,
    slug: payload.slug,
    title: payload.title,
    excerpt: payload.excerpt,
    destinationIds: payload.destinationIds,
    relatedTourSlugs: payload.relatedTourSlugs,
    tags: payload.tags,
    readingMinutes: payload.readingMinutes,
    cover: payload.coverSrc
      ? { src: payload.coverSrc, alt: payload.coverAlt ?? payload.title }
      : undefined,
    body: payload.body as ArticleBlock[],
    author: payload.author,
    publishedAt: payload.publishedAt,
    updatedAt: payload.updatedAt,
    featured: payload.featured,
    seo:
      payload.seoTitle || payload.seoDescription || payload.seoOgImage
        ? { title: payload.seoTitle, description: payload.seoDescription, ogImage: payload.seoOgImage }
        : undefined,
    contentStatus: payload.contentStatus,
  };
}

export async function saveArticleAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdminOrRedirect();
  const raw = jsonField<Record<string, unknown>>(form, "payload");
  if (!raw) return { ok: false, message: "Không đọc được dữ liệu biểu mẫu." };

  const parsed = adminArticlePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }
  const payload = parsed.data;
  const existing = payload.id ? getArticleRecordById(payload.id) : undefined;
  if (!existing && payload.id) return { ok: false, message: "Bài viết không tồn tại." };

  const id = existing?.article.id ?? newId("art");
  const slug = existing ? payload.slug : uniqueSlug(payload.slug, id);
  if (articleSlugExists(slug, existing?.article.id)) {
    return { ok: false, message: `Slug "${slug}" đã được dùng cho bài viết khác.`, fieldErrors: { slug: ["Slug đã tồn tại"] } };
  }

  try {
    saveArticle({
      article: buildArticle({ ...payload, slug }, id),
      status: payload.status,
      featured: payload.featured,
      sortOrder: payload.sortOrder || existing?.sortOrder || nextArticleSortOrder(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không lưu được bài viết.";
    return { ok: false, message };
  }

  recordAudit({
    actor: admin.username,
    action: existing ? "article.update" : "article.create",
    entity: "article",
    entityId: id,
    summary: payload.title,
  });
  refreshContent();
  revalidatePath("/admin/articles");
  redirect(`/admin/articles/${id}?saved=1`);
}

export async function setArticleStatusAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = text(form, "id");
  const status = text(form, "status") as "draft" | "published" | "hidden";
  if (!id || !["draft", "published", "hidden"].includes(status)) return;
  setArticleStatus(id, status);
  refreshContent();
  revalidatePath("/admin/articles");
}

export async function toggleArticleFeaturedAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = text(form, "id");
  const record = getArticleRecordById(id);
  if (!record) return;
  setArticleFlags(id, { featured: !record.featured });
  refreshContent();
  revalidatePath("/admin/articles");
}

export async function setArticleOrderAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = text(form, "id");
  const order = Number(text(form, "sortOrder"));
  if (!id || !Number.isFinite(order)) return;
  setArticleFlags(id, { sortOrder: order });
  refreshContent();
  revalidatePath("/admin/articles");
}

export async function deleteArticleAction(form: FormData): Promise<void> {
  const admin = await requireAdminOrRedirect();
  const id = text(form, "id");
  if (!id) return;
  softDeleteArticle(id);
  recordAudit({ actor: admin.username, action: "article.trash", entity: "article", entityId: id });
  refreshContent();
  revalidatePath("/admin/articles");
}

export async function restoreArticleAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = text(form, "id");
  if (!id) return;
  restoreArticle(id);
  refreshContent();
  revalidatePath("/admin/articles");
}

/* --- Media ---------------------------------------------------------------- */

export async function setMediaAltAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = text(form, "id");
  const alt = text(form, "alt");
  if (!id || !alt) return;
  setMediaAlt(id, alt);
  revalidatePath("/admin/media");
}

export async function deleteMediaAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdminOrRedirect();
  const id = text(form, "id");
  const media = getMedia(id);
  if (!media) return { ok: false, message: "Ảnh không tồn tại." };

  const references = mediaReferences(media.url);
  if (references.length > 0) {
    return {
      ok: false,
      message: `Không thể xoá: ảnh đang được sử dụng ở ${references.length} nơi (${references.slice(0, 3).join("; ")}). Hãy thay ảnh ở những nơi đó trước.`,
    };
  }

  softDeleteMedia(id);
  revalidatePath("/admin/media");
  return { ok: true, message: "Đã chuyển ảnh vào thùng rác." };
}

export async function restoreMediaAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = text(form, "id");
  if (!id) return;
  restoreMedia(id);
  revalidatePath("/admin/media");
}

/* --- Leads ---------------------------------------------------------------- */

export async function updateLeadStatusAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const requestId = text(form, "requestId");
  const status = leadStatusSchema.safeParse(text(form, "status"));
  if (!requestId || !status.success) return;
  updateLeadStatus(requestId, status.data);
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${requestId}`);
}

export async function addLeadNoteAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const requestId = text(form, "requestId");
  const body = text(form, "body");
  if (!requestId || !body) return;
  addLeadNote(requestId, body.slice(0, 2000));
  revalidatePath(`/admin/leads/${requestId}`);
}

export async function deleteLeadNoteAction(form: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const requestId = text(form, "requestId");
  const noteId = text(form, "noteId");
  if (!requestId || !noteId) return;
  deleteLeadNote(noteId);
  revalidatePath(`/admin/leads/${requestId}`);
}

/* --- Site settings -------------------------------------------------------- */

export async function saveSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdminOrRedirect();
  const locale = text(form, "locale") === "en" ? "en" : "vi";
  const section = text(form, "section") as SiteSettingKey;
  if (!SITE_SETTING_KEYS.includes(section)) {
    return { ok: false, message: "Phần cấu hình không hợp lệ." };
  }

  const raw = jsonField<Record<string, unknown>>(form, "payload") ?? {};
  // Drop empty strings so "not overridden" stays distinguishable from "cleared".
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => {
      if (typeof value === "string") return value.trim() !== "";
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null;
    }),
  );

  try {
    saveSettingSection(locale, section, cleaned);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không lưu được cấu hình.";
    return { ok: false, message };
  }
  recordAudit({ actor: admin.username, action: "settings.update", entity: "site_setting", entityId: `${section}:${locale}` });
  refreshContent();
  revalidatePath("/admin/settings");
  return { ok: true, message: "Đã lưu. Trang chủ sẽ hiển thị nội dung mới." };
}

/* --- Media picker data (read-through, used by client components) ---------- */

export async function listMediaAction(): Promise<{ id: string; url: string; alt: string | null }[]> {
  await requireAdminOrRedirect();
  return listMedia({ limit: 300 }).map((media) => ({
    id: media.id,
    url: media.url,
    alt: media.altDefault,
  }));
}

/** Published tour titles for the article cross-link picker. */
export async function listTourOptionsAction(): Promise<{ slug: string; title: string }[]> {
  await requireAdminOrRedirect();
  return listPublishedTours().map((tour) => ({ slug: tour.slug, title: tour.title }));
}
