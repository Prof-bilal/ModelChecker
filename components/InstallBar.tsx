/**
 * CLI install line. The package name matches what npm serves (modelcheck-cli,
 * published 2026-09-20 — resolves U2). Static text, no clipboard logic.
 */
export function InstallBar() {
  return (
    <div className="mt-7 inline-flex flex-wrap items-center justify-center gap-3 rounded-pill border border-border-strong bg-surface px-4 py-2.5 font-mono text-xs">
      <span aria-hidden="true" className="text-text">
        $
      </span>
      <code className="select-none text-text">npm install -g modelcheck-cli</code>
    </div>
  );
}