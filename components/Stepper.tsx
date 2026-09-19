import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const STEPS = [
  {
    n: "01",
    t: "Connect",
    d: "Paste your provider API key. It travels over TLS to execute the run and is never included in reports.",
  },
  {
    n: "02",
    t: "Configure",
    d: "Pin the exact model ID and a versioned suite. See case counts, coverage, omissions, and estimated charge before anything runs.",
  },
  {
    n: "03",
    t: "Inspect",
    d: "Watch cases settle live, then read the report: per-capability scores with n, sample outputs, latency, cost, failures.",
  },
] as const;

export function Stepper() {
  return (
    <section id="how" className="border-y border-border">
      <div className="mx-auto max-w-(--content-max) px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading
          eyebrow="How a run works"
          title="Connect → Configure → Inspect"
          lede="No SDK, no code changes. Configure the run, execute it against your provider, read the evidence."
        />
        <ol className="mt-14 max-w-2xl">
          {STEPS.map((s, i) => (
            <Reveal
              as="li"
              key={s.n}
              delay={i * 120}
              className="step-rail relative flex gap-5 pb-12 last:pb-0"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border border-border-strong bg-bg font-mono text-[10px] text-text"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-medium">{s.t}</h3>
                <p className="mt-2 text-sm text-text-muted">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}