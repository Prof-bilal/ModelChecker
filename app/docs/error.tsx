"use client";

import { Navbar } from "@/components/Navbar";
import { IconArrowRightUp } from "@devigner-ui/icons";

/**
 * Route-level fallback for /docs/*. Docs content is static, so a crash here is
 * a bug in this application, not in user input. The message says what is true
 * and never blames the user (design.md §19).
 */
export default function DocsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto max-w-(--content-max) px-4 py-24 sm:px-6">
        <h1 className="display-2">This page failed to render</h1>
        <p className="mt-4 max-w-xl text-md text-text-muted">
          A documentation page failed in this application — nothing was sent, and
          nothing about your machine or keys is involved. Try again, and if it keeps
          failing, please open an issue with the page you were on.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium hover:bg-surface"
          >
            Try again
            <IconArrowRightUp aria-hidden="true" className="size-3.5 opacity-70" />
          </button>
          <a
            href="/docs"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface"
          >
            All documentation
            <IconArrowRightUp aria-hidden="true" className="size-3.5 opacity-70" />
          </a>
        </div>
      </main>
    </>
  );
}
