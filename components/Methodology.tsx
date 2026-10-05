import { SpecSection } from "./SpecSection";
import { DocsCallout } from "./DocsCallout";

/** §06 provenance — a definition list (no icon chips, no reveal), D33. */
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
    d: "Your API key is read from an environment variable on your machine and sent only to your provider over TLS — never included in reports, exports, or logs.",
  },
] as const;

export function Methodology() {
  return (
    <SpecSection
      id="methodology"
      no="06"
      eyebrow="Trust & methodology"
      title="Every number carries its provenance"
      lede="Identity, version and coverage are pinned in every report; sample-level evidence sits next to the aggregate."
      rail={
        <a
          href="/docs"
          className="mt-4 inline-block border-b border-accent pb-px text-xs font-bold text-text hover:text-accent"
        >
          Methodology docs →
        </a>
      }
    >
      <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {ITEMS.map((it) => (
          <div key={it.t} className="border-t-2 border-border pt-4">
            <dt className="font-bold">
              <span aria-hidden="true" className="mr-1.5 text-accent">
                &gt;
              </span>
              {it.t}
            </dt>
            <dd className="mt-1.5 text-xs text-text-muted">{it.d}</dd>
          </div>
        ))}
      </dl>
      <DocsCallout />
    </SpecSection>
  );
}
