import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const ITEMS = [
  {
    t: "Exact model identity",
    d: "Provider, resolved model ID and version are pinned in every report — never an alias.",
  },
  {
    t: "Versioned benchmark suite",
    d: "Suite version, case counts, repeats, scorer types, and known omissions are recorded per run.",
  },
  {
    t: "Sample-level evidence",
    d: "Read the actual model outputs next to references and scoring rationale — not just aggregates.",
  },
  {
    t: "Key handling",
    d: "Your API key is transmitted over TLS to execute the run and is never included in reports, exports, or logs.",
  },
] as const;

export function Methodology() {
  return (
    <section id="methodology" className="border-y border-border">
      <div className="mx-auto max-w-(--content-max) px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading
          eyebrow="Trust & methodology"
          title="Every number carries its provenance"
        />
        <dl className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {ITEMS.map((it, i) => (
            <Reveal key={it.t} delay={i * 80} className="border-t border-border pt-6">
              <dt className="font-medium">{it.t}</dt>
              <dd className="mt-2 text-sm text-text-muted">{it.d}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}