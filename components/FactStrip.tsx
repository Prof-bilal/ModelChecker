/**
 * Fact strip under the nav — four document-backed counts, shown before the fold (D33).
 * Every number has a source: 30 cases / 2 capabilities (MVP §4.2), 6 gateways
 * (CtaFooter.SUPPORTED), 0 servers (no hosted service exists, D1). No new figures (D5).
 */
const FACTS = [
  { v: "30", k: "cases per run, versioned" },
  { v: "2", k: "capabilities scored by core@1.0.0" },
  { v: "6", k: "provider gateways supported" },
  { v: "0", k: "servers — reports stay local" },
] as const;

export function FactStrip() {
  return (
    <div className="border-b border-border bg-surface" aria-label="ModelCheck at a glance">
      <ul className="mx-auto grid max-w-(--content-max) grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">
        {FACTS.map((f) => (
          <li
            key={f.k}
            className="flex flex-col gap-0.5 border-border px-4 py-3.5 [&:not(:first-child)]:border-l [&:not(:first-child)]:pl-4 lg:px-5"
          >
            <span className="tnum font-mono text-lg font-bold text-text">
              <span aria-hidden="true" className="text-accent">
                [
              </span>
              {f.v}
              <span aria-hidden="true" className="text-accent">
                ]
              </span>
              <span className="sr-only">{f.v}</span>
            </span>
            <span className="text-xs text-text-muted">{f.k}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
