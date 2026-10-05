import { SpecSection } from "./SpecSection";

/* Denominators match core@1.0.0: 15 cases per capability, 30 per run. */
const ROWS = [
  { m: "Structured output (higher)", a: "12 of 15 (80.0%)", b: "13 of 15 (86.7%)", d: "+6.7pp", up: true, w: 87 },
  { m: "Tool calling (higher)", a: "11 of 15 (73.3%)", b: "13 of 15 (86.7%)", d: "+13.4pp", up: true, w: 87 },
  { m: "Latency p50 (lower)", a: "1.4s (n=30)", b: "1.1s (n=30)", d: "−0.3s", up: false, w: 55 },
  { m: "Est. cost (lower)", a: "$0.41 (n=30)", b: "$0.55 (n=30)", d: "+$0.14", up: false, w: 70 },
] as const;

/** §04 — the one tinted band on the page (D33): the visual centerpiece sits on
 *  the product's core act, the delta. Bars render at final width (no sweep). */
export function ComparisonExcerpt() {
  return (
    <SpecSection
      no="04"
      band
      eyebrow="Comparison"
      title="Deltas with evidence, not a trophy"
      lede="Compare two runs metric by metric — absolute values, sample sizes, and signed deltas with direction. No winner declarations."
      rail={
        <a
          href="/docs/comparison"
          className="mt-4 inline-block border-b border-accent pb-px text-xs font-bold text-text hover:text-accent"
        >
          Example comparison →
        </a>
      }
    >
      <div className="overflow-x-auto border border-border bg-bg">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <caption className="sr-only">
            Illustrative comparison of two evaluation runs
          </caption>
          <thead className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-medium">
                Metric (direction)
              </th>
              <th scope="col" className="px-4 py-3.5 font-medium">
                Baseline · gpt-4o-mini
              </th>
              <th scope="col" className="px-4 py-3.5 font-medium">
                Candidate · claude-haiku-4-5
              </th>
              <th scope="col" className="px-5 py-3.5 text-right font-medium">
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
                <td className="tnum px-4 py-4 font-mono text-xs text-text-muted">{r.a}</td>
                <td className="px-4 py-4">
                  <span className="flex items-center gap-3">
                    <span className="h-1.5 w-20 shrink-0 overflow-hidden bg-border">
                      {/* Final width at first paint — no sweep animation (D33). */}
                      <span
                        className="block h-full bg-accent"
                        style={{ width: `${r.w}%` }}
                      />
                    </span>
                    <span className="tnum font-mono text-xs">{r.b}</span>
                  </span>
                </td>
                <td
                  className={`tnum px-5 py-4 text-right font-mono text-xs font-bold ${
                    r.up ? "text-success" : "text-danger"
                  }`}
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
      </div>
      <p className="mt-4 text-xs text-text-muted" role="note">
        <span className="border border-text px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-text">
          Illustrative
        </span>{" "}
        not measured model performance. Deltas show direction with sign and text,
        never colour alone.
      </p>
    </SpecSection>
  );
}
