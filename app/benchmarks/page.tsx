import Link from "next/link";
import { BenchmarkResultsTable } from "@/components/BenchmarkResultsTable";
import { Navbar } from "@/components/Navbar";
import { BENCHMARK_PROJECTS, MODEL_RESULTS, SUITE, formatNumber } from "@/lib/benchmark-data";

export const metadata = {
  title: "Benchmarks — ModelCheck",
  description: "Measured model capability runs alongside profiles of three local software projects.",
};

export default function BenchmarksPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto max-w-(--content-max) px-4 py-16 sm:px-6 lg:py-24">
        <header className="max-w-3xl">
          <p className="eyebrow">Local benchmark set · {SUITE.runDate}</p>
          <h1 className="display-2 mt-5">Three projects. Four model routes. Evidence attached.</h1>
          <p className="mt-5 max-w-2xl text-md text-text-muted">
            These project profiles came from a bounded scan of this computer. The model table is a real run of
            ModelCheck&apos;s {SUITE.id} suite through {SUITE.route}; it measures structured output and tool calling,
            not coding quality inside these repositories.
          </p>
        </header>

        <section aria-labelledby="projects-title" className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Selected projects</p>
              <h2 id="projects-title" className="mt-3 text-2xl font-semibold tracking-tight">Repository profiles</h2>
            </div>
            <p className="font-mono text-xs text-text-muted">3 scanned · contents stayed local</p>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {BENCHMARK_PROJECTS.map((project, index) => (
              <Link
                key={project.slug}
                href={`/benchmarks/${project.slug}`}
                className="group flex min-h-88 flex-col rounded-card border border-border bg-surface p-6 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-xs text-text-muted">0{index + 1}</span>
                  <span className="rounded-pill border border-border px-2.5 py-1 font-mono text-[11px] text-text-muted">
                    {project.hasTests ? "tests" : "no tests"} · {project.hasCi ? "CI" : "no CI"}
                  </span>
                </div>
                <h3 className="mt-8 text-2xl font-semibold tracking-tight">{project.name}</h3>
                <p className="mt-2 text-sm text-text-muted">{project.projectType}</p>
                <p className="mt-5 text-sm leading-6 text-text-muted">{project.summary}</p>
                <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-border pt-5">
                  <div>
                    <dt className="text-xs text-text-muted">Files</dt>
                    <dd className="tnum mt-1 font-mono text-sm">{formatNumber(project.files)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Source</dt>
                    <dd className="tnum mt-1 font-mono text-sm">{formatNumber(project.sourceFiles)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Est. lines</dt>
                    <dd className="tnum mt-1 font-mono text-sm">{formatNumber(project.estimatedLines)}</dd>
                  </div>
                </dl>
                <span className="mt-6 text-xs font-medium uppercase tracking-wider group-hover:underline">
                  Open project evidence →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="results-title" className="mt-20">
          <p className="eyebrow">Measured model evidence</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 id="results-title" className="text-2xl font-semibold tracking-tight">Capability results</h2>
            <p className="font-mono text-xs text-text-muted">{MODEL_RESULTS.length} routes · one completed with gaps · repeat 1</p>
          </div>
          <div className="mt-7">
            <BenchmarkResultsTable />
          </div>
          <div className="mt-5 grid gap-4 text-sm text-text-muted sm:grid-cols-3">
            <p><span className="text-text">Read the percentages:</span> each capability shows deterministic passes divided by scored cases.</p>
            <p><span className="text-text">Scope:</span> 15 structured-output + 15 tool-calling cases.</p>
            <p><span className="text-text">Cost:</span> unpriced in the pinned local price table; no zero-cost claim.</p>
            <p><span className="text-text">Limits:</span> one repeat; coding and repository reasoning not tested.</p>
          </div>
          <p className="mt-4 text-xs text-text-muted">There is no combined quality score: a model can be strong at tool calling and weaker at structured output, so the two signals stay separate.</p>
        </section>
      </main>
    </>
  );
}
