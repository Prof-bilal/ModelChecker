import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BenchmarkResultsTable } from "@/components/BenchmarkResultsTable";
import { Navbar } from "@/components/Navbar";
import { BENCHMARK_PROJECTS, SUITE, benchmarkProject, formatNumber } from "@/lib/benchmark-data";

export const dynamicParams = false;

export async function generateStaticParams() {
  return BENCHMARK_PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = benchmarkProject((await params).slug);
  return project === undefined
    ? { title: "Benchmark not found — ModelCheck" }
    : { title: `${project.name} benchmark — ModelCheck`, description: project.summary };
}

export default async function BenchmarkProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = benchmarkProject((await params).slug);
  if (project === undefined) notFound();

  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto max-w-(--content-max) px-4 py-12 sm:px-6 lg:py-20">
        <Link href="/benchmarks" className="font-mono text-xs text-text-muted hover:text-text">
          ← All benchmarks
        </Link>

        <header className="mt-10 grid gap-8 border-b border-border pb-12 lg:grid-cols-[1fr_18rem]">
          <div>
            <p className="eyebrow">Project evidence · {project.location}</p>
            <h1 className="display-2 mt-5">{project.name}</h1>
            <p className="mt-4 text-lg text-text-muted">{project.projectType}</p>
            <p className="mt-5 max-w-2xl text-md text-text-muted">{project.summary}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-card border border-border bg-surface p-5">
            <div>
              <dt className="text-xs text-text-muted">Files scanned</dt>
              <dd className="tnum mt-1 font-mono text-lg">{formatNumber(project.files)}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Source files</dt>
              <dd className="tnum mt-1 font-mono text-lg">{formatNumber(project.sourceFiles)}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Estimated lines</dt>
              <dd className="tnum mt-1 font-mono text-lg">{formatNumber(project.estimatedLines)}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Excluded</dt>
              <dd className="tnum mt-1 font-mono text-lg">{formatNumber(project.exclusions)}</dd>
            </div>
          </dl>
        </header>

        <section aria-labelledby="profile-title" className="grid gap-10 border-b border-border py-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="eyebrow">What kind of project?</p>
            <h2 id="profile-title" className="mt-3 text-2xl font-semibold tracking-tight">Repository profile</h2>
            <dl className="mt-7 space-y-5 text-sm">
              <div className="grid grid-cols-[8rem_1fr] gap-4">
                <dt className="text-text-muted">Languages</dt>
                <dd>{project.languages.map((language) => `${language.name} (${language.files})`).join(", ")}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-4">
                <dt className="text-text-muted">Frameworks</dt>
                <dd>{project.frameworks.length > 0 ? project.frameworks.join(", ") : "None identified"}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-4">
                <dt className="text-text-muted">Package manager</dt>
                <dd>{project.packageManagers.join(", ")}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-4">
                <dt className="text-text-muted">Database</dt>
                <dd>{project.database.length > 0 ? project.database.join(", ") : "None identified"}</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-4">
                <dt className="text-text-muted">Verification</dt>
                <dd>{project.hasTests ? "Tests detected" : "No tests detected"} · {project.hasCi ? "CI detected" : "No CI detected"}</dd>
              </div>
            </dl>
          </div>
          <div>
            <p className="eyebrow">Workload signals</p>
            <ul className="mt-7 divide-y divide-border rounded-card border border-border bg-surface px-5">
              {project.architectureSignals.map((signal) => (
                <li key={signal} className="py-4 text-sm">{signal}</li>
              ))}
            </ul>
            <p className="mt-5 text-xs leading-5 text-text-muted">
              Relevant manifests: {project.relevantFiles.join(" · ")}. Exclusions include ignored, sensitive, binary,
              oversized, and unreadable files; excluded file contents were not retained.
            </p>
          </div>
        </section>

        <section aria-labelledby="test-title" className="py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
            <div>
              <p className="eyebrow">Who and what did we test?</p>
              <h2 id="test-title" className="mt-3 text-2xl font-semibold tracking-tight">Four model routes, one fixed suite</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-text-muted">
                DeepSeek V4 Flash, GLM-5.3 Flash, Kimi K2.7 Code, and GPT-6 Luna were requested through Command Code.
                Each receives the same {SUITE.plannedCases} cases. The results below are model-level capability evidence
                associated with this profile; the repository was scanned, but its code was not sent or executed.
              </p>
            </div>
            <div className="rounded-card border border-warning/30 bg-warning/5 p-5 text-sm">
              <p className="font-medium text-warning">Repository fit: not tested</p>
              <p className="mt-2 leading-6 text-text-muted">
                Coding, framework knowledge, multi-file edits, builds, and project tests require an isolated repository trial.
                This run must not be read as a model ranking for {project.name}.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <BenchmarkResultsTable compact />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {SUITE.capabilities.map((capability) => (
              <div key={capability.name} className="rounded-card border border-border p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-medium">{capability.name}</h3>
                  <span className="tnum font-mono text-xs text-text-muted">n = {capability.cases}</span>
                </div>
                <p className="mt-2 font-mono text-xs text-text-muted">{capability.scorer}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 font-mono text-xs text-text-muted">
            {SUITE.id} · hash {SUITE.hash.slice(0, 12)}… · repeat {SUITE.repeats} · cost unpriced
          </p>
        </section>
      </main>
    </>
  );
}
