import { ActionButton } from "./ActionButton";
import { InstallBar } from "./InstallBar";
import { LiveDemo } from "./LiveDemo";

/**
 * Hero (D33): asymmetric claim-left / artefact-right, no canvas, no glow, no
 * wordmark repeat, no reveal. The demo terminal sits in viewport 1 so the
 * product — not decoration — is the first thing seen. Copy unchanged.
 */
export function Hero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-(--content-max) gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:py-20">
        <div>
          <h1 className="display text-text">
            Give a model an evaluation suite,{" "}
            <span className="text-accent">not your trust.</span>
          </h1>

          <p className="mt-6 max-w-[46ch] text-md text-text-muted">
            ModelCheck runs a versioned 30-case suite — structured output and tool
            calling — against the model you choose, through your provider API key:
            OpenAI, Anthropic, OpenRouter, Groq, xAI or DeepSeek. Then it shows you
            the answers, the failures, the latency, and the cost. Every number
            carries its evidence.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ActionButton href="/run" size="lg">
              Run an evaluation
            </ActionButton>
            <ActionButton href="#example" variant="outline" size="lg">
              Explore example report
            </ActionButton>
          </div>

          <InstallBar />
          <p className="mt-3 text-xs text-text-muted">
            Provider API charges apply. There is no ModelCheck server — reports are
            local files.
          </p>
        </div>

        <div className="lg:pt-2">
          <LiveDemo />
        </div>
      </div>
    </section>
  );
}
