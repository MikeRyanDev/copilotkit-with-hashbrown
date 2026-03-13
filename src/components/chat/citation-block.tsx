export function CitationBlock({
  text,
  source,
}: {
  text: string;
  source: string;
}) {
  return (
    <figure className="my-5 w-full max-w-[720px]">
      <blockquote className="rounded-[20px] border-l-4 border-[var(--sky-blue-dark)] bg-[rgba(242,248,255,0.76)] px-5 py-4 text-[1rem] italic leading-7 text-[var(--gray-dark)]">
        {text}
      </blockquote>
      {source.trim() ? (
        <figcaption className="mt-2 text-right text-sm text-[var(--gray)]">
          {source}
        </figcaption>
      ) : null}
    </figure>
  );
}
