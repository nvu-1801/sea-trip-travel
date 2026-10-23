"use client";

import Image from "next/image";
import { Editor, type EditorValue, type ReferenceOptions } from "./editor";
import { ImageField, type UploadedImage } from "./image-picker";
import "./home-regions-editor.css";

export type RegionEditorRow = {
  id: string;
  revision: number;
  state: string;
  data: Record<string, EditorValue>;
};

export function HomeRegionsEditor({
  value,
  cards,
  references,
  onUploadImage,
  onChange,
  onCardsChange,
}: {
  value: EditorValue;
  cards: RegionEditorRow[];
  references: ReferenceOptions;
  onUploadImage: (file: File) => Promise<UploadedImage>;
  onChange: (value: EditorValue) => void;
  onCardsChange: (cards: RegionEditorRow[]) => void;
}) {
  const patch = (id: string, fields: Record<string, EditorValue>) =>
    onCardsChange(
      cards.map((card) =>
        card.id === id ? { ...card, data: { ...card.data, ...fields } } : card,
      ),
    );
  return (
    <div className="adm-regions-editor">
      <p className="adm-regions-note">
        Sửa nội dung chung và ảnh từng vùng tại đây, sau đó lưu hoặc xuất bản
        một lần. Tên, ảnh và mô tả dùng chung với Danh mục, menu và trang vùng
        miền. Số hành trình được tính tự động.
      </p>
      <Editor
        value={value}
        name="regions"
        references={references}
        onUploadImage={onUploadImage}
        onChange={onChange}
      />
      <h3>Các thẻ vùng miền</h3>
      {!cards.length && (
        <p>
          Chưa có danh mục vùng miền. Thêm danh mục con trong Tour Trong Nước
          trước.
        </p>
      )}
      {cards.map((card, index) => {
        const image = (card.data.image ?? {}) as Record<string, EditorValue>;
        const src = String(image.src ?? "");
        const name = String(card.data.name ?? "");
        const tagline = String(card.data.tagline ?? "");
        return (
          <section
            key={card.id}
            className="adm-region-card"
            aria-label={`Thẻ vùng miền ${index + 1}`}
          >
            <div className="adm-region-card-heading">
              <h4>{name || `Vùng ${index + 1}`}</h4>
              <span className="adm-badge">
                {card.state === "published" ? "Đang xuất bản" : "Có bản nháp"}
              </span>
            </div>
            <div className="adm-region-card-grid">
              <div>
                <label className="adm-field">
                  Tên vùng miền
                  <input
                    value={name}
                    maxLength={160}
                    onChange={(event) =>
                      patch(card.id, { name: event.target.value })
                    }
                  />
                </label>
                <label className="adm-field">
                  Mô tả địa điểm
                  <textarea
                    value={tagline}
                    maxLength={600}
                    placeholder={String(card.data.description ?? "")}
                    onChange={(event) =>
                      patch(card.id, { tagline: event.target.value })
                    }
                  />
                </label>
                <ImageField
                  sizeGuide="Thẻ vùng miền: nên dùng 1200 × 1600 px (3:4), tối thiểu 900 × 1200 px. Giữ chủ thể ở giữa vì ảnh được cắt khác nhau trên máy tính và điện thoại."
                  label="Ảnh vùng miền"
                  value={src}
                  media={references.media ?? []}
                  alt={String(image.alt ?? name)}
                  altRequired
                  onAltChange={(alt) =>
                    patch(card.id, { image: { ...image, alt } })
                  }
                  onUpload={onUploadImage}
                  onChange={(next, alt) =>
                    patch(card.id, {
                      image: {
                        ...(next ? { ...image, src: next } : {}),
                        alt: alt || String(image.alt ?? name),
                      },
                    })
                  }
                  whereUsed="Ảnh thẻ vùng miền trên trang chủ và danh mục. Nên dùng ảnh từ 1200 × 1600 px, chủ thể ở giữa để cắt ảnh đẹp trên điện thoại."
                />
              </div>
              <div
                className="adm-region-preview"
                aria-label={`Xem trước ${name}`}
              >
                {src && (
                  <Image
                    src={src}
                    alt={String(image.alt ?? name)}
                    fill
                    sizes="320px"
                    unoptimized
                  />
                )}
                <div>
                  <small>Xem trước thẻ</small>
                  <h3>{name.replace(/^Tour /, "")}</h3>
                  <p>{tagline || String(card.data.description ?? "")}</p>
                  <span>Khám phá miền đất này ↗</span>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
