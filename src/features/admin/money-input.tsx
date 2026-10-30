"use client";

import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";

const VND = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

/** Keep only digits: "1.250.000 ₫" -> "1250000". */
export function digitsOf(value: string | number): string {
  return String(value ?? "").replace(/[^\d]/g, "");
}

/** Vietnamese thousands grouping: "1250000" -> "1.250.000". */
export function formatThousands(value: string | number): string {
  const digits = digitsOf(value);
  return digits ? VND.format(Number(digits)) : "";
}

type MoneyTextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  /** Raw digits (or a number). The component formats the visible value. */
  value: string | number;
  /** Receives raw digits, so callers keep the existing numeric contract. */
  onValueChange: (digits: string) => void;
  suffix?: string;
};

/**
 * Shared money input.
 *
 * The DOM value is grouped with Vietnamese thousands separators while the form
 * state stays raw digits/numbers. The caret is restored after formatting so
 * editing in the middle of a price does not jump to the end.
 */
export function MoneyTextInput({
  value,
  onValueChange,
  suffix = "₫",
  ...inputProps
}: MoneyTextInputProps) {
  const [text, setText] = useState(() => formatThousands(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // While the visitor is typing, keep the local caret/text in control. The
    // parent can update the value without snapping the input or the caret.
    if (inputRef.current === document.activeElement) return;
    const formatted = formatThousands(value);
    setText((current) =>
      digitsOf(current) === digitsOf(formatted) ? current : formatted,
    );
  }, [value]);

  return (
    <span className="adm-money-input">
      <input
        {...inputProps}
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          const caret = event.currentTarget.selectionStart ?? raw.length;
          const digitsBefore = digitsOf(raw.slice(0, caret)).length;
          const digits = digitsOf(raw);
          const next = formatThousands(digits);
          setText(next);
          onValueChange(digits);
          requestAnimationFrame(() => {
            const input = inputRef.current;
            if (!input) return;
            let position = 0;
            let seen = 0;
            while (position < next.length && seen < digitsBefore) {
              if (/\d/.test(next[position])) seen += 1;
              position += 1;
            }
            input.setSelectionRange(position, position);
          });
        }}
        onBlur={(event) => {
          setText(formatThousands(value));
          inputProps.onBlur?.(event);
        }}
      />
      <span className="adm-money-suffix" aria-hidden="true">
        {suffix}
      </span>
    </span>
  );
}
