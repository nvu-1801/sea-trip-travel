import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_THEME_ID,
  THEMES,
  themeById,
  themeIdSchema,
} from "../src/config/themes";

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map(
    (offset) => parseInt(value.slice(offset, offset + 2), 16) / 255,
  );
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  return (
    (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
  );
}

const REQUIRED = [
  "--color-background",
  "--color-surface",
  "--color-surface-muted",
  "--color-surface-sunken",
  "--color-foreground",
  "--color-foreground-muted",
  "--color-foreground-subtle",
  "--color-border",
  "--color-border-strong",
  "--color-primary",
  "--color-primary-strong",
  "--color-primary-strong-hover",
  "--color-primary-soft",
  "--color-accent",
  "--color-accent-strong",
  "--color-brand-500",
  "--theme-dark",
  "--theme-dark-2",
  "--theme-on-dark",
  "--theme-on-dark-accent",
  "--theme-wordmark",
] as const;

test("theme ids are unique and every theme is complete", () => {
  const ids = THEMES.map((theme) => theme.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const theme of THEMES) {
    for (const key of REQUIRED) {
      assert.match(
        theme.vars[key] ?? "",
        /^#[0-9a-f]{6}$/i,
        `${theme.id} is missing ${key}`,
      );
    }
    assert.equal(theme.swatch.length, 4);
    assert.ok(theme.label && theme.description);
  }
});

test("theme schema accepts every configured id and rejects unknown ids", () => {
  for (const theme of THEMES) assert.equal(themeIdSchema.parse(theme.id), theme.id);
  assert.throws(() => themeIdSchema.parse("midnight"));
});

test("themeById falls back to the default theme", () => {
  assert.equal(themeById(undefined).id, DEFAULT_THEME_ID);
  assert.equal(themeById("missing").id, DEFAULT_THEME_ID);
  assert.equal(themeById("ocean").id, "ocean");
});

test("every theme keeps body text and primary controls readable", () => {
  for (const theme of THEMES) {
    const v = theme.vars;
    const pairs: [string, string, string][] = [
      ["foreground/background", v["--color-foreground"], v["--color-background"]],
      [
        "muted/background",
        v["--color-foreground-muted"],
        v["--color-background"],
      ],
      [
        "subtle/sunken",
        v["--color-foreground-subtle"],
        v["--color-surface-sunken"],
      ],
      [
        "primary-strong/background",
        v["--color-primary-strong"],
        v["--color-background"],
      ],
      [
        "accent-strong/background",
        v["--color-accent-strong"],
        v["--color-background"],
      ],
      [
        "white/primary-strong",
        "#ffffff",
        v["--color-primary-strong"],
      ],
      ["on-dark/dark", v["--theme-on-dark"], v["--theme-dark"]],
    ];
    for (const [name, foreground, background] of pairs) {
      assert.ok(
        contrast(foreground, background) >= 4.5,
        `${theme.id}: ${name} = ${contrast(foreground, background).toFixed(2)}`,
      );
    }
  }
});
