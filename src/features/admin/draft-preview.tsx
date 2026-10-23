"use client";

import { useState } from "react";
import { rec, recordsOf, stringsOf, textOf } from "./tour-editor-fields";

function TextList({ title, value }: { title: string; value: unknown }) {
  const items = stringsOf(value).filter(Boolean);
  return items.length ? (
    <section>
      <h4>{title}</h4>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  ) : null;
}

/** Render local form values, including incomplete drafts, without saving or publishing. */
export function DraftPreview({
  kind,
  data,
}: {
  kind: "tours" | "articles";
  data: Record<string, unknown>;
}) {
  const [active, setActive] = useState(0);
  const images = kind === "tours" ? recordsOf(data.images) : [rec(data.cover)];
  const index = Math.min(active, Math.max(0, images.length - 1));
  const image = images[index];
  const src = textOf(image?.src);
  const amount = rec(data.priceFrom).amount;
  const title = textOf(data.title) || "Tiêu đề đang soạn";
  return (
    <details id="admin-draft-preview" className="adm-draft-preview">
      <summary>Xem trước ảnh và nội dung đang sửa</summary>
      <p className="adm-hint">
        Cập nhật theo form, kể cả nội dung chưa lưu. Bản xem trước rút gọn này
        chưa xuất bản lên website; dùng bản nháp đã lưu để kiểm tra giao diện
        đầy đủ.
      </p>
      <article
        className="adm-draft-page"
        aria-label="Bản xem trước nội dung đang sửa"
      >
        <p className="adm-eyebrow">
          {kind === "tours" ? "Chi tiết tour" : "Cẩm nang du lịch"}
        </p>
        <h3>{title}</h3>
        <p>{textOf(kind === "tours" ? data.summary : data.excerpt)}</p>
        <figure>
          <div className="adm-draft-photo">
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={textOf(image?.alt) || title} />
            ) : (
              <span>Chưa chọn ảnh</span>
            )}
          </div>
          {textOf(image?.caption) && (
            <figcaption>{textOf(image.caption)}</figcaption>
          )}
          {images.length > 1 && (
            <div
              className="adm-draft-thumbs"
              role="group"
              aria-label="Ảnh trong bản xem trước"
            >
              {images.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Xem ảnh ${i + 1}`}
                  aria-pressed={i === index}
                  onClick={() => setActive(i)}
                >
                  {textOf(item.src) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={textOf(item.src)} alt="" />
                  ) : (
                    i + 1
                  )}
                </button>
              ))}
            </div>
          )}
        </figure>
        {kind === "tours" ? (
          <>
            <p className="adm-draft-price">
              {typeof amount === "number" && amount > 0
                ? `Giá từ ${new Intl.NumberFormat("vi-VN").format(amount)} ₫`
                : "Liên hệ tư vấn"}
            </p>
            <TextList title="Giới thiệu" value={data.overview} />
            <TextList title="Điểm nổi bật" value={data.highlights} />
            {recordsOf(data.itinerary).map((day, i) => (
              <section key={i}>
                <h4>
                  Ngày {i + 1} · {textOf(day.title)}
                </h4>
                <p>{textOf(day.summary)}</p>
                <TextList title="Hoạt động" value={day.activities} />
              </section>
            ))}
            <TextList title="Dịch vụ bao gồm" value={data.included} />
            <TextList title="Không bao gồm" value={data.excluded} />
            <TextList title="Lưu ý" value={data.notes} />
            <TextList title="Chính sách" value={data.policies} />
          </>
        ) : (
          recordsOf(data.body).map((block, i) => (
            <section key={i}>
              {block.type === "heading" ? (
                <h4>{textOf(block.text)}</h4>
              ) : block.type === "image" ? (
                <figure>
                  {textOf(block.src) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="adm-draft-body-image"
                      src={textOf(block.src)}
                      alt={textOf(block.alt)}
                    />
                  )}
                  <figcaption>{textOf(block.caption)}</figcaption>
                </figure>
              ) : block.type === "list" ? (
                block.ordered ? (
                  <ol>
                    {stringsOf(block.items).map((x, j) => (
                      <li key={j}>{x}</li>
                    ))}
                  </ol>
                ) : (
                  <ul>
                    {stringsOf(block.items).map((x, j) => (
                      <li key={j}>{x}</li>
                    ))}
                  </ul>
                )
              ) : block.type === "quote" ? (
                <blockquote>
                  {textOf(block.text)}
                  {textOf(block.cite) && <cite>{textOf(block.cite)}</cite>}
                </blockquote>
              ) : (
                <>
                  <h4>{textOf(block.title)}</h4>
                  <p>{textOf(block.text)}</p>
                </>
              )}
            </section>
          ))
        )}
      </article>
    </details>
  );
}
