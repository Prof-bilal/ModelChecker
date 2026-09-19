/**
 * CLI teaser — non-interactive by design (design.md §8: no CLI promotion
 * until a CLI exists). No clipboard logic, purely informational.
 */
export function InstallBar() {
  return (
    <div className="mt-7 inline-flex flex-wrap items-center justify-center gap-3 rounded-pill border border-border-strong bg-surface px-4 py-2.5 font-mono text-xs">
      <span aria-hidden="true" className="text-text">
        $
      </span>
      <code className="select-none text-text">npm install -g modelcheck-cli</code>
      <span className="rounded-pill border border-border-strong px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-text">
        Coming soon
      </span>
    </div>
  );
}