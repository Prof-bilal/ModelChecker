import { SpecSection } from "./SpecSection";

/** Horizontal process rail (D33): three columns under one strong rule, no icons,
 *  no vertical list, no reveal. Copy unchanged from the previous Stepper. */
const STEPS = [
  {
    k: "env var",
    t: "Provide a key",
    d: "Export your provider API key as an environment variable. It is read on your machine and sent only to the provider you selected — never to ModelCheck, never as a command-line argument.",
  },
  {
    k: "pre-flight",
    t: "Configure",
    d: "Pin the exact model ID and a versioned suite. Case counts, coverage, omissions, and a pre-flight cost estimate are printed before the first request is billed.",
  },
  {
    k: "local file",
    t: "Inspect",
    d: "Read the local report: per-capability scores with n, sample outputs, latency, estimated cost, failures — every number linked back to its cases.",
  },
] as const;

export function Stepper() {
  return (
    <SpecSection
      id="how"
      no="02"
      eyebrow="Workflow"
      title="How a run works"
      lede="No SDK, no code changes. The run executes on your machine against your provider; the report is a local file."
    >
      <ol className="grid border-t-2 border-accent md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li
            key={s.t}
            className={[
              "border-border py-5",
              i < STEPS.length - 1 ? "border-b md:border-b-0 md:border-r md:pr-6" : "",
              i > 0 ? "md:pl-6" : "",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-1.5 border border-border-strong px-2 py-0.5 font-mono text-[11px] text-text-muted">
              <span aria-hidden="true" className="font-bold text-accent">
                &gt;
              </span>
              {s.k}
            </span>
            <h3 className="mt-3 text-sm font-bold">{s.t}</h3>
            <p className="mt-2 text-xs text-text-muted">{s.d}</p>
          </li>
        ))}
      </ol>
    </SpecSection>
  );
}
