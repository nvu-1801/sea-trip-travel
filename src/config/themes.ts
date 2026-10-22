import { z } from "zod";

/**
 * Public landing-page themes.
 *
 * A theme is a single entry with the complete token set. The public layout
 * applies `vars` as inline custom properties on `<html>`, and the Studio
 * preview applies the same object inside its preview island. Adding a theme
 * (Tết, Black Friday, a new season…) means adding one entry here — no component
 * or stylesheet changes are required, as long as the component uses the shared
 * design tokens.
 *
 * The `current` entry mirrors the tokens in `src/app/globals.css`; the layout
 * applies it explicitly so the Studio preview and the public page use exactly
 * the same source.
 */

export const THEME_IDS = [
  "current",
  "pink",
  "ocean",
  "nature",
  "sunset",
  "tet",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];
export type ThemeVars = Record<`--${string}`, string>;

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  description: string;
  /** Small optional label in the picker, e.g. "Theo mùa". */
  tag?: string;
  /** Four swatches: canvas, primary action, accent, dark panel. */
  swatch: readonly [string, string, string, string];
  vars: ThemeVars;
};

const current: ThemeVars = {
  "--color-brand-50": "#fdf5f7",
  "--color-brand-100": "#f8e4ea",
  "--color-brand-200": "#efccd7",
  "--color-brand-300": "#dfa9b9",
  "--color-brand-400": "#d17f97",
  "--color-brand-500": "#ff0366",
  "--color-brand-600": "#d81b60",
  "--color-brand-700": "#b0175a",
  "--color-brand-800": "#8c1248",
  "--color-brand-900": "#671032",
  "--color-sun-300": "#f0dcb4",
  "--color-sun-400": "#d9b26a",
  "--color-sun-500": "#c68f45",
  "--color-sun-600": "#b56f2f",
  "--color-background": "#f8f4f1",
  "--color-surface": "#fffdfc",
  "--color-surface-muted": "#f5ece8",
  "--color-surface-sunken": "#eee2dd",
  "--color-champagne": "#f2e3d2",
  "--color-champagne-deep": "#e4cdb7",
  "--color-rose-gold": "#c08a84",
  "--color-foreground": "#241a20",
  "--color-ink": "#241a20",
  "--color-foreground-muted": "#6b5a60",
  "--color-foreground-subtle": "#6f5d64",
  "--color-border": "#e8d8d2",
  "--color-border-strong": "#d7c2bb",
  "--color-primary": "#d81b60",
  "--color-primary-strong": "#a81455",
  "--color-primary-strong-hover": "#8c1248",
  "--color-primary-soft": "#f7e8ed",
  "--color-accent": "#d9b26a",
  "--color-accent-strong": "#7d5316",
  "--theme-dark": "#241a20",
  "--theme-dark-2": "#4a2a36",
  "--theme-on-dark": "#f0dcc6",
  "--theme-on-dark-accent": "#dfa9b9",
  "--theme-wordmark": "#ecddd5",
};

const pink: ThemeVars = {
  "--color-brand-50": "#fff1f6",
  "--color-brand-100": "#ffe3ee",
  "--color-brand-200": "#ffc7dd",
  "--color-brand-300": "#ff9dc2",
  "--color-brand-400": "#ff5c99",
  "--color-brand-500": "#ff0366",
  "--color-brand-600": "#e0005a",
  "--color-brand-700": "#c4004e",
  "--color-brand-800": "#9c003f",
  "--color-brand-900": "#7a0031",
  "--color-sun-300": "#ffd166",
  "--color-sun-400": "#ffbc0e",
  "--color-sun-500": "#ff9f1c",
  "--color-sun-600": "#ff7c2c",
  "--color-background": "#fffafc",
  "--color-surface": "#ffffff",
  "--color-surface-muted": "#fff4f8",
  "--color-surface-sunken": "#fdf0f5",
  "--color-champagne": "#fff1f6",
  "--color-champagne-deep": "#ffe3ee",
  "--color-rose-gold": "#e6a3b8",
  "--color-foreground": "#211621",
  "--color-ink": "#211621",
  "--color-foreground-muted": "#6e5c68",
  "--color-foreground-subtle": "#7b6876",
  "--color-border": "#f2dde7",
  "--color-border-strong": "#e6c6d6",
  "--color-primary": "#ff0366",
  "--color-primary-strong": "#d10053",
  "--color-primary-strong-hover": "#c4004e",
  "--color-primary-soft": "#fff1f6",
  "--color-accent": "#ffbc0e",
  "--color-accent-strong": "#8a5a14",
  "--theme-dark": "#4a0a26",
  "--theme-dark-2": "#7a0031",
  "--theme-on-dark": "#fff1f6",
  "--theme-on-dark-accent": "#ffc7dd",
  "--theme-wordmark": "#ffe3ee",
};

const ocean: ThemeVars = {
  "--color-brand-50": "#eef8fb",
  "--color-brand-100": "#d9eff6",
  "--color-brand-200": "#b9e1ec",
  "--color-brand-300": "#8ccbdd",
  "--color-brand-400": "#4faec7",
  "--color-brand-500": "#0b7f9e",
  "--color-brand-600": "#0b6e8a",
  "--color-brand-700": "#075a73",
  "--color-brand-800": "#05495e",
  "--color-brand-900": "#03394a",
  "--color-sun-300": "#f0dcb4",
  "--color-sun-400": "#e0b56a",
  "--color-sun-500": "#c68f45",
  "--color-sun-600": "#b56f2f",
  "--color-background": "#f2f8fa",
  "--color-surface": "#ffffff",
  "--color-surface-muted": "#e7f1f5",
  "--color-surface-sunken": "#d8e8ef",
  "--color-champagne": "#eaf5f9",
  "--color-champagne-deep": "#cfe6ee",
  "--color-rose-gold": "#93b9c6",
  "--color-foreground": "#0e2733",
  "--color-ink": "#0e2733",
  "--color-foreground-muted": "#4a6674",
  "--color-foreground-subtle": "#4d6874",
  "--color-border": "#d1e3ea",
  "--color-border-strong": "#b6d2dc",
  "--color-primary": "#0b6e8a",
  "--color-primary-strong": "#075a73",
  "--color-primary-strong-hover": "#064b60",
  "--color-primary-soft": "#e5f3f8",
  "--color-accent": "#d9a441",
  "--color-accent-strong": "#7d5316",
  "--theme-dark": "#062b3a",
  "--theme-dark-2": "#0b4a5e",
  "--theme-on-dark": "#eaf7fb",
  "--theme-on-dark-accent": "#8ccbdd",
  "--theme-wordmark": "#d9eff6",
};

const nature: ThemeVars = {
  "--color-brand-50": "#f2f7ef",
  "--color-brand-100": "#e4efdf",
  "--color-brand-200": "#cadfc3",
  "--color-brand-300": "#a8caa0",
  "--color-brand-400": "#7cb073",
  "--color-brand-500": "#2f8a4a",
  "--color-brand-600": "#2f6b3a",
  "--color-brand-700": "#24562e",
  "--color-brand-800": "#1c4725",
  "--color-brand-900": "#15381d",
  "--color-sun-300": "#f0e2c0",
  "--color-sun-400": "#d9b26a",
  "--color-sun-500": "#c68f45",
  "--color-sun-600": "#b56f2f",
  "--color-background": "#f7f5ec",
  "--color-surface": "#fffef9",
  "--color-surface-muted": "#eef0e2",
  "--color-surface-sunken": "#e2e7d4",
  "--color-champagne": "#f1ecd8",
  "--color-champagne-deep": "#e0d5b8",
  "--color-rose-gold": "#b9a77c",
  "--color-foreground": "#1f2a1d",
  "--color-ink": "#1f2a1d",
  "--color-foreground-muted": "#56624c",
  "--color-foreground-subtle": "#5e6a54",
  "--color-border": "#dbe2cf",
  "--color-border-strong": "#c5d1b8",
  "--color-primary": "#2f6b3a",
  "--color-primary-strong": "#24562e",
  "--color-primary-strong-hover": "#1c4725",
  "--color-primary-soft": "#e8f2e5",
  "--color-accent": "#c08b3e",
  "--color-accent-strong": "#7d5316",
  "--theme-dark": "#1b2a1b",
  "--theme-dark-2": "#2f4a2a",
  "--theme-on-dark": "#f1f5e8",
  "--theme-on-dark-accent": "#cadfc3",
  "--theme-wordmark": "#e4efdf",
};

const sunset: ThemeVars = {
  "--color-brand-50": "#fdf2ec",
  "--color-brand-100": "#fbe3d6",
  "--color-brand-200": "#f5c8b2",
  "--color-brand-300": "#eda88b",
  "--color-brand-400": "#dc7c5c",
  "--color-brand-500": "#d05a38",
  "--color-brand-600": "#b34a2f",
  "--color-brand-700": "#933a24",
  "--color-brand-800": "#7c2f1d",
  "--color-brand-900": "#64261a",
  "--color-sun-300": "#ffe0b0",
  "--color-sun-400": "#e8b05a",
  "--color-sun-500": "#cf8d3a",
  "--color-sun-600": "#b56f2f",
  "--color-background": "#fdf6f0",
  "--color-surface": "#fffdf9",
  "--color-surface-muted": "#f9ece2",
  "--color-surface-sunken": "#f1ddd0",
  "--color-champagne": "#f7e3d2",
  "--color-champagne-deep": "#e8cbb7",
  "--color-rose-gold": "#c99a86",
  "--color-foreground": "#2e211d",
  "--color-ink": "#2e211d",
  "--color-foreground-muted": "#6b5750",
  "--color-foreground-subtle": "#735f57",
  "--color-border": "#ecd6c8",
  "--color-border-strong": "#ddc0ae",
  "--color-primary": "#b34a2f",
  "--color-primary-strong": "#933a24",
  "--color-primary-strong-hover": "#7c2f1d",
  "--color-primary-soft": "#fbece5",
  "--color-accent": "#d9a441",
  "--color-accent-strong": "#7d5316",
  "--theme-dark": "#3a1c14",
  "--theme-dark-2": "#6a2d1e",
  "--theme-on-dark": "#fdf0e6",
  "--theme-on-dark-accent": "#f5c8b2",
  "--theme-wordmark": "#fbe3d6",
};

const tet: ThemeVars = {
  "--color-brand-50": "#fff2ef",
  "--color-brand-100": "#ffe1dc",
  "--color-brand-200": "#ffc5bb",
  "--color-brand-300": "#f79c8c",
  "--color-brand-400": "#e56a58",
  "--color-brand-500": "#d63a30",
  "--color-brand-600": "#b51f2e",
  "--color-brand-700": "#8f1522",
  "--color-brand-800": "#75101b",
  "--color-brand-900": "#5c0c15",
  "--color-sun-300": "#ffe6a8",
  "--color-sun-400": "#e8b84a",
  "--color-sun-500": "#d19a2e",
  "--color-sun-600": "#b57a1f",
  "--color-background": "#fff8f0",
  "--color-surface": "#fffdf8",
  "--color-surface-muted": "#fbe9dd",
  "--color-surface-sunken": "#f2d8c6",
  "--color-champagne": "#f7e3c0",
  "--color-champagne-deep": "#e7c99a",
  "--color-rose-gold": "#c99a6a",
  "--color-foreground": "#2a1517",
  "--color-ink": "#2a1517",
  "--color-foreground-muted": "#6e4a4a",
  "--color-foreground-subtle": "#775451",
  "--color-border": "#edd3c5",
  "--color-border-strong": "#ddb9a6",
  "--color-primary": "#b51f2e",
  "--color-primary-strong": "#8f1522",
  "--color-primary-strong-hover": "#75101b",
  "--color-primary-soft": "#fbe7e7",
  "--color-accent": "#d4a23a",
  "--color-accent-strong": "#7d5316",
  "--theme-dark": "#4a1218",
  "--theme-dark-2": "#7a1d25",
  "--theme-on-dark": "#fff1dc",
  "--theme-on-dark-accent": "#f7d9a0",
  "--theme-wordmark": "#ffe1dc",
};

export const THEMES: readonly ThemeDefinition[] = [
  {
    id: "current",
    label: "Hiện tại",
    description:
      "Rose-ivory, mận espresso và champagne gold. Giao diện đang dùng trên website.",
    swatch: ["#f8f4f1", "#a81455", "#d9b26a", "#241a20"],
    vars: current,
  },
  {
    id: "pink",
    label: "Hồng",
    description:
      "Nền hồng phấn và điểm nhấn hồng logo như phiên bản trước; mềm và nữ tính nhưng vẫn rõ chữ.",
    swatch: ["#fffafc", "#d10053", "#ffbc0e", "#4a0a26"],
    vars: pink,
  },
  {
    id: "ocean",
    label: "Đại dương",
    description:
      "Xanh biển, trắng sứ và cát vàng. Cảm giác thư thái, trong trẻo và dễ đọc.",
    swatch: ["#f2f8fa", "#075a73", "#d9a441", "#062b3a"],
    vars: ocean,
  },
  {
    id: "nature",
    label: "Thiên nhiên",
    description:
      "Xanh lá, kem ấm và mật ong. Gần gũi, nhẹ nhàng, phù hợp với tour sinh thái.",
    swatch: ["#f7f5ec", "#24562e", "#c08b3e", "#1b2a1b"],
    vars: nature,
  },
  {
    id: "sunset",
    label: "Hoàng hôn",
    description:
      "Cam đào, cát ấm và gold. Không khí ấm áp cho các chuyến đi cuối ngày và mùa hè.",
    swatch: ["#fdf6f0", "#933a24", "#d9a441", "#3a1c14"],
    vars: sunset,
  },
  {
    id: "tet",
    label: "Tết",
    description:
      "Đỏ son, vàng kim và kem ấm. Theme theo mùa, có thể bật khi đến Tết và tắt sau đó.",
    tag: "Theo mùa",
    swatch: ["#fff8f0", "#8f1522", "#d4a23a", "#4a1218"],
    vars: tet,
  },
];

export const DEFAULT_THEME_ID: ThemeId = "current";

export const themeIdSchema = z.enum(THEME_IDS);

export function themeById(id: string | null | undefined): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
