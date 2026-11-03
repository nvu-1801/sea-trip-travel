"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { defaultLanding } from "@/domain/landing";
import {
  CUSTOMER_STORIES_DEMO,
  CUSTOMER_STORIES_SOURCE,
} from "@/features/home/customer-stories-demo";
import { parseYouTubeUrl } from "@/lib/youtube";
import { AdminIcon } from "./admin-icons";
import { ImageField, type UploadedImage } from "./image-picker";
import type { ReferenceOptions } from "./editor";

type Logo = {
  id: string;
  name: string;
  image: { src?: string; alt: string };
  href: string;
  visible: boolean;
};

type Video = {
  id: string;
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
  customer: string;
  customerEn: string;
  youtubeUrl: string;
  cover?: { src?: string; alt: string };
  visible: boolean;
};

type Section = {
  enabled: boolean;
  eyebrow: string;
  eyebrowEn: string;
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
  ctaLabel: string;
  ctaLabelEn: string;
  ctaHref: string;
  showLogos: boolean;
  logosTitle: string;
  logosTitleEn: string;
  logos: Logo[];
  showVideos: boolean;
  videosTitle: string;
  videosTitleEn: string;
  videos: Video[];
};

/** Which group the owner is editing — drives the save-bar label. */
export type CustomerPart = "video" | "logo" | "copy";

export const CUSTOMER_PART_LABELS: Record<CustomerPart, string> = {
  video: "Video khách hàng",
  logo: "Logo đối tác",
  copy: "Nội dung khối",
};

type Panel = "video" | "logo";

const PANELS: {
  key: Panel;
  label: string;
  sub: string;
  icon: "star" | "image";
}[] = [
  { key: "video", label: "Video khách hàng", sub: "YouTube", icon: "star" },
  { key: "logo", label: "Logo đối tác", sub: "Brand", icon: "image" },
];

/**
 * Mirrors `landingSchema.customers`. Raised above the source section (10 logos,
 * 6 videos) so the owner can keep adding without deleting verified entries.
 */
const LIMITS = { logos: 18, videos: 12 };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function readSection(value: unknown): Section {
  const base = defaultLanding.customers;
  const saved = record(value);
  const stringOf = (key: keyof Section) =>
    typeof saved[key] === "string"
      ? (saved[key] as string)
      : (base[key] as string);
  const boolOf = (key: keyof Section) =>
    typeof saved[key] === "boolean"
      ? (saved[key] as boolean)
      : (base[key] as boolean);
  return {
    enabled: boolOf("enabled"),
    eyebrow: stringOf("eyebrow"),
    eyebrowEn: stringOf("eyebrowEn"),
    title: stringOf("title"),
    titleEn: stringOf("titleEn"),
    body: stringOf("body"),
    bodyEn: stringOf("bodyEn"),
    ctaLabel: stringOf("ctaLabel"),
    ctaLabelEn: stringOf("ctaLabelEn"),
    ctaHref: stringOf("ctaHref"),
    showLogos: boolOf("showLogos"),
    logosTitle: stringOf("logosTitle"),
    logosTitleEn: stringOf("logosTitleEn"),
    logos: Array.isArray(saved.logos)
      ? (saved.logos as unknown[]).map((item) => {
          const row = record(item);
          return {
            id: String(row.id ?? ""),
            name: String(row.name ?? ""),
            image: {
              src:
                typeof row.image === "object"
                  ? stringOfImage(row.image, "src")
                  : "",
              alt:
                typeof row.image === "object"
                  ? stringOfImage(row.image, "alt")
                  : "",
            },
            href: String(row.href ?? ""),
            visible: row.visible !== false,
          };
        })
      : [],
    showVideos: boolOf("showVideos"),
    videosTitle: stringOf("videosTitle"),
    videosTitleEn: stringOf("videosTitleEn"),
    videos: Array.isArray(saved.videos)
      ? (saved.videos as unknown[]).map((item) => {
          const row = record(item);
          const cover = record(row.cover);
          return {
            id: String(row.id ?? ""),
            title: String(row.title ?? ""),
            titleEn: String(row.titleEn ?? ""),
            body: String(row.body ?? ""),
            bodyEn: String(row.bodyEn ?? ""),
            customer: String(row.customer ?? ""),
            customerEn: String(row.customerEn ?? ""),
            youtubeUrl: String(row.youtubeUrl ?? ""),
            cover:
              cover.src || cover.alt
                ? { src: String(cover.src ?? ""), alt: String(cover.alt ?? "") }
                : undefined,
            visible: row.visible !== false,
          };
        })
      : [],
  };
}

function stringOfImage(value: unknown, key: "src" | "alt"): string {
  const row = record(value);
  return typeof row[key] === "string" ? (row[key] as string) : "";
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8).replaceAll("-", "")}`;
}

/** Mirrors the server's safe link rule so the owner sees the same message. */
function linkIssue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)
    ? ""
    : "Link phải bắt đầu bằng / hoặc https://";
}

/** What still blocks a clean save; the list row and the rail badge use it. */
function videoIssues(video: Video): string[] {
  const issues: string[] = [];
  if (!video.title.trim()) issues.push("Thiếu tiêu đề");
  const parsed = parseYouTubeUrl(video.youtubeUrl);
  if (!parsed) issues.push("Link YouTube sai");
  if (!video.cover?.src && !parsed) issues.push("Thiếu ảnh bìa");
  return issues;
}

function logoIssues(logo: Logo): string[] {
  const issues: string[] = [];
  if (!logo.name.trim()) issues.push("Thiếu tên đơn vị");
  if (!logo.image.src) issues.push("Thiếu ảnh");
  if (!logo.image.alt.trim()) issues.push("Thiếu mô tả ảnh");
  return issues;
}

function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const hintId = useId();
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, {
        "aria-describedby": hint ? hintId : undefined,
      })
    : children;
  return (
    <label className={`adm-customer-field${wide ? " is-wide" : ""}`}>
      <span>{label}</span>
      {control}
      {hint ? <small id={hintId}>{hint}</small> : null}
    </label>
  );
}

/** Compact `role="switch"` row for the rail: no nested card, no icon noise. */
function RailSwitch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="adm-cs-switch"
      data-on={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="adm-cs-switch-copy">
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <i aria-hidden="true" />
    </button>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 10 16" aria-hidden="true" focusable="false">
      <circle cx="3" cy="3" r="1.2" />
      <circle cx="7" cy="3" r="1.2" />
      <circle cx="3" cy="8" r="1.2" />
      <circle cx="7" cy="8" r="1.2" />
      <circle cx="3" cy="13" r="1.2" />
      <circle cx="7" cy="13" r="1.2" />
    </svg>
  );
}

type YouTubeStatus = {
  loading?: boolean;
  message?: string;
  error?: boolean;
};

function YouTubePreview({
  video,
  parsed,
  status,
  onFetch,
  onUseCover,
}: {
  video: Video;
  parsed: ReturnType<typeof parseYouTubeUrl>;
  status?: YouTubeStatus;
  onFetch: () => void;
  onUseCover: () => void;
}) {
  const thumbnail = parsed ? `/api/youtube-thumb/${parsed.id}` : "";
  const src = video.cover?.src || thumbnail;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;

  return (
    <div className="adm-customer-youtube">
      <div className="adm-customer-youtube-media">
        {src && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={video.cover?.alt || video.title || "Video khách hàng"}
            loading="lazy"
            onError={() => setFailedSrc(src)}
          />
        ) : (
          <span className="adm-customer-youtube-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.28 5 12 5 12 5s-6.28 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.72 19 12 19 12 19s6.28 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3-5.2 3Z" />
            </svg>
            <small>
              {parsed
                ? "Chưa tải được thumbnail"
                : "Dán link YouTube để xem trước"}
            </small>
          </span>
        )}
        {src && !failed ? (
          <span className="adm-customer-youtube-badge">YouTube</span>
        ) : null}
      </div>
      <div className="adm-customer-youtube-copy">
        <strong>
          {parsed ? `Video ID ${parsed.id}` : "Chưa có link YouTube"}
        </strong>
        <small>
          {video.cover?.src
            ? "Đang dùng ảnh bìa riêng."
            : parsed
              ? "Ảnh bìa tự động lấy từ YouTube."
              : "Ảnh bìa sẽ có ngay sau khi dán link hợp lệ."}
        </small>
        <div className="adm-customer-youtube-actions">
          {parsed ? (
            <a href={parsed.watchUrl} target="_blank" rel="noreferrer">
              Mở YouTube ↗
            </a>
          ) : null}
          <button
            type="button"
            disabled={!parsed || status?.loading}
            onClick={onFetch}
          >
            {status?.loading ? "Đang lấy…" : "Lấy từ YouTube"}
          </button>
          <button type="button" disabled={!parsed} onClick={onUseCover}>
            Dùng thumbnail
          </button>
        </div>
        {status?.message ? (
          <p
            className={status.error ? "adm-customer-error" : "adm-customer-ok"}
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function CustomerStoriesEditor({
  value,
  references,
  onUploadImage,
  onChange,
  onDirtyParts,
  cleanKey,
}: {
  value: Record<string, unknown>;
  references: ReferenceOptions;
  onUploadImage?: (file: File) => Promise<UploadedImage>;
  onChange: (next: Record<string, unknown>) => void;
  /** Reports which groups hold unsaved edits, for the sticky save bar label. */
  onDirtyParts?: (parts: CustomerPart[]) => void;
  /** Changes when the saved record reloads, so the dirty label resets. */
  cleanKey?: string;
}) {
  const section = readSection(value);
  const media = references.media ?? [];
  const [panel, setPanel] = useState<Panel>("video");
  const [openId, setOpenId] = useState<string | null>(null);

  const [confirmDemo, setConfirmDemo] = useState(false);
  const [demoStatus, setDemoStatus] = useState("");
  const [youtubeStatus, setYoutubeStatus] = useState<
    Record<string, YouTubeStatus>
  >({});
  const [touched, setTouched] = useState<{
    key: string;
    parts: CustomerPart[];
  }>({ key: cleanKey ?? "", parts: [] });
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // A reloaded record (after save/publish) starts clean again; deriving from
  // the key avoids an effect that would render twice on every save.
  const touchedParts = touched.key === (cleanKey ?? "") ? touched.parts : [];

  const commit = (
    patch: Partial<Section>,
    part: CustomerPart | CustomerPart[],
  ) => {
    onChange({ ...value, ...patch });
    const parts = Array.isArray(part) ? part : [part];
    const missing = parts.filter((item) => !touchedParts.includes(item));
    if (missing.length > 0) {
      const next = [...touchedParts, ...missing];
      setTouched({ key: cleanKey ?? "", parts: next });
      onDirtyParts?.(next);
    }
  };
  const setYoutube = (id: string, next: YouTubeStatus) =>
    setYoutubeStatus((current) => ({ ...current, [id]: next }));

  /** New items land at the end of the list; bring their open detail into view. */
  function revealRow(index: number) {
    requestAnimationFrame(() => {
      document
        .getElementById(`adm-cs-detail-${index}`)
        ?.scrollIntoView({ block: "nearest" });
    });
  }

  const hasContent =
    section.logos.length > 0 ||
    section.videos.length > 0 ||
    section.title.trim() !== (defaultLanding.customers.title || "") ||
    section.body.trim() !== (defaultLanding.customers.body || "");

  /**
   * Demo data only ever lands in the form the owner is editing. It never writes
   * the CMS row and never publishes: saving/publishing stays an explicit click.
   */
  function loadDemo() {
    if (hasContent && !confirmDemo) {
      setConfirmDemo(true);
      setDemoStatus(
        "Cần xác nhận: form đang có nội dung. Chọn “Thay thế bằng dữ liệu demo” hoặc “Giữ nguyên”.",
      );
      return;
    }
    commit(
      {
        ...CUSTOMER_STORIES_DEMO,
        logos: CUSTOMER_STORIES_DEMO.logos.map((logo) => ({ ...logo })),
        videos: CUSTOMER_STORIES_DEMO.videos.map((video) => ({
          ...video,
          cover: video.cover ? { ...video.cover } : undefined,
        })),
      },
      ["copy", "video", "logo"],
    );
    setConfirmDemo(false);
    setDemoStatus(
      `Đã nạp ${CUSTOMER_STORIES_DEMO.logos.length} logo và ${CUSTOMER_STORIES_DEMO.videos.length} video vào bản đang soạn. Bấm “Lưu bản nháp” để giữ — website chỉ đổi khi bạn xuất bản.`,
    );
  }

  /* --- Videos ------------------------------------------------------------ */
  const updateVideo = (index: number, patch: Partial<Video>) =>
    commit(
      {
        videos: section.videos.map((video, i) =>
          i === index ? { ...video, ...patch } : video,
        ),
      },
      "video",
    );

  const moveVideoTo = (from: number, to: number) => {
    if (from === to || to < 0 || to >= section.videos.length) return;
    const next = [...section.videos];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    commit({ videos: next }, "video");
  };
  const moveVideo = (index: number, direction: -1 | 1) =>
    moveVideoTo(index, index + direction);

  const removeVideo = (id: string) => {
    commit(
      { videos: section.videos.filter((video) => video.id !== id) },
      "video",
    );
    setOpenId(null);
  };

  const addVideo = () => {
    const video: Video = {
      id: newId("video"),
      title: "",
      titleEn: "",
      body: "",
      bodyEn: "",
      customer: "",
      customerEn: "",
      youtubeUrl: "",
      visible: true,
    };
    commit({ videos: [...section.videos, video] }, "video");
    revealRow(section.videos.length);
    setOpenId(video.id);
  };

  const duplicateVideo = (video: Video) => {
    const copy: Video = {
      ...video,
      id: newId("video"),
      title: video.title ? `${video.title} (bản sao)` : "",
      cover: video.cover ? { ...video.cover } : undefined,
      visible: false,
    };
    const index = section.videos.findIndex((item) => item.id === video.id);
    const next = [...section.videos];
    next.splice(index + 1, 0, copy);
    commit({ videos: next }, "video");
    setOpenId(copy.id);
  };

  async function fetchYouTube(video: Video) {
    const parsed = parseYouTubeUrl(video.youtubeUrl);
    if (!parsed) return;
    setYoutube(video.id, {
      loading: true,
      message: "Đang lấy thông tin từ YouTube…",
    });
    try {
      const response = await fetch(
        `/api/admin/youtube?url=${encodeURIComponent(video.youtubeUrl)}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as {
        title?: string;
        author?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error || "Không lấy được thông tin từ YouTube.");
      }
      const currentIndex = section.videos.findIndex(
        (item) => item.id === video.id,
      );
      if (currentIndex < 0) return;
      const current = section.videos[currentIndex];
      const nextTitle = current.title.trim()
        ? current.title
        : (body.title ?? "").slice(0, 160);
      updateVideo(currentIndex, {
        title: nextTitle,
        cover: current.cover?.src
          ? current.cover
          : {
              src: `/api/youtube-thumb/${parsed.id}`,
              alt: nextTitle || "Video khách hàng",
            },
      });
      setYoutube(video.id, {
        message: `Đã lấy: ${body.title || parsed.id}${
          body.author ? ` · ${body.author}` : ""
        }`,
      });
    } catch (error) {
      setYoutube(video.id, {
        error: true,
        message:
          error instanceof Error
            ? error.message
            : "Không lấy được thông tin từ YouTube.",
      });
    }
  }

  function applyYouTubeCover(video: Video) {
    const parsed = parseYouTubeUrl(video.youtubeUrl);
    if (!parsed) return;
    const currentIndex = section.videos.findIndex(
      (item) => item.id === video.id,
    );
    if (currentIndex < 0) return;
    const current = section.videos[currentIndex];
    const customCover =
      current.cover?.src &&
      !current.cover.src.startsWith("/api/youtube-thumb/");
    if (
      customCover &&
      !window.confirm(
        "Thay ảnh bìa hiện tại bằng thumbnail YouTube? Ảnh bìa riêng sẽ bị bỏ.",
      )
    ) {
      return;
    }
    updateVideo(currentIndex, {
      cover: {
        src: `/api/youtube-thumb/${parsed.id}`,
        alt: current.cover?.alt || current.title || "Video khách hàng",
      },
    });
    setYoutube(video.id, {
      message: "Đã dùng thumbnail YouTube làm ảnh bìa.",
    });
  }

  /* --- Logos ------------------------------------------------------------- */
  const updateLogo = (index: number, patch: Partial<Logo>) =>
    commit(
      {
        logos: section.logos.map((logo, i) =>
          i === index ? { ...logo, ...patch } : logo,
        ),
      },
      "logo",
    );

  const moveLogoTo = (from: number, to: number) => {
    if (from === to || to < 0 || to >= section.logos.length) return;
    const next = [...section.logos];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    commit({ logos: next }, "logo");
  };
  const moveLogo = (index: number, direction: -1 | 1) =>
    moveLogoTo(index, index + direction);

  const removeLogo = (id: string) => {
    commit({ logos: section.logos.filter((logo) => logo.id !== id) }, "logo");
    setOpenId(null);
  };

  const addLogo = () => {
    const logo: Logo = {
      id: newId("logo"),
      name: "",
      image: { src: "", alt: "" },
      href: "",
      visible: true,
    };
    commit({ logos: [...section.logos, logo] }, "logo");
    revealRow(section.logos.length);
    setOpenId(logo.id);
  };

  const duplicateLogo = (logo: Logo) => {
    const copy: Logo = {
      ...logo,
      id: newId("logo"),
      name: logo.name ? `${logo.name} (bản sao)` : "",
      image: { ...logo.image },
      visible: false,
    };
    const index = section.logos.findIndex((item) => item.id === logo.id);
    const next = [...section.logos];
    next.splice(index + 1, 0, copy);
    commit({ logos: next }, "logo");
    setOpenId(copy.id);
  };

  /* --- Derived status ---------------------------------------------------- */
  const visibleLogos = section.logos.filter(
    (logo) => logo.visible && logo.image.src,
  );
  const visibleVideos = section.videos.filter(
    (video) => video.visible && parseYouTubeUrl(video.youtubeUrl),
  );

  const rowsOf = (next: Panel) =>
    next === "video" ? section.videos : section.logos;
  const issuesOf = (next: Panel) =>
    next === "video"
      ? section.videos.flatMap((video, index) =>
          videoIssues(video).map((issue) => `Video ${index + 1}: ${issue}`),
        )
      : section.logos.flatMap((logo, index) =>
          logoIssues(logo).map((issue) => `Logo ${index + 1}: ${issue}`),
        );
  const brokenCount = (next: Panel) =>
    next === "video"
      ? section.videos.filter((video) => videoIssues(video).length > 0).length
      : section.logos.filter((logo) => logoIssues(logo).length > 0).length;

  const panelIssues = issuesOf(panel);
  const limit = panel === "video" ? LIMITS.videos : LIMITS.logos;
  const panelCount = rowsOf(panel).length;
  const panelLabel = panel === "video" ? "video" : "logo";

  /** Reorder by drag: rows are their own drop targets, so the list is one list. */
  function dropRow(index: number) {
    if (dragIndex === null) return;
    if (panel === "video") moveVideoTo(dragIndex, index);
    else moveLogoTo(dragIndex, index);
    setDragIndex(null);
  }

  return (
    <div className="adm-customer-editor adm-cs">
      <div className="adm-cs-body">
        <div
          className="adm-cs-rail"
          role="group"
          aria-label="Nhóm nội dung khách hàng"
        >
          <div className="adm-cs-nav">
            {PANELS.map((item) => {
              const broken = brokenCount(item.key);
              const count = rowsOf(item.key).length;
              return (
                <button
                  key={item.key}
                  type="button"
                  className="adm-cs-nav-item"
                  aria-pressed={panel === item.key}
                  onClick={() => setPanel(item.key)}
                >
                  <span className="adm-cs-nav-icon" aria-hidden="true">
                    <AdminIcon name={item.icon} size={15} />
                  </span>
                  <span className="adm-cs-nav-copy">
                    <strong>{item.label}</strong>
                    <small>
                      <span className="adm-cs-nav-sub">{item.sub} · </span>
                      {count}/
                      {item.key === "video" ? LIMITS.videos : LIMITS.logos}
                    </small>
                  </span>
                  {broken > 0 ? (
                    <span
                      className="adm-cs-nav-badge"
                      aria-label={`${broken} mục cần bổ sung`}
                    >
                      {broken}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="adm-cs-switches">
            <RailSwitch
              checked={section.enabled}
              onChange={(enabled) => commit({ enabled }, "copy")}
              label="Hiển thị section"
              hint={section.enabled ? "Đang bật" : "Đang tắt"}
            />
            <RailSwitch
              checked={section.showVideos}
              onChange={(showVideos) => commit({ showVideos }, "video")}
              label="Nhóm video"
              hint={`${visibleVideos.length}/${section.videos.length} đang hiện`}
            />
            <RailSwitch
              checked={section.showLogos}
              onChange={(showLogos) => commit({ showLogos }, "logo")}
              label="Dải logo"
              hint={`${visibleLogos.length}/${section.logos.length} đang hiện`}
            />
          </div>
        </div>

        <div className="adm-cs-main">
          <section
            className="adm-customer-block adm-cs-panel"
            aria-labelledby="adm-cs-panel-title"
          >
            <header className="adm-customer-block-head">
              <div>
                <p className="adm-customer-eyebrow">
                  {panel === "video"
                    ? "Video khách hàng · YouTube"
                    : "Logo đối tác · Brand"}
                </p>
                <h3 id="adm-cs-panel-title">
                  {panel === "video"
                    ? section.videosTitle || "Khách kể lại hành trình"
                    : section.logosTitle || "Đồng hành cùng SEA TRIP"}
                </h3>
              </div>
              <span className="adm-customer-count">
                {panel === "video"
                  ? `${visibleVideos.length}/${section.videos.length}`
                  : `${visibleLogos.length}/${section.logos.length}`}{" "}
                đang hiện · tối đa {limit}
              </span>
              <button
                type="button"
                className="adm-customer-add"
                disabled={panelCount >= limit}
                onClick={() => (panel === "video" ? addVideo() : addLogo())}
              >
                <AdminIcon name="plus" size={14} /> Thêm {panelLabel}
              </button>
            </header>

            <p
              className={`adm-cs-issues${panelIssues.length ? "" : " is-ok"}`}
              role="status"
            >
              <AdminIcon
                name={panelIssues.length ? "alert" : "check"}
                size={14}
              />
              <span>
                {panelIssues.length
                  ? `${panelIssues.length} mục cần bổ sung: ${panelIssues
                      .slice(0, 4)
                      .join(" · ")}${panelIssues.length > 4 ? " …" : ""}`
                  : "Đủ dữ liệu để xuất bản"}
              </span>
            </p>

            {panelCount === 0 ? (
              <p className="adm-customer-empty">
                {panel === "video"
                  ? "Chưa có video. Dán link YouTube để xem trước thumbnail; bấm “Lấy từ YouTube” để điền tiêu đề và ảnh bìa, hoặc tải ảnh bìa riêng. Iframe chỉ tải sau khi khách bấm xem."
                  : "Chưa có logo. Thêm logo khách hàng/đối tác thật — không dùng logo minh hoạ trên website."}
              </p>
            ) : (
              <ul className="adm-cs-rows">
                {panel === "video"
                  ? section.videos.map((video, index) => {
                      const parsed = parseYouTubeUrl(video.youtubeUrl);
                      const issues = videoIssues(video);
                      const thumb =
                        video.cover?.src ||
                        (parsed ? `/api/youtube-thumb/${parsed.id}` : "");
                      const rowKey = video.id || `video-${index}`;
                      const open = openId === rowKey;
                      return (
                        <li key={video.id || index} className="adm-cs-group">
                          <div
                            className="adm-cs-row"
                            data-open={open ? "true" : undefined}
                            data-hidden={video.visible ? undefined : "true"}
                            data-drag={dragIndex === index ? "true" : undefined}
                            draggable
                            onDragStart={() => setDragIndex(index)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => dropRow(index)}
                            onDragEnd={() => setDragIndex(null)}
                          >
                            <span className="adm-cs-grip" aria-hidden="true">
                              <GripIcon />
                            </span>
                            <span className="adm-cs-thumb" aria-hidden="true">
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumb} alt="" loading="lazy" />
                              ) : (
                                <AdminIcon name="star" size={14} />
                              )}
                            </span>
                            <button
                              type="button"
                              className="adm-cs-row-open"
                              aria-expanded={open}
                              aria-controls={`adm-cs-detail-${index}`}
                              onClick={() => setOpenId(open ? null : rowKey)}
                            >
                              <strong>
                                {video.title || "Video chưa đặt tiêu đề"}
                              </strong>
                              <small>
                                {video.customer ||
                                  (parsed
                                    ? `YouTube · ${parsed.id}`
                                    : "Chưa có link YouTube")}
                              </small>
                            </button>
                            <span className="adm-cs-pos">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span
                              className="adm-cs-state"
                              data-tone={
                                issues.length
                                  ? "warn"
                                  : video.visible
                                    ? "live"
                                    : "off"
                              }
                            >
                              {!video.visible
                                ? "Đang ẩn"
                                : issues.length
                                  ? issues[0]
                                  : "Đang hiện"}
                            </span>
                          </div>
                          {open ? (
                            <div
                              className="adm-cs-detail"
                              id={`adm-cs-detail-${index}`}
                            >
                              <div className="adm-cs-detail-head">
                                <span className="adm-cs-detail-order">
                                  <button
                                    type="button"
                                    aria-label={`Đưa video ${index + 1} lên`}
                                    disabled={index === 0}
                                    onClick={() => moveVideo(index, -1)}
                                  >
                                    ↑
                                  </button>
                                  <small>
                                    Vị trí {index + 1}/{section.videos.length}
                                  </small>
                                  <button
                                    type="button"
                                    aria-label={`Đưa video ${index + 1} xuống`}
                                    disabled={
                                      index === section.videos.length - 1
                                    }
                                    onClick={() => moveVideo(index, 1)}
                                  >
                                    ↓
                                  </button>
                                </span>
                                <span className="adm-cs-detail-actions">
                                  <button
                                    type="button"
                                    className="adm-customer-duplicate"
                                    onClick={() => duplicateVideo(video)}
                                  >
                                    Nhân bản
                                  </button>
                                  <button
                                    type="button"
                                    className="adm-customer-remove"
                                    aria-label={`Xoá video ${index + 1}`}
                                    onClick={() => removeVideo(video.id)}
                                  >
                                    Xoá
                                  </button>
                                </span>
                              </div>
                              <YouTubePreview
                                video={video}
                                parsed={parsed}
                                status={youtubeStatus[video.id]}
                                onFetch={() => void fetchYouTube(video)}
                                onUseCover={() => applyYouTubeCover(video)}
                              />
                              <div className="adm-customer-pairs">
                                <Field
                                  label="Tiêu đề"
                                  hint={
                                    video.title.trim()
                                      ? undefined
                                      : "Bắt buộc — tiêu đề hiển thị trên card."
                                  }
                                >
                                  <input
                                    value={video.title}
                                    maxLength={160}
                                    aria-required="true"
                                    aria-invalid={!video.title.trim()}
                                    onChange={(event) =>
                                      updateVideo(index, {
                                        title: event.target.value,
                                      })
                                    }
                                    placeholder="Một ngày ở Kỳ Co"
                                  />
                                </Field>
                                <Field label="Tiêu đề EN">
                                  <input
                                    value={video.titleEn}
                                    maxLength={160}
                                    onChange={(event) =>
                                      updateVideo(index, {
                                        titleEn: event.target.value,
                                      })
                                    }
                                  />
                                </Field>
                                <Field label="Khách/đơn vị">
                                  <input
                                    value={video.customer}
                                    maxLength={120}
                                    onChange={(event) =>
                                      updateVideo(index, {
                                        customer: event.target.value,
                                      })
                                    }
                                    placeholder="Gia đình chị Lan, Hà Nội"
                                  />
                                </Field>
                                <Field label="Khách/đơn vị EN">
                                  <input
                                    value={video.customerEn}
                                    maxLength={120}
                                    onChange={(event) =>
                                      updateVideo(index, {
                                        customerEn: event.target.value,
                                      })
                                    }
                                  />
                                </Field>
                                <Field
                                  label="Link YouTube"
                                  hint="Dán link watch, youtu.be, shorts hoặc live. Thumbnail và nút lấy tiêu đề hiện ngay bên trên."
                                  wide
                                >
                                  <input
                                    value={video.youtubeUrl}
                                    maxLength={400}
                                    onChange={(event) => {
                                      const nextUrl = event.target.value;
                                      const nextParsed =
                                        parseYouTubeUrl(nextUrl);
                                      const autoCover = Boolean(
                                        video.cover?.src?.startsWith(
                                          "/api/youtube-thumb/",
                                        ),
                                      );
                                      updateVideo(index, {
                                        youtubeUrl: nextUrl,
                                        ...(autoCover && nextParsed
                                          ? {
                                              cover: {
                                                src: `/api/youtube-thumb/${nextParsed.id}`,
                                                alt:
                                                  video.cover?.alt ||
                                                  video.title ||
                                                  "Video khách hàng",
                                              },
                                            }
                                          : {}),
                                      });
                                    }}
                                    placeholder="https://www.youtube.com/watch?v=…"
                                    aria-invalid={Boolean(
                                      video.youtubeUrl && !parsed,
                                    )}
                                  />
                                  {video.youtubeUrl && !parsed ? (
                                    <small className="adm-customer-error">
                                      Link YouTube không hợp lệ. Chỉ nhận watch,
                                      youtu.be, shorts, live hoặc embed.
                                    </small>
                                  ) : null}
                                  {parsed ? (
                                    <small className="adm-customer-ok">
                                      Video ID {parsed.id} · sẽ dùng
                                      youtube-nocookie
                                    </small>
                                  ) : null}
                                </Field>
                                <Field label="Mô tả ngắn" wide>
                                  <textarea
                                    rows={2}
                                    value={video.body}
                                    maxLength={400}
                                    onChange={(event) =>
                                      updateVideo(index, {
                                        body: event.target.value,
                                      })
                                    }
                                  />
                                </Field>
                                <Field label="Mô tả ngắn EN" wide>
                                  <textarea
                                    rows={2}
                                    value={video.bodyEn}
                                    maxLength={400}
                                    onChange={(event) =>
                                      updateVideo(index, {
                                        bodyEn: event.target.value,
                                      })
                                    }
                                  />
                                </Field>
                              </div>
                              <ImageField
                                compact
                                label="Ảnh bìa (tuỳ chọn)"
                                value={video.cover?.src ?? ""}
                                previewAlt={video.cover?.alt}
                                media={media}
                                onUpload={onUploadImage}
                                onChange={(src, alt) =>
                                  updateVideo(index, {
                                    cover: src
                                      ? {
                                          src,
                                          alt:
                                            alt ||
                                            video.title ||
                                            "Video khách hàng",
                                        }
                                      : undefined,
                                  })
                                }
                                onRemove={() =>
                                  updateVideo(index, { cover: undefined })
                                }
                                alt={video.cover?.alt ?? ""}
                                onAltChange={(alt) =>
                                  updateVideo(index, {
                                    cover: {
                                      src: video.cover?.src ?? "",
                                      alt,
                                    },
                                  })
                                }
                                sizeGuide="Để trống để dùng thumbnail YouTube; nếu tải ảnh riêng, dùng tỷ lệ 16:9 từ 1280 × 720 px."
                                whereUsed="Card video trên trang chủ"
                              />
                              <label className="adm-customer-visible">
                                <input
                                  type="checkbox"
                                  checked={video.visible}
                                  onChange={(event) =>
                                    updateVideo(index, {
                                      visible: event.target.checked,
                                    })
                                  }
                                />
                                Hiện video này trên trang chủ
                              </label>
                            </div>
                          ) : null}
                        </li>
                      );
                    })
                  : section.logos.map((logo, index) => {
                      const issues = logoIssues(logo);
                      const hrefIssue = linkIssue(logo.href);
                      const rowKey = logo.id || `logo-${index}`;
                      const open = openId === rowKey;
                      return (
                        <li key={logo.id || index} className="adm-cs-group">
                          <div
                            className="adm-cs-row"
                            data-kind="logo"
                            data-open={open ? "true" : undefined}
                            data-hidden={logo.visible ? undefined : "true"}
                            data-drag={dragIndex === index ? "true" : undefined}
                            draggable
                            onDragStart={() => setDragIndex(index)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => dropRow(index)}
                            onDragEnd={() => setDragIndex(null)}
                          >
                            <span className="adm-cs-grip" aria-hidden="true">
                              <GripIcon />
                            </span>
                            <span className="adm-cs-thumb" aria-hidden="true">
                              {logo.image.src ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={logo.image.src}
                                  alt=""
                                  loading="lazy"
                                />
                              ) : (
                                <AdminIcon name="image" size={14} />
                              )}
                            </span>
                            <button
                              type="button"
                              className="adm-cs-row-open"
                              aria-expanded={open}
                              aria-controls={`adm-cs-detail-${index}`}
                              onClick={() => setOpenId(open ? null : rowKey)}
                            >
                              <strong>
                                {logo.name || "Chưa có tên đơn vị"}
                              </strong>
                              <small>
                                {logo.href || logo.image.alt || "Logo đối tác"}
                              </small>
                            </button>
                            <span className="adm-cs-pos">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span
                              className="adm-cs-state"
                              data-tone={
                                issues.length
                                  ? "warn"
                                  : logo.visible
                                    ? "live"
                                    : "off"
                              }
                            >
                              {!logo.visible
                                ? "Đang ẩn"
                                : issues.length
                                  ? issues[0]
                                  : "Đang hiện"}
                            </span>
                          </div>
                          {open ? (
                            <div
                              className="adm-cs-detail"
                              id={`adm-cs-detail-${index}`}
                            >
                              <div className="adm-cs-detail-head">
                                <span className="adm-cs-detail-order">
                                  <button
                                    type="button"
                                    aria-label={`Đưa logo ${index + 1} lên`}
                                    disabled={index === 0}
                                    onClick={() => moveLogo(index, -1)}
                                  >
                                    ↑
                                  </button>
                                  <small>
                                    Vị trí {index + 1}/{section.logos.length}
                                  </small>
                                  <button
                                    type="button"
                                    aria-label={`Đưa logo ${index + 1} xuống`}
                                    disabled={
                                      index === section.logos.length - 1
                                    }
                                    onClick={() => moveLogo(index, 1)}
                                  >
                                    ↓
                                  </button>
                                </span>
                                <span className="adm-cs-detail-actions">
                                  <button
                                    type="button"
                                    className="adm-customer-duplicate"
                                    onClick={() => duplicateLogo(logo)}
                                  >
                                    Nhân bản
                                  </button>
                                  <button
                                    type="button"
                                    className="adm-customer-remove"
                                    aria-label={`Xoá logo ${index + 1}`}
                                    onClick={() => removeLogo(logo.id)}
                                  >
                                    Xoá
                                  </button>
                                </span>
                              </div>
                              <ImageField
                                compact
                                label="Logo"
                                value={logo.image.src ?? ""}
                                previewAlt={logo.image.alt}
                                media={media}
                                onUpload={onUploadImage}
                                onChange={(src, alt) =>
                                  updateLogo(index, {
                                    image: {
                                      src,
                                      alt: alt || logo.image.alt || logo.name,
                                    },
                                  })
                                }
                                alt={logo.image.alt}
                                onAltChange={(alt) =>
                                  updateLogo(index, {
                                    image: { ...logo.image, alt },
                                  })
                                }
                                altRequired
                                altHint="Alt nên ghi tên đơn vị, ví dụ “Logo Khách sạn Anya”."
                                sizeGuide="Logo nền trong suốt (PNG/WebP), từ 400 × 200 px; hiển thị trong khung 3:2."
                                whereUsed="Dải logo khách hàng trên trang chủ"
                              />
                              <div className="adm-customer-pairs">
                                <Field
                                  label="Tên đơn vị"
                                  hint={
                                    logo.name.trim()
                                      ? undefined
                                      : "Bắt buộc — tên đơn vị hiển thị dưới logo."
                                  }
                                >
                                  <input
                                    value={logo.name}
                                    maxLength={120}
                                    aria-required="true"
                                    aria-invalid={!logo.name.trim()}
                                    onChange={(event) =>
                                      updateLogo(index, {
                                        name: event.target.value,
                                      })
                                    }
                                  />
                                </Field>
                                <Field label="Link (tuỳ chọn)">
                                  <input
                                    value={logo.href}
                                    maxLength={300}
                                    onChange={(event) =>
                                      updateLogo(index, {
                                        href: event.target.value,
                                      })
                                    }
                                    placeholder="https://…"
                                    aria-invalid={Boolean(hrefIssue)}
                                  />
                                  {hrefIssue ? (
                                    <small className="adm-customer-error">
                                      {hrefIssue}
                                    </small>
                                  ) : null}
                                </Field>
                              </div>
                              <label className="adm-customer-visible">
                                <input
                                  type="checkbox"
                                  checked={logo.visible}
                                  onChange={(event) =>
                                    updateLogo(index, {
                                      visible: event.target.checked,
                                    })
                                  }
                                />
                                Hiện logo này trên trang chủ
                              </label>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
              </ul>
            )}
          </section>

          <details className="adm-cs-extra">
            <summary>
              <span>
                <strong>Tiêu đề, lời mời &amp; tiêu đề nhóm</strong>
                <small>
                  Dùng chung cho cả hai nhóm; mỗi nhóm vẫn có tiêu đề riêng.
                </small>
              </span>
              <span className="adm-cs-extra-cta" aria-hidden="true">
                Mở / đóng
              </span>
            </summary>
            <div className="adm-customer-pairs">
              <Field label="Eyebrow">
                <input
                  value={section.eyebrow}
                  maxLength={80}
                  onChange={(event) =>
                    commit({ eyebrow: event.target.value }, "copy")
                  }
                  placeholder="Khách hàng & đối tác"
                />
              </Field>
              <Field label="Eyebrow EN">
                <input
                  value={section.eyebrowEn}
                  maxLength={80}
                  onChange={(event) =>
                    commit({ eyebrowEn: event.target.value }, "copy")
                  }
                  placeholder="Customers & partners"
                />
              </Field>
              <Field label="Tiêu đề">
                <input
                  value={section.title}
                  maxLength={160}
                  onChange={(event) =>
                    commit({ title: event.target.value }, "copy")
                  }
                  placeholder="Dấu ấn sau mỗi hành trình"
                />
              </Field>
              <Field label="Tiêu đề EN">
                <input
                  value={section.titleEn}
                  maxLength={160}
                  onChange={(event) =>
                    commit({ titleEn: event.target.value }, "copy")
                  }
                  placeholder="Stories from the road"
                />
              </Field>
              <Field label="Mô tả" wide>
                <textarea
                  rows={3}
                  value={section.body}
                  maxLength={600}
                  onChange={(event) =>
                    commit({ body: event.target.value }, "copy")
                  }
                />
              </Field>
              <Field label="Mô tả EN" wide>
                <textarea
                  rows={3}
                  value={section.bodyEn}
                  maxLength={600}
                  onChange={(event) =>
                    commit({ bodyEn: event.target.value }, "copy")
                  }
                />
              </Field>
              <Field label="Nhãn CTA">
                <input
                  value={section.ctaLabel}
                  maxLength={80}
                  onChange={(event) =>
                    commit({ ctaLabel: event.target.value }, "copy")
                  }
                />
              </Field>
              <Field label="Nhãn CTA EN">
                <input
                  value={section.ctaLabelEn}
                  maxLength={80}
                  onChange={(event) =>
                    commit({ ctaLabelEn: event.target.value }, "copy")
                  }
                />
              </Field>
              <Field
                label="Link CTA"
                hint="Bắt đầu bằng / hoặc https:// — để trống nếu không cần nút."
                wide
              >
                <input
                  value={section.ctaHref}
                  maxLength={300}
                  onChange={(event) =>
                    commit({ ctaHref: event.target.value }, "copy")
                  }
                  placeholder="/lien-he"
                  aria-invalid={Boolean(linkIssue(section.ctaHref))}
                />
                {linkIssue(section.ctaHref) ? (
                  <small className="adm-customer-error">
                    {linkIssue(section.ctaHref)}
                  </small>
                ) : null}
              </Field>
              <Field label="Tiêu đề nhóm video">
                <input
                  value={section.videosTitle}
                  maxLength={120}
                  onChange={(event) =>
                    commit({ videosTitle: event.target.value }, "copy")
                  }
                />
              </Field>
              <Field label="Tiêu đề nhóm video EN">
                <input
                  value={section.videosTitleEn}
                  maxLength={120}
                  onChange={(event) =>
                    commit({ videosTitleEn: event.target.value }, "copy")
                  }
                />
              </Field>
              <Field label="Tiêu đề nhóm logo">
                <input
                  value={section.logosTitle}
                  maxLength={120}
                  onChange={(event) =>
                    commit({ logosTitle: event.target.value }, "copy")
                  }
                />
              </Field>
              <Field label="Tiêu đề nhóm logo EN">
                <input
                  value={section.logosTitleEn}
                  maxLength={120}
                  onChange={(event) =>
                    commit({ logosTitleEn: event.target.value }, "copy")
                  }
                />
              </Field>
            </div>
          </details>

          <details
            className="adm-customer-demo"
            aria-labelledby="adm-customer-demo-title"
          >
            <summary className="adm-customer-demo-summary">
              <span>
                <strong>Dữ liệu mẫu để đối chiếu</strong>
                <small>
                  {CUSTOMER_STORIES_SOURCE.logoCount} logo ·{" "}
                  {CUSTOMER_STORIES_SOURCE.videoCount} video đã xác minh · chỉ
                  nạp vào form đang soạn
                </small>
              </span>
              <span
                className="adm-customer-demo-summary-cta"
                aria-hidden="true"
              >
                Mở / đóng
              </span>
            </summary>
            <div className="adm-customer-demo-copy">
              <p className="adm-customer-eyebrow">Tuỳ chọn · Bộ dữ liệu demo</p>
              <h3 id="adm-customer-demo-title">
                {CUSTOMER_STORIES_SOURCE.logoCount} logo ·{" "}
                {CUSTOMER_STORIES_SOURCE.videoCount} video đã xác minh
              </h3>
              <p>
                Lấy từ section “{CUSTOMER_STORIES_SOURCE.heading}” trên{" "}
                <a
                  href={CUSTOMER_STORIES_SOURCE.page}
                  target="_blank"
                  rel="noreferrer"
                >
                  seatriptravel.com
                </a>
                . Chỉ nạp vào form đang soạn — không ghi đè bản đã lưu và không
                tự xuất bản.
              </p>
              <p className="adm-customer-demo-note">
                {CUSTOMER_STORIES_SOURCE.logoNotes}{" "}
                {CUSTOMER_STORIES_SOURCE.videoNotes} Ảnh chụp dữ liệu:{" "}
                {CUSTOMER_STORIES_SOURCE.capturedAt}.
              </p>
            </div>
            <div className="adm-customer-demo-actions">
              <button
                type="button"
                className="adm-customer-demo-load"
                onClick={loadDemo}
                aria-describedby="adm-customer-demo-status"
              >
                <AdminIcon name="restore" size={14} /> Nạp dữ liệu demo
              </button>
              <a
                className="adm-customer-demo-preview"
                href="/admin/preview/customers"
                target="_blank"
                rel="noreferrer"
              >
                Xem trước section ↗
              </a>
            </div>
            {confirmDemo ? (
              <div
                className="adm-customer-demo-confirm"
                role="group"
                aria-labelledby="adm-customer-demo-confirm-title"
              >
                <p id="adm-customer-demo-confirm-title">
                  Thay nội dung đang soạn bằng dữ liệu demo?
                </p>
                <p>
                  Form hiện có {section.logos.length} logo và{" "}
                  {section.videos.length} video. Thao tác này chỉ đổi bản nháp
                  trên màn hình; bản đã xuất bản vẫn giữ nguyên.
                </p>
                <div>
                  <button
                    type="button"
                    className="adm-customer-demo-load"
                    onClick={loadDemo}
                  >
                    Thay thế bằng dữ liệu demo
                  </button>
                  <button
                    type="button"
                    className="adm-customer-demo-cancel"
                    onClick={() => setConfirmDemo(false)}
                  >
                    Giữ nguyên
                  </button>
                </div>
              </div>
            ) : null}
            <p
              id="adm-customer-demo-status"
              className="adm-customer-demo-status"
              role="status"
              aria-live="polite"
            >
              {demoStatus ||
                "Bản xem trước đầy đủ đọc bản nháp đã lưu: bấm “Lưu bản nháp” trước khi mở."}
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
