import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { IconPlugCircle, IconSettingsMinimalistic, IconEye } from "@devigner-ui/icons";

const STEPS = [
  {
    n: "01",
    t: "Provide a key",
    d: "Export your provider API key as an environment variable. It is read on your machine and sent only to the provider you selected — never to ModelCheck, never as a command-line argument.",
    icon: IconPlugCircle,
  },
  {
    n: "02",
    t: "Configure",
    d: "Pin the exact model ID and a versioned suite. Case counts, coverage, omissions, and a pre-flight cost estimate are printed before the first request is billed.",
    icon: IconSettingsMinimalistic,
  },
  {
    n: "03",
    t: "Inspect",
    d: "Read the local report: per-capability scores with n, sample outputs, latency, estimated cost, failures — every number linked back to its cases.",
    icon: IconEye,
  },
] as const;

export function Stepper() {
  return (
    <section id="how" className="border-y border-border">
      <div className="mx-auto max-w-(--content-max) px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading
          eyebrow="How a run works"
          title="Provide → Configure → Inspect"
          lede="No SDK, no code changes. The run executes on your machine against your provider; the report is a local file."
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
                <s.icon className="size-3.5" />
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