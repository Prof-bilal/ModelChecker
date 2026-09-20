import type { ReactNode } from "react";
import { Navbar } from "./Navbar";

/**
 * Shared chrome for /docs routes: navbar + docs sidebar (design.md §20: filters
 * and persistent navigation carry a visible state) + max-width content column.
 * Server component; active-link highlighting is rendered server-side.
 */
export function DocsShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto max-w-(--content-max) px-4 py-16 sm:px-6 lg:py-20">
        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="Documentation" className="mb-12 lg:mb-0 lg:sticky lg:top-24">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-text-muted">
              Docs
            </p>
            <ul className="space-y-0.5 border-l border-border pl-5 text-sm">
              {ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={item.href === active ? "page" : undefined}
                    className={`block border-l-2 py-1.5 pr-4 -ml-px font-medium transition-colors ${
                      item.href === active
                        ? "border-accent text-text"
                        : "border-transparent text-text-muted hover:border-border hover:text-text"
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </>
  );
}

const ITEMS = [
  { href: "/docs", label: "Introduction" },
  { href: "/docs/installation", label: "Installation" },
  { href: "/docs/quick-start", label: "Quick start" },
  { href: "/docs/usage", label: "How to use" },
  { href: "/docs/comparison", label: "Comparing runs" },
  { href: "/docs/compare-platforms", label: "Comparing platforms" },
  { href: "/docs/privacy", label: "Privacy & cost" },
] as const;
