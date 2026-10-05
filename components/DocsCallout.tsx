import { ActionButton } from "./ActionButton";
import { IconTerminal } from "@devigner-ui/icons";

/**
 * Install + docs handoff (D33: square, no reveal — visible at first paint).
 * The package name matches what npm actually serves
 * (modelcheck-cli@0.1.2, published 2026-10-05; 0.1.0 first published
 * 2026-09-20). Static text, no clipboard logic.
 */
export function DocsCallout() {
  return (
    <div className="mt-10 border border-border-strong bg-well p-6 text-center">
      <p className="flex items-center justify-center gap-2 font-mono text-sm text-text">
        <IconTerminal aria-hidden="true" className="size-4 text-text-muted" />
        <span aria-hidden="true" className="font-bold text-accent">
          $
        </span>
        npm install -g modelcheck-cli
      </p>
      <p className="mt-3 text-xs text-text-muted">
        v0.1.2 on npm. Runs locally — your key goes to the provider you choose, never
        to a ModelCheck server. Provider API charges apply.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <ActionButton href="/docs/quick-start" variant="outline" size="sm">
          Quick start
        </ActionButton>
        <ActionButton href="/docs" variant="outline" size="sm">
          Full documentation
        </ActionButton>
      </div>
    </div>
  );
}
