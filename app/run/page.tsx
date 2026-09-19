import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Run an evaluation — ModelCheck",
};

export default function RunPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-(--content-max) px-4 py-24 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Run an evaluation</h1>
        <p className="mt-3 max-w-xl text-text-muted">
          The evaluation flow (Connect → Configure → Review and run) is
          specified in design.md §9 and is the next implementation increment.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-surface"
          style={{ borderColor: "var(--color-border)" }}
        >
          Back to overview
        </Link>
      </main>
    </>
  );
}
