import type { ReactNode } from "react";
import Link from "next/link";
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
      <section className="border-b border-border bg-surface/60">
        <div className="mx-auto flex max-w-(--content-max) flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
              ModelCheck documentation
            </p>
            <p className="mt-1 text-sm text-text-muted">CLI reference and evidence-first evaluation guides.</p>
          </div>
          <Link
            href="/docs/quick-start"
            className="inline-flex w-fit items-center rounded-full border border-border bg-bg px-4 py-2 text-sm font-medium text-text transition-colors hover:border-text"
          >
            Start a first run <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>
      </section>
      <main id="main" className="mx-auto max-w-(--content-max) px-4 pb-20 pt-8 sm:px-6 lg:pt-12">
        <nav aria-label="Documentation" className="mb-8 overflow-x-auto lg:hidden">
          <ul className="flex w-max gap-2 pb-1">
            {ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.href === active ? "page" : undefined}
                  className={`block rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    item.href === active
                      ? "border-text bg-text text-bg"
                      : "border-border text-text-muted hover:border-text hover:text-text"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16">
          <aside className="hidden lg:block">
            <nav aria-label="Documentation" className="sticky top-24 rounded-xl border border-border bg-surface p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Browse docs</p>
              <div className="mt-5 space-y-6">
                {SECTIONS.map((section) => (
                  <div key={section.label}>
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted/70">
                      {section.label}
                    </p>
                    <ul className="space-y-1">
                      {section.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={item.href === active ? "page" : undefined}
                            className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                              item.href === active
                                ? "bg-bg font-medium text-text shadow-sm"
                                : "text-text-muted hover:bg-bg hover:text-text"
                            }`}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </nav>
          </aside>
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
  { href: "/docs/repository-analysis", label: "Repository analysis" },
  { href: "/docs/usage", label: "How to use" },
  { href: "/docs/comparison", label: "Comparing runs" },
  { href: "/docs/compare-platforms", label: "Comparing platforms" },
  { href: "/docs/privacy", label: "Privacy & cost" },
] as const;

const SECTIONS = [
  { label: "Get started", items: ITEMS.slice(0, 3) },
  { label: "Evaluate", items: ITEMS.slice(3, 6) },
  { label: "Reference", items: ITEMS.slice(6) },
] as const;
