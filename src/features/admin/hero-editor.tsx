"use client";

import Image from "next/image";
import { useId, useState } from "react";
import type { HeroConfig } from "@/domain/home-hero";
import { Editor, type EditorValue, type ReferenceOptions } from "./editor";
import "./hero-editor.css";

type HeroImage = HeroConfig["collageMain"];
function ImagePicker({
  value,
  onChange,
  references,
  label,
}: {
  value: HeroImage;
  onChange: (image: HeroImage) => void;
  references: ReferenceOptions;
  label: string;
}) {
  const id = useId();
  return (
    <fieldset className="adm-hero-image-picker">
      <legend>{label}</legend>
      <div className="adm-hero-image-preview">
        <Image
          src={value.src}
          alt={value.alt}
          fill
          sizes="(max-width: 768px) 90vw, 400px"
          unoptimized
          style={{
            objectFit: "cover",
            objectPosition: `${value.positionX}% ${value.positionY}%`,
          }}
        />
      </div>
      <label htmlFor={`${id}-source`}>Ảnh từ thư viện</label>
      <select
        id={`${id}-source`}
        value={value.src}
        onChange={(event) => {
          const item = references.media?.find(
            (option) => option.value === event.target.value,
          );
          onChange({
            ...value,
            src: event.target.value,
            alt: item?.label || value.alt,
          });
        }}
      >
        {!references.media?.some((item) => item.value === value.src) && (
          <option value={value.src}>{value.src}</option>
        )}
        {references.media?.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-alt`}>Mô tả ảnh</label>
      <input
        id={`${id}-alt`}
        value={value.alt}
        maxLength={300}
        onChange={(event) => onChange({ ...value, alt: event.target.value })}
      />
      <div className="adm-hero-focal">
        <label htmlFor={`${id}-x`}>Vị trí ngang: {value.positionX}%</label>
        <input
          id={`${id}-x`}
          type="range"
          min={0}
          max={100}
          value={value.positionX}
          onChange={(event) =>
            onChange({ ...value, positionX: Number(event.target.value) })
          }
        />
        <label htmlFor={`${id}-y`}>Vị trí dọc: {value.positionY}%</label>
        <input
          id={`${id}-y`}
          type="range"
          min={0}
          max={100}
          value={value.positionY}
          onChange={(event) =>
            onChange({ ...value, positionY: Number(event.target.value) })
          }
        />
      </div>
    </fieldset>
  );
}

export function HeroEditor({
  value,
  onChange,
  references,
}: {
  value: HeroConfig;
  onChange: (config: HeroConfig) => void;
  references: ReferenceOptions;
}) {
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const updateSlide = (
    index: number,
    update: Partial<HeroConfig["slides"][number]>,
  ) =>
    onChange({
      ...value,
      slides: value.slides.map((slide, i) =>
        i === index ? { ...slide, ...update } : slide,
      ),
    });
  const move = (index: number, direction: number) => {
    const slides = [...value.slides];
    [slides[index], slides[index + direction]] = [
      slides[index + direction],
      slides[index],
    ];
    onChange({ ...value, slides });
  };
  return (
    <div className="adm-hero-editor">
      <fieldset className="adm-hero-mode-picker">
        <legend>Chọn bố cục mở đầu</legend>
        {(["carousel", "collage"] as const).map((mode) => (
          <label key={mode} data-selected={value.mode === mode}>
            <input
              type="radio"
              name="hero-mode"
              value={mode}
              checked={value.mode === mode}
              onChange={() => onChange({ ...value, mode })}
            />
            <span
              className={`adm-hero-wireframe adm-hero-wireframe-${mode}`}
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
            </span>
            <strong>
              {mode === "carousel" ? "Carousel ảnh lớn" : "Bố cục ảnh ghép"}
            </strong>
            <span>
              {mode === "carousel"
                ? "Ảnh trải rộng, nội dung nổi bật và điều hướng từng slide."
                : "Nội dung bên trái, ảnh chính và ảnh phụ bên phải."}
            </span>
          </label>
        ))}
      </fieldset>
      <p className="adm-hero-hint">
        Lưu nháp để chuẩn bị; bấm Xuất bản thay đổi để áp dụng. Chuyển kiểu
        không làm mất ảnh hay nội dung của kiểu còn lại.
      </p>
      <section className="adm-hero-copy-editor">
        <h3>Nội dung dùng chung</h3>
        <p>
          Để trống để dùng nội dung tại tab Nội dung VI / EN. Mỗi slide có thể
          ghi đè tiêu đề và mô tả riêng.
        </p>
        <div
          className="adm-hero-language"
          role="group"
          aria-label="Ngôn ngữ hero"
        >
          <button
            type="button"
            aria-pressed={language === "vi"}
            onClick={() => setLanguage("vi")}
          >
            Tiếng Việt
          </button>
          <button
            type="button"
            aria-pressed={language === "en"}
            onClick={() => setLanguage("en")}
          >
            English
          </button>
        </div>
        <Editor
          value={value[language] as Record<string, EditorValue>}
          onChange={(copy) => onChange({ ...value, [language]: copy })}
        />
        <Editor
          value={{
            primaryHref: value.primaryHref,
            secondaryHref: value.secondaryHref,
          }}
          onChange={(links) =>
            onChange({
              ...value,
              ...(links as { primaryHref: string; secondaryHref: string }),
            })
          }
        />
      </section>
      {value.mode === "carousel" ? (
        <>
          <div className="adm-hero-playback">
            <label className="adm-toggle">
              <input
                type="checkbox"
                checked={value.autoplay}
                onChange={(event) =>
                  onChange({ ...value, autoplay: event.target.checked })
                }
              />
              Tự chuyển slide
            </label>
            <label>
              Thời gian mỗi slide (6–20 giây)
              <input
                type="number"
                min={6}
                max={20}
                value={value.intervalSeconds}
                onChange={(event) =>
                  onChange({
                    ...value,
                    intervalSeconds: Number(event.target.value),
                  })
                }
              />
            </label>
            <p>
              Tự dừng khi tab ẩn, hero ngoài màn hình hoặc người dùng bật giảm
              chuyển động. Thao tác bằng bàn phím sẽ dừng tự chuyển.
            </p>
          </div>
          <div className="adm-hero-slide-heading">
            <h3>
              Danh sách slide <small>{value.slides.length}/8</small>
            </h3>
            <button
              type="button"
              disabled={value.slides.length >= 8}
              onClick={() =>
                onChange({
                  ...value,
                  slides: [
                    ...value.slides,
                    {
                      ...structuredClone(value.slides[0]),
                      id: `slide_${crypto.randomUUID().slice(0, 8)}`,
                      caption: "Hành trình mới",
                      captionEn: "A new journey",
                    },
                  ],
                })
              }
            >
              Thêm slide
            </button>
          </div>
          {value.slides.map((slide, index) => (
            <details
              key={slide.id}
              className="adm-hero-slide"
              open={index === 0}
            >
              <summary>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {slide.caption}
              </summary>
              <div className="adm-hero-slide-toolbar">
                <button
                  type="button"
                  disabled={index === 0}
                  aria-label={`Đưa slide ${index + 1} lên`}
                  onClick={() => move(index, -1)}
                >
                  Đưa lên
                </button>
                <button
                  type="button"
                  disabled={index === value.slides.length - 1}
                  aria-label={`Đưa slide ${index + 1} xuống`}
                  onClick={() => move(index, 1)}
                >
                  Đưa xuống
                </button>
                <button
                  type="button"
                  disabled={value.slides.length <= 1}
                  aria-label={`Bỏ slide ${index + 1}`}
                  onClick={() => {
                    if (
                      confirm(
                        "Bỏ slide này khỏi cấu hình? Ảnh trong thư viện vẫn được giữ. Thay đổi chỉ lên web sau khi xuất bản.",
                      )
                    )
                      onChange({
                        ...value,
                        slides: value.slides.filter(
                          (item) => item.id !== slide.id,
                        ),
                      });
                  }}
                >
                  Bỏ slide
                </button>
              </div>
              <ImagePicker
                label={`Ảnh slide ${index + 1}`}
                value={slide.image}
                onChange={(image) => updateSlide(index, { image })}
                references={references}
              />
              <Editor
                value={{
                  caption: slide.caption,
                  captionEn: slide.captionEn,
                  title: slide.title,
                  titleEn: slide.titleEn,
                  description: slide.description,
                  descriptionEn: slide.descriptionEn,
                }}
                onChange={(content) =>
                  updateSlide(index, content as Partial<typeof slide>)
                }
              />
            </details>
          ))}
        </>
      ) : (
        <div className="adm-hero-collage-images">
          <ImagePicker
            label="Ảnh chính của bố cục ảnh ghép"
            value={value.collageMain}
            references={references}
            onChange={(image) => onChange({ ...value, collageMain: image })}
          />
          <ImagePicker
            label="Ảnh phụ của bố cục ảnh ghép"
            value={value.collageSecondary}
            references={references}
            onChange={(image) =>
              onChange({ ...value, collageSecondary: image })
            }
          />
        </div>
      )}
      <p className="adm-hero-hint">
        Muốn dùng ảnh khác? Tải ảnh ở Thư viện ảnh, rồi quay lại chọn trong danh
        sách. Ảnh gốc không bị xoá khi bỏ slide.
      </p>
    </div>
  );
}
