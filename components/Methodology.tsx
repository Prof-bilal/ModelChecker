import { Reveal } from "./Reveal";
import { DocsCallout } from "./DocsCallout";
import { SectionHeading } from "./SectionHeading";
import { IconKey, IconHistory2, IconClipboardText, IconShieldKeyhole } from "@devigner-ui/icons";

const ITEMS = [
  {
    t: "Exact model identity",
    d: "Provider, resolved model ID and version are pinned in every report — never an alias.",
    icon: IconKey,
  },
  {
    t: "Versioned benchmark suite",
    d: "Suite version, case counts, repeats, scorer types, and known omissions are recorded per run.",
    icon: IconHistory2,
  },
  {
    t: "Sample-level evidence",
    d: "Read the actual model outputs next to references and scoring rationale — not just aggregates.",
    icon: IconClipboardText,
  },
  {
    t: "Key handling",
    d: "Your API key is transmitted over TLS to execute the run and is never included in reports, exports, or logs.",
    icon: IconShieldKeyhole,
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
              <dt className="flex items-center gap-2 font-medium">
                <it.icon aria-hidden="true" className="size-4 text-accent" />
                {it.t}
              </dt>
              <dd className="mt-2 text-sm text-text-muted">{it.d}</dd>
            </Reveal>
          ))}
        </dl>
        <DocsCallout />
      </div>
    </section>
  );
}