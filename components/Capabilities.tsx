import { SpecSection } from "./SpecSection";

/**
 * Coverage table (D33): one table instead of icon card grids — evidence-shaped,
 * not SaaS-shaped. Numbers unchanged: core@1.0.0 scores 15 + 15 cases (MVP §4.2);
 * untested capabilities say so, never 0 (D4).
 */
const ROWS = [
  {
    cap: "Structured output",
    status: "Measured",
    how: "Parse + JSON Schema validation; schema-valid JSON under strict constraints.",
    n: "15",
  },
  {
    cap: "Tool calling",
    status: "Measured",
    how: "Correct tool selected and arguments valid against that tool's schema.",
    n: "15",
  },
  {
    cap: "Latency / cost / reliability",
    status: "Reported every run",
    how: "p50/p95 per case · token usage and estimated charge · retries, timeouts, empty outputs counted.",
    n: "30",
  },
  {
    cap: "Reasoning · instruction following · long context · coding · vision",
    status: "Not tested by this suite",
    how: "Reported as “not tested” — never as 0.",
    n: "—",
  },
] as const;

export function Capabilities() {
  return (
    <SpecSection
      id="capabilities"
      no="03"
      eyebrow="Coverage"
      title="Two capabilities, one versioned suite"
      lede="core@1.0.0 scores structured output and tool calling — 30 cases in total. Anything a suite does not test is reported as “not tested”, never inferred."
      rail={
        <a
          href="#faq"
          className="mt-4 inline-block border-b border-accent pb-px text-xs font-bold text-text hover:text-accent"
        >
          What is not tested →
        </a>
      }
    >
      <div className="overflow-x-auto border border-border bg-surface">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <caption className="sr-only">
            Capabilities covered by the core@1.0.0 suite
          </caption>
          <thead className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-medium">
                Capability
              </th>
              <th scope="col" className="px-4 py-3.5 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3.5 font-medium">
                Mechanism
              </th>
              <th scope="col" className="px-5 py-3.5 text-right font-medium">
                Cases
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.cap} className="border-b border-border last:border-b-0 align-top">
                <th scope="row" className="px-5 py-4 font-medium">
                  {r.cap}
                </th>
                <td
                  className={
                    r.status === "Not tested by this suite"
                      ? "px-4 py-4 text-text-muted"
                      : "px-4 py-4"
                  }
                >
                  {r.status}
                </td>
                <td className="px-4 py-4 text-xs text-text-muted">{r.how}</td>
                <td className="tnum px-5 py-4 text-right font-mono text-xs">{r.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-text-muted" role="note">
        <span className="font-bold text-text">Not tested by this suite:</span>{" "}
        Reasoning · Instruction following · Long context · Coding · Vision. Reported
        as “not tested” — never as 0.
      </p>
    </SpecSection>
  );
}
