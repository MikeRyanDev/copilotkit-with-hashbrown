const headingStyles = {
  1: "text-[clamp(2.25rem,4vw,3.2rem)] leading-[1.04]",
  2: "text-[clamp(1.8rem,2.6vw,2.4rem)] leading-[1.08]",
  3: "text-[clamp(1.45rem,2vw,1.9rem)] leading-[1.12]",
  4: "text-[1.25rem] leading-[1.16]",
  5: "text-[1.1rem] leading-[1.2]",
  6: "text-[1rem] leading-[1.24]",
} as const;

export function Heading({
  text,
  level,
}: {
  text: string;
  level: number;
}) {
  const normalized = Math.min(6, Math.max(1, Math.round(level))) as keyof typeof headingStyles;
  const Tag = `h${normalized}` as const;

  return (
    <Tag
      className={`mt-5 mb-3 w-full max-w-[720px] font-medium tracking-[-0.02em] text-[var(--gray)] ${headingStyles[normalized]}`}
    >
      {text}
    </Tag>
  );
}
