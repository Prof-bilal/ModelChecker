import { Reveal } from "./Reveal";

/**
 * Section header shared by every landing section (design.md §8: eyebrow, heading, one-line lede).
 * Heading level is fixed at h2 — the page has exactly one h1 (design.md §16).
 */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  className = "",
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  className?: string;
}) {
  return (
    <Reveal className={className}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="display-2 mt-4">{title}</h2>
      {lede ? <p className="mt-4 max-w-2xl text-md text-text-muted">{lede}</p> : null}
    </Reveal>
  );
}
