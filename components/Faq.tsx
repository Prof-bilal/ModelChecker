import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

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

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-(--content-max) px-4 py-20 sm:px-6 lg:py-28">
      <SectionHeading eyebrow="FAQ" title="Questions, answered exactly" />
      <div className="mt-12 max-w-3xl">
        {FAQS.map((f, i) => (
          <Reveal key={f.q} delay={i * 60}>
            <details className="group border-b border-border py-5">
              <summary className="cursor-pointer list-none font-medium marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="mr-3 font-mono text-text-muted" aria-hidden="true">
                  ?
                </span>
                {f.q}
              </summary>
              <p className="mt-3 text-sm text-text-muted">{f.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}