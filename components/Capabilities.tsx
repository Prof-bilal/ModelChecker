import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const CAPS = [
  { n: "01", t: "Structured output", d: "Schema-valid JSON under strict constraints." },
  { n: "02", t: "Instruction following", d: "Multi-constraint compliance, refusals, tone." },
  { n: "03", t: "Reasoning", d: "Multi-step problems with verifiable answers." },
  { n: "04", t: "Long context", d: "Retrieval and constraint tasks at depth." },
  { n: "05", t: "Tool calling", d: "Argument validity and correct selection." },
  { n: "06", t: "Latency", d: "p50/p95 per case, measured during the run." },
  { n: "07", t: "Cost", d: "Token usage and estimated charge per case." },
  { n: "08", t: "Reliability", d: "Retries, timeouts, empty outputs — counted." },
] as const;

export function Capabilities() {
  return (
    <section id="capabilities" className="border-y border-border">
      <div className="mx-auto max-w-(--content-max) px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading
          eyebrow="Capabilities"
          title="Eight capabilities, one versioned suite"
          lede="Coverage varies by suite version. Anything a suite does not test is reported as “not tested” — never inferred."
        />
        <ul className="mt-14 grid gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {CAPS.map((c, i) => (
            <Reveal as="li" key={c.n} delay={i * 60} className="bg-bg p-6">
              <p aria-hidden="true" className="font-mono text-xs text-text-muted">
                {c.n}
              </p>
              <h3 className="mt-3 text-sm font-medium">{c.t}</h3>
              <p className="mt-2 text-xs text-text-muted">{c.d}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}