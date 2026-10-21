import { ArticleBody } from "@/features/guides/article-body";
import { AssetImage } from "@/components/ui/asset-image";
import type { ContentPage } from "@/domain/page";
import type { Locale } from "@/i18n/config";
export function ContentPageView({
  page,
  locale,
}: {
  page: ContentPage;
  locale: Locale;
}) {
  const en = locale === "en";
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      {en && !page.translationReviewed && (
        <p role="note" className="mb-5 rounded-lg bg-primary-soft p-4">
          Bản dịch chưa được duyệt. Nội dung tiếng Việt được giữ khi chưa có bản
          dịch.
        </p>
      )}
      <h1 className="text-display font-display">
        {en && page.titleEn ? page.titleEn : page.title}
      </h1>
      <p className="my-5 text-foreground-muted">
        {en && page.summaryEn ? page.summaryEn : page.summary}
      </p>
      {page.cover && (
        <AssetImage
          image={page.cover}
          className="my-6 aspect-video rounded-xl"
          sizes="(max-width: 768px) 100vw, 48rem"
        />
      )}
      <ArticleBody
        blocks={en && page.bodyEn.length ? page.bodyEn : page.body}
      />
    </article>
  );
}
