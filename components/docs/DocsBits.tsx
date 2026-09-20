import type { ReactNode } from "react";

/**
 * Code block for docs pages. Model output is never rendered as HTML; static
 * docs text goes through JSX text nodes, which React escapes by default.
 */
export function Code({ children, label }: { children: string; label?: string }) {
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border bg-surface">
      {label ? (
        <p className="border-b border-border px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-text-muted">
          {label}
        </p>
      ) : null}
      <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed text-text">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <aside className="my-6 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-muted">
      {children}
    </aside>
  );
}

export function ApiTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="my-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-140 text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-xs text-text-muted">
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
