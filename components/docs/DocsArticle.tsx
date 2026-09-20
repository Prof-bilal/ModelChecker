import type { ReactNode } from "react";

/**
 * Shared measure + rhythm wrapper for docs pages. Pages own their heading
 * levels (exactly one h1 each) and spacing; this wrapper only fixes the
 * reading measure so the sidebar alignment holds across routes.
 */
export function DocsArticle({ children }: { children: ReactNode }) {
  return <article className="max-w-3xl">{children}</article>;
}
