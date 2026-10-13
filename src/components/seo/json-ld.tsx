/**
 * Renders a JSON-LD `<script>` tag.
 *
 * `dangerouslySetInnerHTML` is the only way to emit inline JSON-LD, and it is
 * safe here because the data is ours (built by `lib/json-ld.ts`), never user
 * input. The serialiser still escapes `<`, `>`, `&` and the line separators so
 * a future content field containing `</script>` cannot break out.
 */
function serialize(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ data, id }: { data: unknown; id?: string }) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}
