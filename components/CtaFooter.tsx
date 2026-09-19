import { ActionButton } from "./ActionButton";
import { Wordmark } from "./Wordmark";

const SUPPORTED = ["OpenAI", "Anthropic", "Google AI", "Mistral", "Groq"] as const;
/* One marquee half: 4 repetitions ≈ 2600px so the right edge never exposes a gap
   on common viewports; the track renders two identical halves for a seamless loop. */
const ROW = [...SUPPORTED, ...SUPPORTED, ...SUPPORTED, ...SUPPORTED];

export function CtaFooter() {
  return (
    <>
      <section className="border-t border-border">
        <div className="marquee overflow-hidden py-10" aria-label="Supported providers">
          <ul className="marquee-track flex w-max items-center gap-14 pr-14 font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
            {[...ROW, ...ROW].map((p, i) => (
              <li key={`${p}-${i}`} aria-hidden={i >= ROW.length}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-(--content-max) px-4 py-24 text-center sm:px-6 lg:py-32">
          <h2 className="display-2">Stop guessing what a new model can do.</h2>
          <p className="mx-auto mt-6 max-w-xl text-md text-text-muted">
            Run the suite, read the evidence, decide with numbers you can trust.
          </p>
          <div className="mt-9 flex justify-center">
            <ActionButton href="/run" size="lg" arrow>
              Run an evaluation
            </ActionButton>
          </div>
          <p className="mt-4 text-xs text-text-muted">
            Provider API charges apply.
          </p>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-(--content-max) flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-text-muted sm:px-6">
          <Wordmark className="text-text" />
          <p>© 2026 ModelCheck. Evidence over decoration.</p>
          <p className="font-mono">
            Evaluations are run against live providers. Results are per-suite, never a total score.
          </p>
        </div>
      </footer>
    </>
  );
}