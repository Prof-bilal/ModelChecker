import { ActionButton } from "./ActionButton";
import { DotField } from "./DotField";
import { InstallBar } from "./InstallBar";
import { LiveDemo } from "./LiveDemo";
import { Wordmark } from "./Wordmark";

export function Hero() {
  return (
    <section className="relative isolate border-b border-border">
      {/* Decorative dot field across the full hero. The CSS layer is the no-JS
          fallback for the canvas — same 22px pitch. The scrim sits above both
          layers so small/dim copy stays legible where dots are densest. */}
      <div
        aria-hidden="true"
        className="dot-grid hero-glow absolute inset-0 -z-10 text-text"
      />
      <DotField className="-z-10 text-text" />
      <div aria-hidden="true" className="hero-scrim pointer-events-none absolute inset-0 -z-10" />

      <div className="relative mx-auto flex min-h-[calc(100svh_-_4rem)] max-w-(--content-max) flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <p className="eyebrow">Evidence-based model evaluation</p>
        <h1 className="display mt-6 max-w-[22ch] text-text">
          Give a model an evaluation suite, not your trust.
        </h1>

        {/* Brand lockup from the reference composition. aria-hidden: the header already names it. */}
        <span aria-hidden="true" className="mt-8">
          <Wordmark size="lg" className="text-text-muted" />
        </span>

        <p className="mt-8 max-w-2xl text-md text-text">
          ModelCheck runs a versioned benchmark suite against any model with
          your provider API key — then shows you the answers, the failures,
          the latency, and the cost. Every number carries its evidence.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ActionButton href="/run" size="lg" arrow>
            Run an evaluation
          </ActionButton>
          <ActionButton href="#example" variant="outline" size="lg" className="lg:hidden">
            Explore example report
          </ActionButton>
        </div>

        <InstallBar />
        <p className="mt-3 text-xs text-text">
          Provider API charges apply.
        </p>

        {/* The reference anchors one action bottom-right of the first viewport. Exactly one copy of
            this link is visible at any breakpoint, so the accessible name is never duplicated. */}
        <div className="absolute bottom-8 right-0 hidden lg:block">
          <ActionButton href="#example" size="md" arrow>
            Explore example report
          </ActionButton>
        </div>
      </div>

      <div className="relative mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <LiveDemo />
      </div>
    </section>
  );
}
