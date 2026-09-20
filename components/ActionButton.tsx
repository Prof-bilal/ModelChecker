import Link from "next/link";
import { IconArrowRightUp } from "@devigner-ui/icons";

/**
 * Shared action control (design.md §14/§16).
 * Every button carries a directional arrow glyph — the visible text label is never omitted.
 */
const VARIANTS = {
  /** Primary action on the canvas: white pill on onyx, accent pill on light. */
  solid: "bg-accent text-on-accent hover:opacity-90",
  /** Action nested inside the light navigation capsule (dark pill on onyx). */
  capsule: "bg-capsule-action text-capsule-action-text hover:opacity-90",
  outline: "border border-border-strong text-text hover:bg-surface",
  quiet: "text-text-muted hover:text-text",
} as const;

const SIZES = {
  sm: "px-3.5 py-2 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-sm",
} as const;

export function ActionButton({
  href,
  children,
  variant = "solid",
  size = "md",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const classes = `inline-flex shrink-0 items-center gap-2 rounded-pill font-medium transition-opacity ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const label = (
    <>
      {children}
      <IconArrowRightUp aria-hidden="true" className="size-3.5 opacity-70" />
    </>
  );

  // In-page anchors stay plain anchors; routes go through next/link.
  return href.startsWith("#") ? (
    <a href={href} className={classes}>
      {label}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {label}
    </Link>
  );
}
