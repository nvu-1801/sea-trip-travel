import type { ArticleRecord } from "@/server/repo/types";

/** Article editor view-model (plain module so a Server Component can build it). */

export type ArticleFormBlock = {
  /** Stable key for React lists; never submitted. */
  key: string;
  type: "paragraph" | "heading" | "list" | "quote" | "callout" | "image";
  text: string;
  level: "2" | "3";
  ordered: boolean;
  items: string;
  cite: string;
  tone: "info" | "tip" | "warning";
  title: string;
  src: string;
  alt: string;
  caption: string;
};

export type ArticleFormState = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  readingMinutes: string;
  coverSrc: string;
  coverAlt: string;
  tags: string;
  destinationIds: string[];
  relatedTourSlugs: string[];
  body: ArticleFormBlock[];
  publishedAt: string;
  updatedAt: string;
  seoTitle: string;
  seoDescription: string;
  seoOgImage: string;
  contentStatus: "demo" | "verified";
  status: "draft" | "published" | "hidden";
  featured: boolean;
  sortOrder: string;
};

let blockCounter = 0;
export function newBlockKey(): string {
  blockCounter += 1;
  return `block-${Date.now()}-${blockCounter}`;
}

export function emptyBlock(type: ArticleFormBlock["type"]): ArticleFormBlock {
  return {
    key: newBlockKey(),
    type,
    text: "",
    level: "2",
    ordered: false,
    items: "",
    cite: "",
    tone: "info",
    title: "",
    src: "",
    alt: "",
    caption: "",
  };
}

export function emptyArticleForm(): ArticleFormState {
  return {
    slug: "",
    title: "",
    excerpt: "",
    author: "SEA TRIP TRAVEL",
    readingMinutes: "",
    coverSrc: "",
    coverAlt: "",
    tags: "",
    destinationIds: [],
    relatedTourSlugs: [],
    body: [emptyBlock("paragraph")],
    // Left empty on purpose: the current date is filled in by the editor's
    // client-side initialiser. `new Date()` here would run during a prerender.
    publishedAt: "",
    updatedAt: "",
    seoTitle: "",
    seoDescription: "",
    seoOgImage: "",
    contentStatus: "demo",
    status: "draft",
    featured: false,
    sortOrder: "0",
  };
}

export function articleToFormState(record: ArticleRecord): ArticleFormState {
  const article = record.article;
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    author: article.author,
    readingMinutes: article.readingMinutes ? String(article.readingMinutes) : "",
    coverSrc: article.cover?.src ?? "",
    coverAlt: article.cover?.alt ?? "",
    tags: article.tags.join("\n"),
    destinationIds: [...article.destinationIds],
    relatedTourSlugs: [...article.relatedTourSlugs],
    body: article.body.map((block) => {
      const base = emptyBlock(block.type);
      switch (block.type) {
        case "paragraph":
        case "heading":
          return { ...base, text: block.text, level: block.type === "heading" ? String(block.level) as "2" | "3" : "2" };
        case "list":
          return { ...base, items: block.items.join("\n"), ordered: block.ordered };
        case "quote":
          return { ...base, text: block.text, cite: block.cite ?? "" };
        case "callout":
          return { ...base, tone: block.tone, title: block.title ?? "", text: block.text };
        case "image":
          return { ...base, src: block.src ?? "", alt: block.alt, caption: block.caption ?? "" };
        default:
          return base;
      }
    }),
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt ?? "",
    seoTitle: article.seo?.title ?? "",
    seoDescription: article.seo?.description ?? "",
    seoOgImage: article.seo?.ogImage ?? "",
    contentStatus: article.contentStatus,
    status: record.status,
    featured: record.featured,
    sortOrder: String(record.sortOrder),
  };
}

/** Convert the editor state into the validated `ArticleBlock[]` union. */
export function blocksToPayload(blocks: ArticleFormBlock[]): unknown[] {
  const split = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  return blocks
    .map((block) => {
      switch (block.type) {
        case "paragraph":
          return block.text.trim() ? { type: "paragraph", text: block.text.trim() } : null;
        case "heading":
          return block.text.trim()
            ? { type: "heading", level: Number(block.level) as 2 | 3, text: block.text.trim() }
            : null;
        case "list": {
          const items = split(block.items);
          return items.length > 0 ? { type: "list", ordered: block.ordered, items } : null;
        }
        case "quote":
          return block.text.trim()
            ? { type: "quote", text: block.text.trim(), ...(block.cite.trim() ? { cite: block.cite.trim() } : {}) }
            : null;
        case "callout":
          return block.text.trim()
            ? {
                type: "callout",
                tone: block.tone,
                text: block.text.trim(),
                ...(block.title.trim() ? { title: block.title.trim() } : {}),
              }
            : null;
        case "image":
          return block.alt.trim()
            ? {
                type: "image",
                alt: block.alt.trim(),
                ...(block.src.trim() ? { src: block.src.trim() } : {}),
                ...(block.caption.trim() ? { caption: block.caption.trim() } : {}),
              }
            : null;
        default:
          return null;
      }
    })
    .filter((block): block is NonNullable<typeof block> => block !== null);
}
