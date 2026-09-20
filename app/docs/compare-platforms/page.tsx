import { DocsShell } from "@/components/DocsShell";
import { DocsArticle } from "@/components/docs/DocsArticle";
import { Note } from "@/components/docs/DocsBits";

export const metadata = {
  title: "Comparing platforms — ModelCheck",
  description:
    "What the major public benchmark surfaces measure, how each is scored, and the capability axis none of them cover — with a dated source for every row.",
};

/**
 * Per D28 (docs/decisions.md): descriptive and evidence-linked, never a ranking.
 * Every cell about another platform traces to research.md §5.4 (observed
 * 2026-09-20); no scores, stars-as-verdicts, or "better/worse" language.
 */
export default function ComparePlatformsPage() {
  return (
    <DocsShell active="/docs/compare-platforms">
      <DocsArticle>
        <p className="eyebrow">Docs</p>
        <h1 className="display-2 mt-4">Comparing platforms</h1>
        <p className="mt-6 text-md text-text-muted">
          Public leaderboards and benchmarks answer a real question: which models
          are strong in general? This page describes, without ranking, what each
          major surface measures and how it is scored — then states the question
          none of them answer: <strong>what does this model change do to the
          capability you ship?</strong>
        </p>
        <p className="mt-4 text-xs text-text-muted">
          Every descriptive cell below links to a first-party source, observed
          2026-09-20, recorded in research.md §5.4 in the open-source
          repository. ModelCheck publishes no ranking of other platforms.
        </p>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">
          What each surface measures
        </h2>
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-170 text-left text-sm">
            <caption className="sr-only">
              What each public benchmark surface measures and how it is scored
            </caption>
            <thead>
              <tr className="border-b border-border bg-surface text-xs text-text-muted">
                <th scope="col" className="px-4 py-2.5 font-medium uppercase tracking-wide">
                  Platform
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium uppercase tracking-wide">
                  What it measures
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium uppercase tracking-wide">
                  How it scores
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium uppercase tracking-wide">
                  Freshness
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium uppercase tracking-wide">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.platform} className="border-b border-border last:border-b-0 align-top">
                  <th scope="row" className="px-4 py-2.5 font-medium">
                    <a
                      href={r.source}
                      className="underline decoration-border underline-offset-4 hover:decoration-text"
                    >
                      {r.platform}
                    </a>
                  </th>
                  <td className="px-4 py-2.5 text-text-muted">{r.measures}</td>
                  <td className="px-4 py-2.5 text-text-muted">{r.scores}</td>
                  <td className="px-4 py-2.5 text-text-muted">{r.freshness}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-text-muted">
                    {r.host}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">
          The axis none of them cover
        </h2>
        <p className="mt-4 text-sm text-text-muted">
          Each surface above is well-run on its own terms. The limitation is not
          quality — it is <strong>whose workload</strong> is being measured.
          Four things no public surface provides:
        </p>
        <ul className="mt-4 space-y-3 text-sm text-text-muted">
          <li>
            <strong className="text-text">Your task.</strong> Public cases are
            fixed and shared; contamination is a named risk some of them
            actively design against (LiveBench refreshes its questions monthly
            for exactly this reason). Your feature&apos;s cases are yours.
          </li>
          <li>
            <strong className="text-text">Your contract.</strong> Whether the
            JSON your feature parses arrives with the right fields, or whether
            the right tool is chosen with the right arguments, is a property of
            your schema — not of a shared suite.
          </li>
          <li>
            <strong className="text-text">Denominators.</strong> An index score
            is a blend. A ModelCheck delta reads{" "}
            <code className="font-mono text-xs">+2 of 15 cases</code>, and
            carries its denominator everywhere.
          </li>
          <li>
            <strong className="text-text">Raw evidence.</strong> Every claim in
            a ModelCheck report links to the raw output and the scoring rule
            that produced it — the provenance chain public tables do not
            expose.
          </li>
        </ul>

        <Note>
          Where this page sits relative to the rest of the docs:{" "}
          <a
            href="/docs/comparison"
            className="underline decoration-border underline-offset-4 hover:decoration-text"
          >
            Comparing runs
          </a>{" "}
          is the comparison that ships decisions — two of your runs, metric by
          metric. This page is context for the platforms you already know.
        </Note>

        <p className="mt-10 text-xs text-text-muted">
          Descriptions are point-in-time observations of first-party pages, not
          endorsements and not measurements — see decision D28 in{" "}
          <code className="font-mono">docs/decisions.md</code>. If a
          platform&apos;s methodology changes, this page changes with it.
        </p>
      </DocsArticle>
    </DocsShell>
  );
}

const ROWS = [
  {
    platform: "LMArena (Chatbot Arena)",
    host: "lmarena.ai",
    measures:
      "How humans vote between two models on anonymous, open-ended chats.",
    scores:
      "Pairwise human preference; battle mode produces a community ranking.",
    freshness: "Continuous, vote-driven.",
    source: "https://lmarena.ai/",
  },
  {
    platform: "Artificial Analysis",
    host: "artificialanalysis.ai",
    measures:
      "A third-party index across many models and capability areas, plus cost, speed and latency columns.",
    scores:
      "Intelligence Index (v4.3.2 aggregates 10 evaluations); per-industry capability indexes.",
    freshness: "Index revisions tracked publicly (changelog).",
    source: "https://artificialanalysis.ai/models",
  },
  {
    platform: "OpenRouter Benchmarks",
    host: "openrouter.ai",
    measures:
      "Gateway-published benchmark rankings across 11 benchmarks and 2,453,260 task evaluations.",
    scores:
      "Quality, Value and Speed columns, with a provenance link on each score.",
    freshness: "Dated runs (last run 2026-09-20 at time of writing).",
    source: "https://openrouter.ai/benchmarks",
  },
  {
    platform: "SWE-bench",
    host: "swebench.com",
    measures:
      "Repository-issue resolution on real GitHub issues from 12 Python repositories (2,294 instances).",
    scores:
      "Verification by the repository's own tests; versioned families (Verified, Lite, Multilingual…).",
    freshness: "Versioned benchmark families.",
    source: "https://www.swebench.com/",
  },
  {
    platform: "Aider leaderboards",
    host: "aider.chat",
    measures:
      "Code editing on 225 Exercism exercises across six languages.",
    scores:
      "Per-run disclosure: edit format, pass rates, cost, seconds per case, token counts, timeouts.",
    freshness: "Per-run rows, each dated.",
    source: "https://aider.chat/docs/leaderboards/",
  },
  {
    platform: "LiveBench",
    host: "github.com/LiveBench",
    measures:
      "18 tasks across 6 categories, designed to limit contamination by releasing new questions monthly.",
    scores:
      "Verifiable, objective ground-truth answers — without the use of an LLM judge.",
    freshness: "Monthly question refresh.",
    source: "https://github.com/LiveBench/LiveBench",
  },
  {
    platform: "HELM",
    host: "github.com/stanford-crfm/helm",
    measures:
      "Holistic, reproducible, transparent evaluation; leaderboards per domain (Capabilities, Safety, VHELM, MedHELM).",
    scores: "Scenario-based metrics; Apache-2.0 open-source framework.",
    freshness:
      "Entered maintenance mode on June 1, 2026 — even flagship boards age.",
    source: "https://github.com/stanford-crfm/helm",
  },
] as const;
