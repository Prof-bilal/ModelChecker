import Image from "next/image";
import Link from "next/link";
import { IconArrowRightUp } from "@devigner-ui/icons";
import { ActionButton } from "./ActionButton";
import { NpmDownloads } from "./NpmDownloads";
import { Wordmark } from "./Wordmark";

// Flat mono nav row (D33) — no capsule, no backdrop blur, opaque background.
// D34 re-measured this row: the content box is `--content-max` (1100px) minus
// `px-6` = 1052px, so the two in-page anchor links (Example, Methodology) are
// gone — with GitHub and the live npm chip they needed 1136.1px and wrapped at
// every width. Gates below are measured, not eyeballed (docs/decisions.md D34).
const LINKS = [
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/docs", label: "Docs" },
  { href: "/docs/compare-platforms", label: "Platforms" },
  { href: "/#vs-platforms", label: "Compare" },
  { href: "/#faq", label: "FAQ" },
] as const;

const GITHUB_URL = "https://github.com/Prof-bilal/ModelChecker";

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
          {/* Live npm downloads (D34): both additions together need 953.4px,
              which fits from a 1024px viewport (976px of content). */}
          <NpmDownloads className="hidden min-[1024px]:inline-block" />
        </div>

        <div className="flex items-center gap-1">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted hover:text-text sm:inline-block"
            >
              {link.label}
            </a>
          ))}
          {/* Repository link (D34): external, so it carries the arrow glyph and
              opens in a new tab. GitHub alone needs 871.0px — fits from 960px. */}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden min-[960px]:inline-flex items-center gap-1.5 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted hover:text-text"
          >
            GitHub
            <IconArrowRightUp aria-hidden="true" className="size-3 opacity-70" />
          </a>
          <ActionButton href="/run" size="sm" className="ml-2">
            Run an evaluation
          </ActionButton>
        </div>
      </nav>
    </header>
  );
}
