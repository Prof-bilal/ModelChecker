import { ActionButton } from "./ActionButton";
import { Wordmark } from "./Wordmark";

/* The six gateway prefixes the CLI actually resolves by default (cli/README —
 * model ids are gateway/wire-id; any other OpenAI-compatible endpoint works via
 * --base-url). Google AI and Mistral were listed here and were never gateways. */
const SUPPORTED = ["OpenAI", "Anthropic", "OpenRouter", "Groq", "xAI", "DeepSeek"] as const;

export function CtaFooter() {
  return (
    <>
      {/* Static provider row (D33): the marquee is retired — no autonomous motion. */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-(--content-max) px-4 py-6 sm:px-6">
          <ul
            className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-[0.15em] text-text-muted"
            aria-label="Supported providers"
          >
            {SUPPORTED.map((p) => (
              <li key={p} className="flex items-center gap-6">
                <span aria-hidden="true" className="text-accent">
                  ·
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing band (D33): stays on the dark canvas — separated by the accent
          rule, not an inverted slab, which split the page in two. One decision. */}
      <section className="border-t-4 border-accent">
        <div className="mx-auto flex max-w-(--content-max) flex-wrap items-center justify-between gap-8 px-4 py-14 sm:px-6">
          <div>
            <h2 className="display-2">
              Stop guessing what a new model can do.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-text-muted">
              Run the suite, read the evidence, decide with numbers you can trust.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <ActionButton href="/run" size="lg">
              Run an evaluation
            </ActionButton>
            <ActionButton href="/docs" variant="outline" size="lg">
              Read the docs
            </ActionButton>
          </div>
        </div>
        <p className="mx-auto max-w-(--content-max) px-4 pb-8 text-xs text-text-muted sm:px-6">
          Provider API charges apply.
        </p>
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
