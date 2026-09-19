/**
 * Brand wordmark (design.md §8: an original mark, no copied assets).
 * The dot glyph is decorative — the accessible name is always the adjacent text.
 */
const SIZES = {
  md: { text: "text-sm font-semibold tracking-[0.2em]", dot: "h-[3px] w-[3px]" },
  lg: { text: "text-xl font-light tracking-[0.32em] sm:text-2xl", dot: "h-1 w-1" },
} as const;

export function Wordmark({
  size = "md",
  className = "",
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { text, dot } = SIZES[size];
  return (
    <span className={`inline-flex items-center gap-2.5 uppercase ${className}`}>
      <span className={text}>ModelCheck</span>
      <span aria-hidden="true" className="grid shrink-0 grid-cols-2 gap-[3px]">
        <span className={`${dot} bg-current`} />
        <span className={`${dot} bg-current`} />
        <span className={`${dot} bg-current`} />
        <span className={`${dot} bg-current`} />
      </span>
    </span>
  );
}
