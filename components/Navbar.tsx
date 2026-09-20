import Link from "next/link";
import { ActionButton } from "./ActionButton";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "#vs-platforms", label: "Compare" },
  { href: "#example", label: "Example" },
  { href: "#methodology", label: "Methodology" },
  { href: "#faq", label: "FAQ" },
] as const;

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/70 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex min-h-16 max-w-(--content-max) flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6"
      >
        <Link href="/" className="text-text">
          <Wordmark />
        </Link>
        {/* Light capsule carrying dark text, with the primary action nested inside (§14) */}
        <div className="capsule">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="capsule-link hidden sm:inline-block"
            >
              {link.label}
            </a>
          ))}
          <ActionButton href="/run" variant="capsule" size="sm" arrow>
            Run an evaluation
          </ActionButton>
        </div>
      </nav>
    </header>
  );
}