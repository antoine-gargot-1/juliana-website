/**
 * Renders structured data as a real <script type="application/ld+json"> tag in
 * the statically generated HTML, so crawlers see it without executing JS.
 */
export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify output is escaped for the one sequence that can break
          // out of a <script> element.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
