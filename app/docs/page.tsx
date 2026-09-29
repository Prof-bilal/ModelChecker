import { DocsShell } from "@/components/DocsShell";
import { DocsArticle } from "@/components/docs/DocsArticle";
import Link from "next/link";

export const metadata = {
  title: "Docs — ModelCheck",
  description:
    "ModelCheck CLI documentation: installation, quick start, running and comparing evaluations, privacy and cost.",
};

export default function DocsIndexPage() {
  return (
    <DocsShell active="/docs">
      <DocsArticle>
        <p className="eyebrow">Evidence-first evaluation</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-medium tracking-[-0.045em] text-text sm:text-5xl">
          Documentation for decisions you can inspect.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-text-muted">
          ModelCheck turns a model choice into an auditable result: a versioned suite,
          declared scoring rules, and portable reports that preserve the evidence behind
          every number.
        </p>

        <section className="mt-12 grid gap-3 sm:grid-cols-3" aria-label="Documentation paths">
          {PATHS.map((path, index) => (
            <Link
              key={path.href}
              href={path.href}
              className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-text"
            >
              <span className="font-mono text-[11px] tracking-[0.14em] text-text-muted">0{index + 1}</span>
              <h2 className="mt-5 text-base font-semibold tracking-tight text-text">{path.title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">{path.description}</p>
              <span className="mt-5 inline-block text-sm text-text group-hover:translate-x-0.5 transition-transform">Explore →</span>
            </Link>
          ))}
        </section>

        <section className="mt-14 border-y border-border py-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="text-lg font-semibold tracking-tight">What every run preserves</h2>
            <p className="text-sm text-text-muted">A result is more useful when its context survives.</p>
          </div>
          <dl className="mt-7 grid gap-5 sm:grid-cols-3">
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">Identity</dt>
              <dd className="mt-2 text-sm leading-6 text-text-muted">Model, provider, adapter, and run parameters.</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">Method</dt>
              <dd className="mt-2 text-sm leading-6 text-text-muted">Suite version, cases, repetitions, and scoring rules.</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">Evidence</dt>
              <dd className="mt-2 text-sm leading-6 text-text-muted">Per-case outcomes, raw responses, cost, latency, and limits.</dd>
            </div>
          </dl>
        </section>

        <p className="mt-10 text-sm leading-6 text-text-muted">
          The current <code className="font-mono text-xs">core</code> suite measures
          structured output and tool calling. Capabilities outside that scope are
          reported as <strong className="font-medium text-text">not tested</strong>, not zero.
        </p>
      </DocsArticle>
    </DocsShell>
  );
}

const PATHS = [
  {
    href: "/docs/quick-start",
    title: "Run your first evaluation",
    description: "Install the CLI, configure a provider key, and produce a local report.",
  },
  {
    href: "/docs/repository-analysis",
    title: "Understand a repository",
    description: "Profile a local project and match its workload to available evidence.",
  },
  {
    href: "/docs/comparison",
    title: "Compare the evidence",
    description: "Read capability deltas with their denominators and known limits.",
  },
] as const;
