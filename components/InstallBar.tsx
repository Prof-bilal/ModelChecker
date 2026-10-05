import { IconTerminal } from "@devigner-ui/icons";

/** CLI install line (D33: square, mono). The package name matches what npm
 * serves (modelcheck-cli, latest 0.1.2 published 2026-10-05 — resolves U2).
 * Static text, no clipboard logic. */
export function InstallBar() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border border-border-strong bg-well px-4 py-2.5 font-mono text-xs">
      <IconTerminal aria-hidden="true" className="size-3.5 text-text-muted" />
      <span aria-hidden="true" className="font-bold text-accent">
        $
      </span>
      <code className="select-none text-text">npm install -g modelcheck-cli</code>
    </div>
  );
}
