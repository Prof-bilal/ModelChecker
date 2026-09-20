import { ActionButton } from "./ActionButton";
import { Reveal } from "./Reveal";

/**
 * Install + docs handoff. The package name matches what npm actually serves
 * (modelcheck-cli@0.1.0, published 2026-09-20). Static text, no clipboard logic.
 */
export function DocsCallout() {
  return (
    <Reveal className="mx-auto mt-14 max-w-3xl rounded-card border border-border bg-surface p-6 text-center">
      <p className="font-mono text-sm text-text">
        <span aria-hidden="true" className="mr-2 text-text-muted">
          $
        </span>
        npm install -g modelcheck-cli
      </p>
      <p className="mt-3 text-xs text-text-muted">
        v0.1.0 on npm. Runs locally — your key goes to the provider you choose, never
        to a ModelCheck server. Provider API charges apply.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <ActionButton href="/docs/quick-start" variant="outline" size="sm" arrow>
          Quick start
        </ActionButton>
        <ActionButton href="/docs" variant="outline" size="sm">
          Full documentation
        </ActionButton>
      </div>
    </Reveal>
  );
}
