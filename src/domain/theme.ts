import { z } from "zod";
import { DEFAULT_THEME_ID, themeIdSchema } from "@/config/themes";

/**
 * The selected public theme is its own one-row CMS collection.
 *
 * Keeping it out of `settings` matters: settings also carries hotline, footer
 * and contact copy, so publishing a theme must not accidentally publish someone
 * else's unpublished settings draft. The theme record has its own revision and
 * draft/publish lifecycle.
 */
export const themeRecordSchema = z.object({
  id: z.literal("site"),
  theme: themeIdSchema.default(DEFAULT_THEME_ID),
});

export type ThemeRecord = z.infer<typeof themeRecordSchema>;

export const defaultThemeRecord: ThemeRecord = {
  id: "site",
  theme: DEFAULT_THEME_ID,
};
