import type { Tour } from "@/domain/tour";
import type { TravelArticle } from "@/domain/article";
import type { SiteSettings } from "@/domain/settings";

/** Publishing state shared by tours and articles. */
export type ContentState = "draft" | "published" | "hidden";

export type TourRecord = {
  tour: Tour;
  status: ContentState;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
  publishedAt: string | null;
  deletedAt: string | null;
};

export type ArticleRecord = {
  article: TravelArticle;
  status: ContentState;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
  recordUpdatedAt: string;
  publishedTs: string | null;
  deletedAt: string | null;
};

export type MediaRecord = {
  id: string;
  storage: "static" | "upload";
  url: string;
  filename: string | null;
  originalName: string | null;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  sha256: string | null;
  variants: { name: string; url: string; width: number; height: number; mime: string }[];
  altDefault: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type LeadStatus = "new" | "processing" | "done";
export type LeadEmailStatus = "pending" | "sent" | "failed" | "not_configured";

export type LeadRecord = {
  requestId: string;
  receivedAt: string;
  fullName: string;
  phone: string;
  email: string | null;
  interest: string | null;
  tourSlug: string | null;
  travelDate: string | null;
  partySize: number | null;
  message: string | null;
  sourcePage: string | null;
  locale: string;
  utm: Record<string, string> | null;
  status: LeadStatus;
  emailStatus: LeadEmailStatus;
  createdAt: string;
  updatedAt: string;
  notes: { id: string; body: string; createdAt: string }[];
};

/** Everything the public site reads, cached under one tag. */
export type ContentSnapshot = {
  tours: Tour[];
  articles: TravelArticle[];
  categories: import("@/domain/category").TourCategory[];
  destinations: import("@/domain/destination").Destination[];
  /** Overlays keyed by locale, e.g. `{ en: {...} }`. */
  translations: Record<string, import("@/server/repo/translations").Translations>;
  settings: Record<string, SiteSettings>;
  updatedAt: string;
};
