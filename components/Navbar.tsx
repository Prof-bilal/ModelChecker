import Image from "next/image";
import Link from "next/link";
import { ActionButton } from "./ActionButton";
import { Wordmark } from "./Wordmark";

// Flat mono nav row (D33) — no capsule, no backdrop blur, opaque background.
// Breakpoints inherited from D32: the two long anchor links drop below 1120px.
// D33 records that the 1120px threshold must be re-measured after this restyle,
// not eyeballed (docs/decisions.md D32/D33).
const LINKS = [
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/docs", label: "Docs" },
  { href: "/docs/compare-platforms", label: "Platforms" },
  { href: "/#vs-platforms", label: "Compare" },
  { href: "/#example", label: "Example", wide: true },
  { href: "/#methodology", label: "Methodology", wide: true },
  { href: "/#faq", label: "FAQ" },
] as const;

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg">
      <nav
        aria-label="Main"
        className="mx-auto flex min-h-16 max-w-(--content-max) flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 sm:px-6"
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-text">
            {/* Brand mark (background removed, source: owner-supplied logo).
                Decorative: the link's accessible name comes from the wordmark. */}
            <Image
              src="/modelcheck-logo.png"
              alt=""
              width={29}
              height={24}
              className="h-6 w-auto"
              priority
            />
            <Wordmark />
          </Link>
          {/* Beta status badge (D30): tokens only. Square like everything else (D33). */}
          <span
            className="border border-border-strong px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted"
            title="ModelCheck is in beta"
          >
            Beta
          </span>
        </div>

        <div className="flex items-center gap-1">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted hover:text-text ${
                "wide" in link && link.wide
                  ? "hidden min-[1120px]:inline-block"
                  : "hidden sm:inline-block"
              }`}
            >
              {link.label}
            </a>
          ))}
          <ActionButton href="/run" size="sm" className="ml-2">
            Run an evaluation
          </ActionButton>
        </div>
      </nav>
    </header>
  );
}
