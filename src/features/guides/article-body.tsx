import type { ArticleBlock } from "@/domain/article";
import { AssetImage } from "@/components/ui/asset-image";
import { AlertIcon, InfoIcon, TipIcon } from "@/components/ui/icons";

/**
 * Renders structured article blocks.
 *
 * There is no `dangerouslySetInnerHTML` here and no Markdown pipeline: the
 * discriminated union is exhausted explicitly, so an unknown block type is a
 * TypeScript error rather than a silent render of untrusted markup.
 */
export function ArticleBody({ blocks }: { blocks: readonly ArticleBlock[] }) {
  return (
    <div className="article-content">
      {blocks.map((block, index) => (
        <ArticleBlockView key={index} block={block} />
      ))}
    </div>
  );
}

function ArticleBlockView({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p>{block.text}</p>;

    case "heading":
      return block.level === 2 ? <h2>{block.text}</h2> : <h3>{block.text}</h3>;

    case "list":
      return block.ordered ? (
        <ol>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );

    case "quote":
      return (
        <blockquote>
          {block.text}
          {block.cite ? <cite className="mt-2 block text-sm not-italic">— {block.cite}</cite> : null}
        </blockquote>
      );

    case "callout": {
      const icon =
        block.tone === "warning" ? AlertIcon : block.tone === "tip" ? TipIcon : InfoIcon;
      const Icon = icon;
      const toneClass = {
        info: "border-brand-200 bg-primary-soft",
        tip: "border-success/25 bg-success-soft",
        warning: "border-amber-200 bg-warning-soft",
      }[block.tone];
      const iconClass = {
        info: "text-primary-strong",
        tip: "text-success",
        warning: "text-warning",
      }[block.tone];

      return (
        <aside className={`not-prose flex gap-3 rounded-xl border p-4 ${toneClass}`}>
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />
          <div className="text-[0.9375rem] leading-relaxed text-foreground">
            {block.title ? <p className="font-bold">{block.title}</p> : null}
            <p className={block.title ? "mt-1" : undefined}>{block.text}</p>
          </div>
        </aside>
      );
    }

    case "image":
      return (
        <figure className="not-prose my-6">
          <AssetImage
            image={{ src: block.src, alt: block.alt }}
            altFallback={block.alt}
            sizes="(max-width: 768px) 100vw, 42rem"
            className="aspect-[16/9] w-full rounded-xl border border-border"
            markPlaceholder
          />
          {block.caption ? (
            <figcaption className="mt-2 text-center text-sm text-foreground-muted">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );

    default: {
      // Exhaustiveness guard — adding a block type without handling it here
      // becomes a compile error.
      const never: never = block;
      return never;
    }
  }
}
