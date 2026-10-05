/**
 * Section header for the §-rail layout (D33): `$ §NN — eyebrow` marker,
 * heading, optional lede. Heading level is fixed at h2 — the page has exactly
 * one h1 (design.md §16). No reveal wrapper: content is visible at first paint (D33).
 */
export function SectionHeading({
  no,
  eyebrow,
  title,
  lede,
  className = "",
}: {
  /** Section number, e.g. "01" — rendered as §01 */
  no: string;
  eyebrow: string;
  title: string;
  lede?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="eyebrow">
        <span aria-hidden="true" className="font-bold text-accent">
          ${" "}
        </span>
        <span aria-hidden="true">§{no} — </span>
        <span className="sr-only">Section {Number(no)}: </span>
        {eyebrow}
      </p>
      <h2 className="display-2 mt-3">{title}</h2>
      {lede ? <p className="mt-3 text-sm text-text-muted">{lede}</p> : null}
    </div>
  );
}
