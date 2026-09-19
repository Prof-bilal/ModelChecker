import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const FAQS = [
  {
    q: "What does a run cost?",
    a: "ModelCheck charges nothing in this version. Your provider bills you directly for the model calls the suite makes; an estimated charge range is shown before you start, and a spending limit is reserved against it.",
  },
  {
    q: "Who can see my API key and results?",
    a: "Your key is sent over TLS to execute the run and is never included in reports, exports, or logs. Reports are private to you by default; sharing is explicit and revocable.",
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