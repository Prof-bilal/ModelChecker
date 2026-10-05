import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

/* Denominators match core@1.0.0: 15 cases per capability. */
const CAPS = [
  { name: "Structured output", pct: 86.7, note: "13 of 15 scored cases" },
  { name: "Tool calling", pct: 80, note: "12 of 15 scored cases" },
  { name: "Long context", pct: null, note: "not tested by this suite" },
] as const;

export function ExampleReport() {
  return (
    <section id="example" className="mx-auto max-w-(--content-max) px-4 py-20 sm:px-6 lg:py-28">
      <SectionHeading
        eyebrow="Example report"
        title="The artifact, before the credentials"          lede="Every run reports per-capability results for the two measured capabilities, plus sample outputs, latency, cost, and the exact methodology behind each number. Capabilities the suite does not test say so."
      />

      <Reveal
        delay={100}
        className="mt-12 overflow-hidden rounded-card border border-border bg-surface"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
          <p className="font-mono text-sm font-medium">openai/gpt-4o-mini</p>
          <p className="tnum font-mono text-xs text-text-muted">
            core@1.0.0 · run_8f3 · 30/30 settled
          </p>
        </div>
        <ul>
          {CAPS.map((c, i) => (
            <li
              key={c.name}
              className="grid grid-cols-[minmax(9rem,14rem)_1fr_auto] items-center gap-4 px-5 py-4"
              style={{ borderTop: i ? "1px solid var(--color-border)" : "none" }}
            >
              <span className="text-sm font-medium">{c.name}</span>
              {c.pct !== null ? (
                <span className="flex items-center gap-3">
                  <span className="h-1.5 w-full max-w-56 overflow-hidden rounded-pill bg-border">
                    <span
                      className="bar-fill block h-full rounded-pill bg-accent"
                      style={{ width: `${c.pct}%` }}
                    />
                  </span>
                  <span className="tnum font-mono text-xs text-text-muted">{c.pct}%</span>
                </span>
              ) : (
                <span className="text-xs text-text-muted">—</span>
              )}
              <span className="tnum text-right font-mono text-xs text-text-muted">
                {c.note}
              </span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={150}>
        <p className="mt-4 text-xs text-text-muted" role="note">
          Illustrative—not measured model performance.
        </p>
      </Reveal>
    </section>
  );
}