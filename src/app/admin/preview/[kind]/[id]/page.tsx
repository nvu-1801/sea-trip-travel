import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { session } from "@/server/cms/auth";
import { list } from "@/server/cms/store";
function Content({ value }: { value: unknown }): React.ReactNode {
  if (value === null || value === undefined || typeof value === "boolean")
    return null;
  if (typeof value === "string" || typeof value === "number")
    return <p>{String(value)}</p>;
  if (Array.isArray(value))
    return (
      <div>
        {value.map((item, i) => (
          <section key={i}>
            <Content value={item} />
          </section>
        ))}
      </div>
    );
  const item = value as Record<string, unknown>;
  if (typeof item.src === "string")
    return (
      <figure>
        <Image
          src={item.src}
          alt={String(item.alt ?? "")}
          width={900}
          height={450}
          unoptimized
          style={{
            maxWidth: "100%",
            height: "auto",
            maxHeight: 450,
            objectFit: "contain",
          }}
        />
        <figcaption>{String(item.caption ?? "")}</figcaption>
      </figure>
    );
  return (
    <section>
      {item.title ? <h2>{String(item.title)}</h2> : null}
      {Object.entries(item)
        .filter(
          ([key]) =>
            ![
              "id",
              "slug",
              "title",
              "categoryIds",
              "destinationIds",
              "sourceDocuments",
              "seo",
              "updatedAt",
              "contentStatus",
            ].includes(key),
        )
        .map(([key, child]) => (
          <Content key={key} value={child} />
        ))}
    </section>
  );
}
export default async function Preview({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  if (!(await session())) redirect("/admin");
  const { kind, id } = await params;
  if (kind !== "tours" && kind !== "articles") notFound();
  const row = list(kind).find((row) => row.id === id);
  if (!row) notFound();
  return (
    <main className="adm-preview">
      <Link href="/admin">← Về Studio</Link>
      <p className="adm-eyebrow">Bản nháp đã lưu · chỉ chủ quản trị thấy</p>
      <h1>{String(row.data.title)}</h1>
      <Content value={row.data} />
    </main>
  );
}
