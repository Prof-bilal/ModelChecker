import type { ReactNode } from "react";

/**
 * Code block for docs pages. Model output is never rendered as HTML; static
 * docs text goes through JSX text nodes, which React escapes by default.
 */
export function Code({ children, label }: { children: string; label?: string }) {
  return (
    <div className="my-7 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {label ? (
        <p className="flex items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          {label}
        </p>
      ) : null}
      <pre className="overflow-x-auto px-5 py-4 font-mono text-xs leading-6 text-text">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <aside className="my-7 border-l-2 border-accent bg-surface px-5 py-4 text-sm leading-6 text-text-muted">
      {children}
    </aside>
  );
}

export function ApiTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="my-7 overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-140 text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-bg text-xs text-text-muted">
            <th scope="col" className="px-4 py-2.5 font-medium uppercase tracking-wide">
              Flag
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium uppercase tracking-wide">
              Meaning
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([flag, meaning]) => (
            <tr key={flag} className="border-b border-border last:border-b-0 align-top">
              <th scope="row" className="px-4 py-2.5 font-mono text-xs font-medium">
                {flag}
              </th>
              <td className="px-4 py-2.5 text-text-muted">{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
