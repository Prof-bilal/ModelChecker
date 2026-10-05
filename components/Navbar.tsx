import Image from "next/image";
import Link from "next/link";
import { ActionButton } from "./ActionButton";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/docs", label: "Docs" },
  { href: "/docs/compare-platforms", label: "Comparing platforms" },
  { href: "/#vs-platforms", label: "Compare" },
  { href: "/#example", label: "Example" },
  { href: "/#methodology", label: "Methodology" },
  { href: "/#faq", label: "FAQ" },
] as const;

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/70 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex min-h-16 max-w-(--content-max) flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6"
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 text-text">
            {/* Brand mark (background removed, source: owner-supplied logo).
                Decorative: the link's accessible name comes from the wordmark. */}
            <Image
              src="/modelcheck-logo.png"
              alt=""
              width={33}
              height={27}
              className="h-[27px] w-auto"
              priority
            />
            <Wordmark />
          </Link>
          {/* Beta status badge. Same pill pattern as the /benchmarks chips, tokens only. */}
          <span
            className="rounded-pill border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted"
            title="ModelCheck is in beta"
          >
            Beta
          </span>
        </div>
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
          <ActionButton href="/run" variant="capsule" size="sm">
            Run an evaluation
          </ActionButton>
        </div>
      </nav>
    </header>
  );
}
