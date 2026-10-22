"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_TOUR_CHATGPT_FOCUS,
  TOUR_CHATGPT_FOCUS,
  buildChatGptComposerUrl,
  buildTourChatGptPrompt,
  type TourChatGptFocus,
  type TourChatGptReferences,
} from "./tour-chatgpt-prompt";

type Status = { kind: "ok" | "warn" | "error"; text: string } | null;

/** Clipboard API needs HTTPS; the textarea trick keeps localhost/LAN working. */
async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * "Gợi ý nội dung với ChatGPT" panel for the tour editor.
 *
 * Two outcomes are supported on purpose:
 *  - ChatGPT accepts the prompt in the URL (`?q=`) for short drafts.
 *  - Long drafts exceed URL limits, so the text is copied and the editor pastes
 *    it manually. Both paths are explained in the on-screen checklist.
 */
export function TourChatGptHelper({
  data,
  references,
}: {
  data: unknown;
  references?: TourChatGptReferences;
}) {
  const [focus, setFocus] = useState<TourChatGptFocus[]>([
    ...DEFAULT_TOUR_CHATGPT_FOCUS,
  ]);
  const [status, setStatus] = useState<Status>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const prompt = useMemo(
    () => buildTourChatGptPrompt(data, { focus, references }),
    [data, focus, references],
  );
  const { url, prefilled } = useMemo(
    () => buildChatGptComposerUrl(prompt),
    [prompt],
  );

  const toggleFocus = (key: TourChatGptFocus) =>
    setFocus((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );

  const copyOnly = async () => {
    const copied = await copyText(prompt);
    setStatus(
      copied
        ? {
            kind: "ok",
            text: "Đã copy nội dung tour. Mở chatgpt.com (hoặc Gemini/Copilot) và dán bằng Ctrl + V rồi Enter.",
          }
        : {
            kind: "warn",
            text: "Trình duyệt chặn copy tự động. Mở ô “Xem nội dung sẽ gửi” bên dưới, bấm “Chọn tất cả” rồi Ctrl + C.",
          },
    );
  };

  /** Anchor click: copy first, keep the tab navigation the browser already allows. */
  const copyAndOpen = async () => {
    const copied = await copyText(prompt);
    if (!copied) {
      setStatus({
        kind: "warn",
        text: "ChatGPT đã mở nhưng trình duyệt chặn copy. Mở ô “Xem nội dung sẽ gửi”, bấm “Chọn tất cả” rồi Ctrl + C và dán vào ChatGPT.",
      });
      return;
    }
    setStatus(
      prefilled
        ? {
            kind: "ok",
            text: "Đã copy nội dung và mở ChatGPT. Nếu ô nhập đã có nội dung, chỉ cần bấm Enter; nếu ô trống thì dán bằng Ctrl + V.",
          }
        : {
            kind: "warn",
            text: "Nội dung dài hơn giới hạn của link nên chưa điền sẵn vào ChatGPT. Nội dung đã được copy — ở tab ChatGPT bấm Ctrl + V rồi Enter.",
          },
    );
  };

  const disabled = focus.length === 0;

  return (
    <section
      id="tour-ai-helper"
      className="adm-tour-section adm-ai-helper"
      aria-labelledby="tour-ai-helper-title"
    >
      <header className="adm-tour-section-head">
        <div>
          <p>Trợ giúp nội dung</p>
          <h3 id="tour-ai-helper-title">Gợi ý nội dung với ChatGPT</h3>
          <small className="adm-hint">
            Gửi nội dung tour đang sửa sang ChatGPT để được gợi ý phần còn
            thiếu. Không tự lưu gì — bạn vẫn là người duyệt và dán lại.
          </small>
        </div>
      </header>

      <fieldset className="adm-ai-focus">
        <legend>Muốn ChatGPT gợi ý phần nào?</legend>
        <div className="adm-ai-focus-grid">
          {TOUR_CHATGPT_FOCUS.map((item) => {
            const checked = focus.includes(item.key);
            return (
              <label key={item.key} data-checked={checked}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFocus(item.key)}
                />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
              </label>
            );
          })}
        </div>
        {disabled ? (
          <p className="adm-field-error" role="alert">
            Chọn ít nhất một phần cần gợi ý.
          </p>
        ) : null}
      </fieldset>

      <div className="adm-ai-actions">
        {disabled ? (
          <button type="button" className="adm-primary" disabled>
            Copy nội dung &amp; mở ChatGPT
          </button>
        ) : (
          <a
            className="adm-ai-primary"
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={() => void copyAndOpen()}
          >
            Copy nội dung &amp; mở ChatGPT
          </a>
        )}
        <button type="button" disabled={disabled} onClick={() => void copyOnly()}>
          Chỉ copy nội dung
        </button>
        <button
          type="button"
          className="adm-ghost-link"
          aria-expanded={previewOpen}
          onClick={() => setPreviewOpen((open) => !open)}
        >
          {previewOpen ? "Ẩn nội dung sẽ gửi" : "Xem nội dung sẽ gửi"}
        </button>
        <span className="adm-ai-count">
          {prompt.length.toLocaleString("vi-VN")} ký tự
        </span>
      </div>

      <div
        className="adm-ai-status"
        data-kind={status?.kind ?? "idle"}
        role="status"
        aria-live="polite"
      >
        {status ? status.text : null}
      </div>

      {previewOpen ? (
        <div className="adm-ai-preview">
          <label htmlFor="tour-ai-prompt">Nội dung sẽ gửi ChatGPT</label>
          <textarea
            id="tour-ai-prompt"
            readOnly
            rows={14}
            value={prompt}
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="adm-ai-preview-actions">
            <button
              type="button"
              onClick={() => {
                const area = document.getElementById(
                  "tour-ai-prompt",
                ) as HTMLTextAreaElement | null;
                area?.focus();
                area?.select();
              }}
            >
              Chọn tất cả
            </button>
            <small className="adm-hint">
              Bấm “Chọn tất cả” rồi Ctrl + C nếu nút copy không hoạt động.
            </small>
          </div>
        </div>
      ) : null}

      <div className="adm-ai-steps">
        <h4>Cách làm (3 bước)</h4>
        <ol>
          <li>
            Bấm <strong>Copy nội dung &amp; mở ChatGPT</strong>. Nội dung tour
            đang sửa — kể cả phần chưa lưu — được copy và ChatGPT mở ở tab mới.
          </li>
          <li>
            Ở tab ChatGPT: ô nhập đã có sẵn nội dung thì bấm <kbd>Enter</kbd>;
            nếu ô trống thì dán bằng <kbd>Ctrl</kbd> + <kbd>V</kbd> (Mac:{" "}
            <kbd>Cmd</kbd> + <kbd>V</kbd>) rồi <kbd>Enter</kbd>.
          </li>
          <li>
            Đọc gợi ý, copy phần muốn dùng rồi dán lại vào đúng ô trong form
            này (Giới thiệu, Điểm nổi bật, Lịch trình…), sau đó bấm{" "}
            <strong>Lưu</strong>.
          </li>
        </ol>
        <div className="adm-ai-notes">
          <p>
            <strong>Nếu không mở được ChatGPT:</strong> bấm{" "}
            <strong>Chỉ copy nội dung</strong>, tự mở{" "}
            <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">
              chatgpt.com
            </a>{" "}
            (hoặc Gemini, Copilot — dán được ở đâu cũng dùng được), dán nội
            dung rồi Enter. Không copy tự động được thì mở “Xem nội dung sẽ
            gửi” để copy tay.
          </p>
          <p>
            <strong>Trước khi lưu:</strong> kiểm tra lại giá, thời gian, điểm
            đón và chính sách huỷ. AI có thể viết đúng văn phong nhưng sai số
            liệu; chỗ nào ghi <code>[cần xác nhận: …]</code> là chỗ bạn phải
            điền thông tin thật.
          </p>
          <p>
            Chỉ phần chữ trong form được gửi đi: không gửi ảnh, không gửi giá
            nội bộ, không gửi thông tin khách hàng.
          </p>
        </div>
      </div>
    </section>
  );
}
