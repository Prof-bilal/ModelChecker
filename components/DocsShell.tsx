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
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
          <nav aria-label="Documentation" className="mb-12 lg:mb-0">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-4 text-sm lg:block lg:space-y-1 lg:border-b-0 lg:pb-0">
              {ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={item.href === active ? "page" : undefined}
                    className={
                      item.href === active
                        ? "font-medium text-text"
                        : "text-text-muted hover:text-text"
                    }
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
  { href: "/docs/privacy", label: "Privacy & cost" },
] as const;
