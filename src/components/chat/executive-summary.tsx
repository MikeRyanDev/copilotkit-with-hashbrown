export function ExecutiveSummary({ text }: { text: string }) {
  return (
    <section
      aria-label="Executive summary"
      className="mb-3 w-full max-w-[720px] text-[1.12rem] font-light leading-8 tracking-[0.01em] text-[var(--gray)]"
    >
      {text}
    </section>
  );
}
