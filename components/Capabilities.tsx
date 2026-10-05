import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import {
  IconStructure,
  IconPenTool,
  IconClock,
  IconDollar,
  IconShieldCheck,
} from "@devigner-ui/icons";

/** Capabilities the shipped suite actually scores — MVP §4.2, docs/benchmarks §4. */
const MEASURED = [
  {
    n: "01",
    t: "Structured output",
    d: "Schema-valid JSON under strict constraints. 15 cases.",
    icon: IconStructure,
  },
  {
    n: "02",
    t: "Tool calling",
    d: "Correct tool selected, arguments valid against its schema. 15 cases.",
    icon: IconPenTool,
  },
] as const;

/** Facts measured about the run itself, not about a capability (P4). */
const METRICS = [
  {
    n: "03",
    t: "Latency",
    d: "p50/p95 per case, measured during the run.",
    icon: IconClock,
  },
  {
    n: "04",
    t: "Cost",
    d: "Token usage and estimated charge per case.",
    icon: IconDollar,
  },
  {
    n: "05",
    t: "Reliability",
    d: "Retries, timeouts, empty outputs — counted.",
    icon: IconShieldCheck,
  },
] as const;

/** Not exercised by core@1.0.0 — named so their absence is visible, never 0 (D4). */
const NOT_TESTED = [
  "Reasoning",
  "Instruction following",
  "Long context",
  "Coding",
  "Vision",
];

export function Capabilities() {
  return (
    <section id="capabilities" className="border-y border-border">
      <div className="mx-auto max-w-(--content-max) px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading
          eyebrow="Capabilities"
          title="Two capabilities, one versioned suite"
          lede="core@1.0.0 scores structured output and tool calling — 30 cases in total. Anything a suite does not test is reported as “not tested”, never inferred."
        />

        <p className="mt-14 font-mono text-xs uppercase tracking-[0.18em] text-text-muted">
          Measured
        </p>
        <ul className="mt-4 grid gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-2">
          {MEASURED.map((c, i) => (
            <Reveal as="li" key={c.n} delay={i * 60} className="bg-bg p-6">
              <c.icon aria-hidden="true" className="size-5 text-accent" />
              <p aria-hidden="true" className="font-mono text-xs text-text-muted">
                {c.n}
              </p>
              <h3 className="mt-3 text-sm font-medium">{c.t}</h3>
              <p className="mt-2 text-xs text-text-muted">{c.d}</p>
            </Reveal>
          ))}
        </ul>

        <p className="mt-10 font-mono text-xs uppercase tracking-[0.18em] text-text-muted">
          Reported on every run
        </p>
        <ul className="mt-4 grid gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((c, i) => (
            <Reveal as="li" key={c.n} delay={i * 60} className="bg-bg p-6">
              <c.icon aria-hidden="true" className="size-5 text-accent" />
              <p aria-hidden="true" className="font-mono text-xs text-text-muted">
                {c.n}
              </p>
              <h3 className="mt-3 text-sm font-medium">{c.t}</h3>
              <p className="mt-2 text-xs text-text-muted">{c.d}</p>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={200}>
          <p className="mt-8 text-xs text-text-muted" role="note">
            <span className="font-medium text-text">Not tested by this suite:</span>{" "}
            {NOT_TESTED.join(" · ")}. Reported as “not tested” — never as 0.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
