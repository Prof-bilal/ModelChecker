import type { ReactNode } from "react";
import { SectionHeading } from "./SectionHeading";

/**
 * Section shell for the §-rail layout (D33): sticky numbered rail on the left,
 * content column on the right. `band` tints the whole section — used once, on
 * the comparison section, as the page's visual centerpiece. No reveal: content
 * is visible at first paint.
 */
export function SpecSection({
  id,
  no,
  eyebrow,
  title,
  lede,
  band = false,
  bordered = true,
  rail,
  children,
}: {
  id?: string;
  no: string;
  eyebrow: string;
  title: string;
  lede?: string;
  /** Tint the section as the visual centerpiece (used once — comparison). */
  band?: boolean;
  /** Draw the top hairline. Off for the first section after the hero. */
  bordered?: boolean;
  /** Optional rail-only content under the heading (e.g. a docs link). */
  rail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={[
        bordered ? "border-t border-border" : "",
        band ? "bg-surface" : "",
      ].join(" ")}
    >
      <div className="mx-auto grid max-w-(--content-max) gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-12 lg:py-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionHeading no={no} eyebrow={eyebrow} title={title} lede={lede} />
          {rail}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
