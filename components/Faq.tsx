import { SpecSection } from "./SpecSection";

const FAQS = [
  {
    q: "What does a run cost?",
    a: "ModelCheck charges nothing. Your provider bills you directly for the model calls the suite makes; a pre-flight cost estimate is shown before the run starts, and --spend-limit refuses to start a run above the limit you set.",
  },
  {
    q: "Who can see my API key and results?",
    a: "Your key is read from an environment variable on your machine and sent only to the provider you selected, over TLS. It is never accepted as a command-line argument and never written to reports, exports, or logs. There is no ModelCheck server: reports are local files under RUNS_DIR, private to your machine by default.",
  },
  {
    q: "What does the suite cover?",
    a: "Each versioned suite lists its capabilities, case counts, repeats, scorer types, and known omissions before you run. Capabilities a suite does not test are marked “not tested”, never inferred.",
  },
  {
    q: "Can I reproduce a result later?",
    a: "Every report pins the exact model ID, provider, parameters, suite version, and timestamp, and can be exported with its methodology manifest.",
  },
] as const;

/** §07 — plain <details> rows, no reveal, no icon chips (D33). */
export function Faq() {
  return (
    <SpecSection
      id="faq"
      no="07"
      eyebrow="FAQ"
      title="Questions, answered exactly"
      lede="Direct answers, no hedging."
    >
      <div className="max-w-3xl">
        {FAQS.map((f) => (
          <details key={f.q} className="border-b border-border py-4">
            <summary className="flex cursor-pointer list-none items-baseline gap-3 font-bold marker:hidden [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="text-accent">
                &gt;
              </span>
              {f.q}
            </summary>
            <p className="mt-2 pl-5 text-xs text-text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </SpecSection>
  );
}
