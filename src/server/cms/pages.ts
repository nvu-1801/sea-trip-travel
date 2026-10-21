import "server-only";
import { published, settings } from "./store";
import { pageSeeds } from "@/content/pages";
import { contentPageSchema } from "@/domain/page";
export function contentPages() {
  return published("pages", pageSeeds).map((page) =>
    contentPageSchema.parse(page),
  );
}
export function contentPage(slug: string) {
  const page = contentPages().find((page) => page.slug === slug);
  if (!page) return undefined;
  const config = settings();
  const tokens: Record<string, string> = {
    siteName: config.name,
    ...config.contact,
  };
  const resolve = (value: unknown): unknown =>
    typeof value === "string"
      ? value.replace(
          /\{(siteName|address|email|hotline)\}/g,
          (token, key: string) => tokens[key] ?? token,
        )
      : Array.isArray(value)
        ? value.map(resolve)
        : value && typeof value === "object"
          ? Object.fromEntries(
              Object.entries(value).map(([key, child]) => [
                key,
                resolve(child),
              ]),
            )
          : value;
  return contentPageSchema.parse(resolve(page));
}
