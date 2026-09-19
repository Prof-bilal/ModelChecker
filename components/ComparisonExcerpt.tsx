import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const ROWS = [
  { m: "Structured output (higher)", a: "90.0% (n=50)", b: "96.0% (n=50)", d: "+6.0pp", up: true, w: 96 },
  { m: "Reasoning (higher)", a: "78.6% (n=50)", b: "74.0% (n=50)", d: "−4.6pp", up: false, w: 74 },
  { m: "Latency p50 (lower)", a: "1.4s (n=100)", b: "1.1s (n=100)", d: "−0.3s", up: false, w: 55 },
  { m: "Est. cost (lower)", a: "$0.41 (n=100)", b: "$0.55 (n=100)", d: "+$0.14", up: false, w: 70 },
] as const;

export function ComparisonExcerpt() {
  return (
    <section className="mx-auto max-w-(--content-max) px-4 py-20 sm:px-6 lg:py-28">
      <SectionHeading
        eyebrow="Comparison"
        title="Deltas with evidence, not a trophy"
        lede="Compare two runs metric by metric — absolute values, sample sizes, and signed deltas with direction. No winner declarations."
      />

      <Reveal
        delay={100}
        className="mt-12 overflow-hidden rounded-card border border-border bg-surface"
      >
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Illustrative comparison of two evaluation runs
          </caption>
          <thead>
            <tr className="border-b border-border text-xs text-text-muted">
              <th scope="col" className="px-5 py-4 font-medium uppercase tracking-wide">
                Metric (direction)
              </th>
              <th scope="col" className="px-5 py-4 font-medium uppercase tracking-wide">
                Baseline · gpt-5.2-mini
              </th>
              <th scope="col" className="px-5 py-4 font-medium uppercase tracking-wide">
                Candidate · claude-4.5-haiku
              </th>
              <th scope="col" className="px-5 py-4 text-right font-medium uppercase tracking-wide">
                Delta
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.m} className="border-b border-border last:border-b-0">
                <th scope="row" className="px-5 py-4 font-normal">
                  {r.m}
                </th>
                <td className="tnum px-5 py-4 font-mono text-xs text-text-muted">{r.a}</td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-3">
                    <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-pill bg-border">
                      <span
                        className="delta-sweep block h-full rounded-pill bg-accent"
                        style={{ width: `${r.w}%` }}
                      />
                    </span>
                    <span className="tnum font-mono text-xs">{r.b}</span>
                  </span>
                </td>
                <td
                  className={`tnum px-5 py-4 text-right font-mono text-xs ${r.up ? "text-success" : "text-danger"}`}
                >
                  <span aria-hidden="true">{r.d}</span>
                  <span className="sr-only">
                    {r.d.startsWith("+") ? "increased" : "decreased"} by {r.d.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>

      <Reveal delay={150}>
        <p className="mt-4 text-xs text-text-muted" role="note">
          Illustrative—not measured model performance. Deltas show direction
          with sign and text, never color alone.
        </p>
      </Reveal>
    </section>
  );
}