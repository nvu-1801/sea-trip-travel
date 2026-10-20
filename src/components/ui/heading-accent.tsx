/** Preserve translated/CMS copy when the preferred phrase is absent. */
export function HeadingAccent({
  text,
  phrase,
}: {
  text: string;
  phrase: string;
}) {
  const start = text.indexOf(phrase);
  if (start < 0) return text;
  return (
    <>
      {text.slice(0, start)}
      <em>{phrase}</em>
      {text.slice(start + phrase.length)}
    </>
  );
}
