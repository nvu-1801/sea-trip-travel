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
    typeof saved[key] === "string" ? (saved[key] as string) : (base[key] as string);
  const boolOf = (key: keyof Section) =>
    typeof saved[key] === "boolean" ? (saved[key] as boolean) : (base[key] as boolean);
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
              src: typeof row.image === "object" ? stringOfImage(row.image, "src") : "",
              alt: typeof row.image === "object" ? stringOfImage(row.image, "alt") : "",
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

function Toggle({
  checked,
  onChange,
  title,
  hint,
  icon,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  hint: string;
  icon: "eye" | "image" | "star";
}) {
  return (
    <label className="adm-customer-toggle" data-on={checked}>
      <span className="adm-customer-toggle-icon" aria-hidden="true">
        <AdminIcon name={icon} size={16} />
      </span>
      <span className="adm-customer-toggle-copy">
        <strong>{title}</strong>
        <small>{hint}</small>
      </span>
      <span className="adm-customer-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <i aria-hidden="true" />
      </span>
    </label>
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
            <small>{parsed ? "Chưa tải được thumbnail" : "Dán link YouTube để xem trước"}</small>
          </span>
        )}
        {src && !failed ? (
          <span className="adm-customer-youtube-badge">YouTube</span>
        ) : null}
      </div>
      <div className="adm-customer-youtube-copy">
        <strong>{parsed ? `Video ID ${parsed.id}` : "Chưa có link YouTube"}</strong>
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
          <p className={status.error ? "adm-customer-error" : "adm-customer-ok"}>
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
}: {
  value: Record<string, unknown>;
  references: ReferenceOptions;
  onUploadImage?: (file: File) => Promise<UploadedImage>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const section = readSection(value);
  const media = references.media ?? [];
  const [previewLocale, setPreviewLocale] = useState<"vi" | "en">("vi");
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [demoStatus, setDemoStatus] = useState("");
  const [youtubeStatus, setYoutubeStatus] = useState<
    Record<string, YouTubeStatus>
  >({});
  const commit = (patch: Partial<Section>) => onChange({ ...value, ...patch });
  const setYoutube = (id: string, next: YouTubeStatus) =>
    setYoutubeStatus((current) => ({ ...current, [id]: next }));

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
    commit({
      ...CUSTOMER_STORIES_DEMO,
      logos: CUSTOMER_STORIES_DEMO.logos.map((logo) => ({ ...logo })),
      videos: CUSTOMER_STORIES_DEMO.videos.map((video) => ({
        ...video,
        cover: video.cover ? { ...video.cover } : undefined,
      })),
    });
    setConfirmDemo(false);
    setDemoStatus(
      `Đã nạp ${CUSTOMER_STORIES_DEMO.logos.length} logo và ${CUSTOMER_STORIES_DEMO.videos.length} video vào bản đang soạn. Bấm “Lưu bản nháp” để giữ — website chỉ đổi khi bạn xuất bản.`,
    );
  }

  const updateLogo = (index: number, patch: Partial<Logo>) =>
    commit({
      logos: section.logos.map((logo, i) =>
        i === index ? { ...logo, ...patch } : logo,
      ),
    });
  const moveLogo = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= section.logos.length) return;
    const next = [...section.logos];
    [next[index], next[target]] = [next[target], next[index]];
    commit({ logos: next });
  };
  const removeLogo = (index: number) =>
    commit({ logos: section.logos.filter((_, i) => i !== index) });
  const addLogo = () =>
    commit({
      logos: [
        ...section.logos,
        {
          id: newId("logo"),
          name: "",
          image: { src: "", alt: "" },
          href: "",
          visible: true,
        },
      ],
    });

  const duplicateLogo = (index: number) => {
    const source = section.logos[index];
    if (!source) return;
    const copy: Logo = {
      ...source,
      id: newId("logo"),
      name: source.name ? `${source.name} (bản sao)` : "",
      image: { ...source.image },
      visible: false,
    };
    const next = [...section.logos];
    next.splice(index + 1, 0, copy);
    commit({ logos: next });
  };
  const updateVideo = (index: number, patch: Partial<Video>) =>
    commit({
      videos: section.videos.map((video, i) =>
        i === index ? { ...video, ...patch } : video,
      ),
    });
  const moveVideo = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= section.videos.length) return;
    const next = [...section.videos];
    [next[index], next[target]] = [next[target], next[index]];
    commit({ videos: next });
  };
  const removeVideo = (index: number) =>
    commit({ videos: section.videos.filter((_, i) => i !== index) });
  const addVideo = () =>
    commit({
      videos: [
        ...section.videos,
        {
          id: newId("video"),
          title: "",
          titleEn: "",
          body: "",
          bodyEn: "",
          customer: "",
          customerEn: "",
          youtubeUrl: "",
          visible: true,
        },
      ],
    });

  const duplicateVideo = (index: number) => {
    const source = section.videos[index];
    if (!source) return;
    const copy: Video = {
      ...source,
      id: newId("video"),
      title: source.title ? `${source.title} (bản sao)` : "",
      cover: source.cover ? { ...source.cover } : undefined,
      visible: false,
    };
    const next = [...section.videos];
    next.splice(index + 1, 0, copy);
    commit({ videos: next });
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

  const visibleLogos = section.logos.filter(
    (logo) => logo.visible && logo.image.src,
  );
  const visibleVideos = section.videos.filter(
    (video) => video.visible && parseYouTubeUrl(video.youtubeUrl),
  );
  const issues = [
    ...section.logos.flatMap((logo, index) => [
      ...(logo.name.trim() ? [] : [`Logo ${index + 1}: thiếu tên đơn vị`]),
      ...(logo.image.src ? [] : [`Logo ${index + 1}: thiếu ảnh`]),
    ]),
    ...section.videos.flatMap((video, index) => [
      ...(video.title.trim() ? [] : [`Video ${index + 1}: thiếu tiêu đề`]),
      ...(parseYouTubeUrl(video.youtubeUrl)
        ? []
        : [`Video ${index + 1}: link YouTube chưa hợp lệ`]),
    ]),
  ];

  return (
    <div className="adm-customer-editor">
      <nav
        className="adm-customer-jump"
        aria-label="Đi nhanh trong khối khách hàng"
      >
        <a href="#adm-customer-content">
          <span>01</span> Nội dung
        </a>
        <a href="#adm-customer-logos">
          <span>02</span> Logo
          <small>
            {visibleLogos.length}/{section.logos.length}
          </small>
        </a>
        <a href="#adm-customer-videos">
          <span>03</span> Video
          <small>
            {visibleVideos.length}/{section.videos.length}
          </small>
        </a>
        <a href="#adm-customer-preview">
          <span>04</span> Xem nhanh
        </a>
      </nav>

      <div className="adm-customer-toggles">
        <Toggle
          icon="eye"
          checked={section.enabled}
          onChange={(enabled) => commit({ enabled })}
          title="Hiển thị section"
          hint="Tắt để ẩn toàn bộ khối khách hàng khỏi trang chủ."
        />
        <Toggle
          icon="image"
          checked={section.showLogos}
          onChange={(showLogos) => commit({ showLogos })}
          title="Dải logo"
          hint={`${visibleLogos.length}/${section.logos.length} logo đang hiện.`}
        />
        <Toggle
          icon="star"
          checked={section.showVideos}
          onChange={(showVideos) => commit({ showVideos })}
          title="Video khách hàng"
          hint={`${visibleVideos.length}/${section.videos.length} video đang hiện.`}
        />
      </div>

      <div
        className={`adm-customer-health${issues.length ? "" : " is-ok"}`}
        role="status"
        aria-live="polite"
      >
        <strong>
          {issues.length
            ? `${issues.length} mục cần bổ sung`
            : "Đủ thông tin để xuất bản"}
        </strong>
        {issues.length ? (
          <ul>
            {issues.slice(0, 6).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
            {issues.length > 6 ? <li>… và {issues.length - 6} mục khác</li> : null}
          </ul>
        ) : (
          <span>Logo, tiêu đề và link YouTube đã hợp lệ.</span>
        )}
      </div>

      <details
        className="adm-customer-demo"
        aria-labelledby="adm-customer-demo-title"
      >
        <summary className="adm-customer-demo-summary">
          <span>
            <strong>Dữ liệu mẫu để đối chiếu</strong>
            <small>
              {CUSTOMER_STORIES_SOURCE.logoCount} logo ·{" "}
              {CUSTOMER_STORIES_SOURCE.videoCount} video đã xác minh · chỉ nạp
              vào form đang soạn
            </small>
          </span>
          <span className="adm-customer-demo-summary-cta" aria-hidden="true">
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
            . Chỉ nạp vào form đang soạn — không ghi đè bản đã lưu và không tự
            xuất bản.
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
              Form hiện có {section.logos.length} logo và {section.videos.length}{" "}
              video. Thao tác này chỉ đổi bản nháp trên màn hình; bản đã xuất bản
              vẫn giữ nguyên.
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

      <section id="adm-customer-content" className="adm-customer-block">
        <header className="adm-customer-block-head">
          <div>
            <p className="adm-customer-eyebrow">01 · Nội dung section</p>
            <h3>Tiêu đề &amp; lời mời</h3>
          </div>
          <span className="adm-customer-count">VI / EN</span>
        </header>
        <div className="adm-customer-pairs">
          <Field label="Eyebrow">
            <input
              value={section.eyebrow}
              maxLength={80}
              onChange={(event) => commit({ eyebrow: event.target.value })}
              placeholder="Khách hàng & đối tác"
            />
          </Field>
          <Field label="Eyebrow EN">
            <input
              value={section.eyebrowEn}
              maxLength={80}
              onChange={(event) => commit({ eyebrowEn: event.target.value })}
              placeholder="Customers & partners"
            />
          </Field>
          <Field label="Tiêu đề">
            <input
              value={section.title}
              maxLength={160}
              onChange={(event) => commit({ title: event.target.value })}
              placeholder="Dấu ấn sau mỗi hành trình"
            />
          </Field>
          <Field label="Tiêu đề EN">
            <input
              value={section.titleEn}
              maxLength={160}
              onChange={(event) => commit({ titleEn: event.target.value })}
              placeholder="Stories from the road"
            />
          </Field>
          <Field label="Mô tả" wide>
            <textarea
              rows={3}
              value={section.body}
              maxLength={600}
              onChange={(event) => commit({ body: event.target.value })}
            />
          </Field>
          <Field label="Mô tả EN" wide>
            <textarea
              rows={3}
              value={section.bodyEn}
              maxLength={600}
              onChange={(event) => commit({ bodyEn: event.target.value })}
            />
          </Field>
          <Field label="Nhãn CTA">
            <input
              value={section.ctaLabel}
              maxLength={80}
              onChange={(event) => commit({ ctaLabel: event.target.value })}
            />
          </Field>
          <Field label="Nhãn CTA EN">
            <input
              value={section.ctaLabelEn}
              maxLength={80}
              onChange={(event) => commit({ ctaLabelEn: event.target.value })}
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
              onChange={(event) => commit({ ctaHref: event.target.value })}
              placeholder="/lien-he"
              aria-invalid={Boolean(linkIssue(section.ctaHref))}
            />
            {linkIssue(section.ctaHref) ? (
              <small className="adm-customer-error">
                {linkIssue(section.ctaHref)}
              </small>
            ) : null}
          </Field>
        </div>
      </section>

      <section id="adm-customer-logos" className="adm-customer-block">
        <header className="adm-customer-block-head">
          <div>
            <p className="adm-customer-eyebrow">02 · Logo đối tác</p>
            <h3>{section.logosTitle || "Đồng hành cùng SEA TRIP"}</h3>
          </div>
          <span className="adm-customer-count">
            {visibleLogos.length}/{section.logos.length} đang hiện · tối đa{" "}
            {LIMITS.logos}
          </span>
          <button
            type="button"
            className="adm-customer-add"
            disabled={section.logos.length >= LIMITS.logos}
            onClick={addLogo}
          >
            <AdminIcon name="plus" size={14} /> Thêm logo
          </button>
        </header>
        <div className="adm-customer-pairs">
          <Field label="Tiêu đề nhóm logo">
            <input
              value={section.logosTitle}
              maxLength={120}
              onChange={(event) => commit({ logosTitle: event.target.value })}
            />
          </Field>
          <Field label="Tiêu đề nhóm logo EN">
            <input
              value={section.logosTitleEn}
              maxLength={120}
              onChange={(event) => commit({ logosTitleEn: event.target.value })}
            />
          </Field>
        </div>
        {section.logos.length === 0 ? (
          <p className="adm-customer-empty">
            Chưa có logo. Thêm logo khách hàng/đối tác thật — không dùng logo
            minh hoạ trên website.
          </p>
        ) : (
          <div className="adm-customer-logos">
            {section.logos.map((logo, index) => {
              const hrefIssue = linkIssue(logo.href);
              return (
              <article
                className={`adm-customer-logo${logo.visible ? "" : " is-hidden"}`}
                key={logo.id || index}
                data-hidden={logo.visible ? undefined : "true"}
              >
                <div className="adm-customer-item-head">
                  <div className="adm-customer-item-title">
                    <span>Logo {String(index + 1).padStart(2, "0")}</span>
                    <small
                      data-on={
                        logo.visible && Boolean(logo.image.src)
                          ? "true"
                          : "false"
                      }
                    >
                      {!logo.visible
                        ? "Đang ẩn"
                        : logo.image.src
                          ? "Đang hiện"
                          : "Thiếu ảnh"}
                    </small>
                  </div>
                  <div className="adm-customer-item-actions">
                    <button
                      type="button"
                      aria-label={`Đưa logo ${index + 1} lên`}
                      disabled={index === 0}
                      onClick={() => moveLogo(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Đưa logo ${index + 1} xuống`}
                      disabled={index === section.logos.length - 1}
                      onClick={() => moveLogo(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="adm-customer-duplicate"
                      aria-label={`Nhân bản logo ${index + 1}`}
                      onClick={() => duplicateLogo(index)}
                    >
                      Nhân bản
                    </button>
                    <button
                      type="button"
                      className="adm-customer-remove"
                      aria-label={`Xoá logo ${index + 1}`}
                      onClick={() => removeLogo(index)}
                    >
                      Xoá
                    </button>
                  </div>
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
                        updateLogo(index, { name: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Link (tuỳ chọn)">
                    <input
                      value={logo.href}
                      maxLength={300}
                      onChange={(event) =>
                        updateLogo(index, { href: event.target.value })
                      }
                      placeholder="https://…"
                      aria-invalid={Boolean(hrefIssue)}
                    />
                    {hrefIssue ? (
                      <small className="adm-customer-error">{hrefIssue}</small>
                    ) : null}
                  </Field>
                </div>
                <label className="adm-customer-visible">
                  <input
                    type="checkbox"
                    checked={logo.visible}
                    onChange={(event) =>
                      updateLogo(index, { visible: event.target.checked })
                    }
                  />
                  Hiện logo này trên trang chủ
                </label>
              </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="adm-customer-videos" className="adm-customer-block">
        <header className="adm-customer-block-head">
          <div>
            <p className="adm-customer-eyebrow">03 · Video khách hàng</p>
            <h3>{section.videosTitle || "Khách kể lại hành trình"}</h3>
          </div>
          <span className="adm-customer-count">
            {visibleVideos.length}/{section.videos.length} đang hiện · tối đa{" "}
            {LIMITS.videos}
          </span>
          <button
            type="button"
            className="adm-customer-add"
            disabled={section.videos.length >= LIMITS.videos}
            onClick={addVideo}
          >
            <AdminIcon name="plus" size={14} /> Thêm video
          </button>
        </header>
        <div className="adm-customer-pairs">
          <Field label="Tiêu đề nhóm video">
            <input
              value={section.videosTitle}
              maxLength={120}
              onChange={(event) => commit({ videosTitle: event.target.value })}
            />
          </Field>
          <Field label="Tiêu đề nhóm video EN">
            <input
              value={section.videosTitleEn}
              maxLength={120}
              onChange={(event) => commit({ videosTitleEn: event.target.value })}
            />
          </Field>
        </div>
        {section.videos.length === 0 ? (
          <p className="adm-customer-empty">
            Chưa có video. Dán link YouTube để xem trước thumbnail; bấm “Lấy từ
            YouTube” để điền tiêu đề và ảnh bìa, hoặc tải ảnh bìa riêng. Iframe
            chỉ tải sau khi khách bấm xem.
          </p>
        ) : (
          <div className="adm-customer-videos">
            {section.videos.map((video, index) => {
              const parsed = parseYouTubeUrl(video.youtubeUrl);
              return (
                <article
                  className={`adm-customer-video${video.visible ? "" : " is-hidden"}`}
                  key={video.id || index}
                  data-hidden={video.visible ? undefined : "true"}
                >
                  <div className="adm-customer-item-head">
                    <div className="adm-customer-item-title">
                      <span>Video {String(index + 1).padStart(2, "0")}</span>
                      <small
                        data-on={
                          video.visible && Boolean(parsed) ? "true" : "false"
                        }
                      >
                        {!video.visible
                          ? "Đang ẩn"
                          : parsed
                            ? "Đang hiện"
                            : "Link chưa hợp lệ"}
                      </small>
                    </div>
                    <div className="adm-customer-item-actions">
                      <button
                        type="button"
                        aria-label={`Đưa video ${index + 1} lên`}
                        disabled={index === 0}
                        onClick={() => moveVideo(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Đưa video ${index + 1} xuống`}
                        disabled={index === section.videos.length - 1}
                        onClick={() => moveVideo(index, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="adm-customer-duplicate"
                        aria-label={`Nhân bản video ${index + 1}`}
                        onClick={() => duplicateVideo(index)}
                      >
                        Nhân bản
                      </button>
                      <button
                        type="button"
                        className="adm-customer-remove"
                        aria-label={`Xoá video ${index + 1}`}
                        onClick={() => removeVideo(index)}
                      >
                        Xoá
                      </button>
                    </div>
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
                          updateVideo(index, { title: event.target.value })
                        }
                        placeholder="Một ngày ở Kỳ Co"
                      />
                    </Field>
                    <Field label="Tiêu đề EN">
                      <input
                        value={video.titleEn}
                        maxLength={160}
                        onChange={(event) =>
                          updateVideo(index, { titleEn: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Khách/đơn vị">
                      <input
                        value={video.customer}
                        maxLength={120}
                        onChange={(event) =>
                          updateVideo(index, { customer: event.target.value })
                        }
                        placeholder="Gia đình chị Lan, Hà Nội"
                      />
                    </Field>
                    <Field label="Khách/đơn vị EN">
                      <input
                        value={video.customerEn}
                        maxLength={120}
                        onChange={(event) =>
                          updateVideo(index, { customerEn: event.target.value })
                        }
                      />
                    </Field>
                    <Field
                      label="Link YouTube"
                      hint="Dán link watch, youtu.be, shorts hoặc live. Thumbnail và nút lấy tiêu đề hiện ngay bên dưới."
                      wide
                    >
                      <input
                        value={video.youtubeUrl}
                        maxLength={400}
                        onChange={(event) => {
                          const nextUrl = event.target.value;
                          const nextParsed = parseYouTubeUrl(nextUrl);
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
                        aria-invalid={Boolean(video.youtubeUrl && !parsed)}
                      />
                      {video.youtubeUrl && !parsed ? (
                        <small className="adm-customer-error">
                          Link YouTube không hợp lệ. Chỉ nhận watch, youtu.be,
                          shorts, live hoặc embed.
                        </small>
                      ) : null}
                      {parsed ? (
                        <small className="adm-customer-ok">
                          Video ID {parsed.id} · sẽ dùng youtube-nocookie
                        </small>
                      ) : null}
                    </Field>
                    <Field label="Mô tả ngắn" wide>
                      <textarea
                        rows={2}
                        value={video.body}
                        maxLength={400}
                        onChange={(event) =>
                          updateVideo(index, { body: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Mô tả ngắn EN" wide>
                      <textarea
                        rows={2}
                        value={video.bodyEn}
                        maxLength={400}
                        onChange={(event) =>
                          updateVideo(index, { bodyEn: event.target.value })
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
                          ? { src, alt: alt || video.title || "Video khách hàng" }
                          : undefined,
                      })
                    }
                    onRemove={() => updateVideo(index, { cover: undefined })}
                    alt={video.cover?.alt ?? ""}
                    onAltChange={(alt) =>
                      updateVideo(index, {
                        cover: { src: video.cover?.src ?? "", alt },
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
                        updateVideo(index, { visible: event.target.checked })
                      }
                    />
                    Hiện video này trên trang chủ
                  </label>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="adm-customer-preview" className="adm-customer-preview">
        <header>
          <div>
            <p className="adm-customer-eyebrow">04 · Xem nhanh</p>
            <strong>
              {(previewLocale === "en" ? section.titleEn : section.title) ||
                section.title ||
                "Dấu ấn sau mỗi hành trình"}
            </strong>
            {section.eyebrow ? <small>{section.eyebrow}</small> : null}
          </div>
          <span>
            {section.enabled ? "Đang bật" : "Đang tắt"} · {visibleLogos.length}{" "}
            logo · {visibleVideos.length} video
          </span>
          <div className="adm-preview-lang" role="group" aria-label="Ngôn ngữ xem nhanh">
            <button
              type="button"
              aria-pressed={previewLocale === "vi"}
              onClick={() => setPreviewLocale("vi")}
            >
              Tiếng Việt
            </button>
            <button
              type="button"
              aria-pressed={previewLocale === "en"}
              onClick={() => setPreviewLocale("en")}
            >
              English
            </button>
          </div>
        </header>
        {section.body || section.bodyEn ? (
          <p className="adm-customer-preview-body">
            {previewLocale === "en"
              ? section.bodyEn || section.body
              : section.body}
          </p>
        ) : null}
        {section.ctaLabel && section.ctaHref ? (
          <span className="adm-customer-preview-cta">
            {previewLocale === "en"
              ? section.ctaLabelEn || section.ctaLabel
              : section.ctaLabel}{" "}
            <span aria-hidden="true">→</span>
          </span>
        ) : null}
        {visibleLogos.length > 0 ? (
          <ul className="adm-customer-preview-logos">
            {visibleLogos.map((logo) => (
              <li key={logo.id}>
                {logo.image.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo.image.src} alt={logo.image.alt} loading="lazy" />
                ) : (
                  <span>{logo.name.slice(0, 1)}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-customer-preview-empty">Chưa có logo hiển thị.</p>
        )}
        {visibleVideos.length > 0 ? (
          <div className="adm-customer-preview-videos">
            {visibleVideos.map((video) => (
              <div key={video.id}>
                {video.cover?.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.cover.src}
                    alt={video.cover.alt}
                    loading="lazy"
                  />
                ) : (
                  <span className="adm-customer-preview-play">
                    <AdminIcon name="star" size={18} />
                  </span>
                )}
                <strong>
                  {(previewLocale === "en" ? video.titleEn : video.title) ||
                    video.title ||
                    "Video chưa đặt tên"}
                </strong>
                <small>
                  {(previewLocale === "en" ? video.customerEn : video.customer) ||
                    video.customer ||
                    "Khách hàng"}
                </small>
              </div>
            ))}
          </div>
        ) : (
          <p className="adm-customer-preview-empty">Chưa có video hiển thị.</p>
        )}
      </section>
    </div>
  );
}
