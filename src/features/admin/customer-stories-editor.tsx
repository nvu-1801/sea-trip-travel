"use client";

import type { ReactNode } from "react";
import { defaultLanding } from "@/domain/landing";
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

const LIMITS = { logos: 12, videos: 6 };

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
  return (
    <label className={`adm-customer-field${wide ? " is-wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
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
  const commit = (patch: Partial<Section>) => onChange({ ...value, ...patch });

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

  const visibleLogos = section.logos.filter(
    (logo) => logo.visible && logo.image.src,
  );
  const visibleVideos = section.videos.filter(
    (video) => video.visible && parseYouTubeUrl(video.youtubeUrl),
  );

  return (
    <div className="adm-customer-editor">
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

      <section className="adm-customer-block">
        <header className="adm-customer-block-head">
          <div>
            <p className="adm-customer-eyebrow">Nội dung section</p>
            <h3>Tiêu đề & lời mời</h3>
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
            />
          </Field>
        </div>
      </section>

      <section className="adm-customer-block">
        <header className="adm-customer-block-head">
          <div>
            <p className="adm-customer-eyebrow">Logo đối tác</p>
            <h3>{section.logosTitle || "Đồng hành cùng SEA TRIP"}</h3>
          </div>
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
            {section.logos.map((logo, index) => (
              <article className="adm-customer-logo" key={logo.id || index}>
                <div className="adm-customer-item-head">
                  <span>Logo {String(index + 1).padStart(2, "0")}</span>
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
                      className="adm-customer-remove"
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
                  <Field label="Tên đơn vị">
                    <input
                      value={logo.name}
                      maxLength={120}
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
                    />
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
            ))}
          </div>
        )}
      </section>

      <section className="adm-customer-block">
        <header className="adm-customer-block-head">
          <div>
            <p className="adm-customer-eyebrow">Video trải nghiệm</p>
            <h3>{section.videosTitle || "Khách kể lại hành trình"}</h3>
          </div>
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
            Chưa có video. Dán link YouTube; ảnh bìa là tuỳ chọn và chỉ tải
            iframe sau khi khách bấm xem.
          </p>
        ) : (
          <div className="adm-customer-videos">
            {section.videos.map((video, index) => {
              const parsed = parseYouTubeUrl(video.youtubeUrl);
              return (
                <article className="adm-customer-video" key={video.id || index}>
                  <div className="adm-customer-item-head">
                    <span>Video {String(index + 1).padStart(2, "0")}</span>
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
                        className="adm-customer-remove"
                        onClick={() => removeVideo(index)}
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                  <div className="adm-customer-pairs">
                    <Field label="Tiêu đề">
                      <input
                        value={video.title}
                        maxLength={160}
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
                    <Field label="Link YouTube" wide>
                      <input
                        value={video.youtubeUrl}
                        maxLength={400}
                        onChange={(event) =>
                          updateVideo(index, {
                            youtubeUrl: event.target.value,
                          })
                        }
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
                    sizeGuide="Tỷ lệ 16:9, từ 1280 × 720 px. Không có ảnh bìa, card dùng nền thương hiệu."
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

      <section className="adm-customer-preview">
        <header>
          <p className="adm-customer-eyebrow">Xem nhanh</p>
          <strong>
            {section.enabled ? "Đang bật" : "Đang tắt"} · {visibleLogos.length}{" "}
            logo · {visibleVideos.length} video
          </strong>
        </header>
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
                <strong>{video.title || "Video chưa đặt tên"}</strong>
                <small>{video.customer || "Khách hàng"}</small>
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
