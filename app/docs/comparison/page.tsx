import { DocsShell } from "@/components/DocsShell";
import { DocsArticle } from "@/components/docs/DocsArticle";
import { Code, Note } from "@/components/docs/DocsBits";

export const metadata = {
  title: "Comparing runs — ModelCheck",
  description:
    "Compare two local runs metric by metric, with denominators and flagged parameter differences.",
};

export default function ComparisonPage() {
  return (
    <DocsShell active="/docs/comparison">
      <DocsArticle>
        <p className="eyebrow">Docs</p>
        <h1 className="display-2 mt-4">Comparing runs</h1>
        <p className="mt-6 text-md text-text-muted">
          The comparison that matters is always <strong>two runs against each other</strong>,
          and the default candidate is the model you already run. A single score is an
          intermediate, not the product.
        </p>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">The loop</h2>
        <Code label="bash">{`modelcheck run --suite core --model openai/gpt-4o --label baseline
# ...model or provider changes...
modelcheck run --suite core --model openai/gpt-5.2-mini --label candidate
modelcheck list
modelcheck compare <baseline-id> <candidate-id>`}</Code>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">Rules the comparison obeys</h2>
        <ul className="mt-4 space-y-3 text-sm text-text-muted">
          <li>
            <strong className="text-text">Same suite or no comparison.</strong> Runs from
            different suite versions or content hashes are refused, with the reason stated.
          </li>
          <li>
            <strong className="text-text">Every delta carries its denominator.</strong>{" "}
            <code className="font-mono text-xs">+2 of 15</code> can never be mistaken for{" "}
            <code className="font-mono text-xs">+2 of 30</code>.
          </li>
          <li>
            <strong className="text-text">Differing parameters are flagged.</strong> If the
            two runs used different temperature, repeat counts, or timeouts, the comparison
            says so instead of silently averaging over them.
          </li>
          <li>
            <strong className="text-text">Deterministic and model-judged numbers never mix.</strong>{" "}
            Schema parsing and tool-call matching are deterministic scorers; results scored
            by a model-judge live in a separate lane and are never aggregated together.
          </li>
        </ul>

        <Note>
          Re-running the identical suite on the identical model will not reproduce the
          identical numbers — sampling is non-deterministic. What reproduces is the{" "}
          <em>procedure</em>: every report pins the exact model ID, provider, parameters,
          suite version, and timestamp.
        </Note>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">Read the deltas, then the cases</h2>
        <p className="text-sm text-text-muted">
          A delta is a lead, not a verdict. Open both reports and read the cases that
          flipped — the raw output, the scoring rule, and the rationale are all in{" "}
          <code className="font-mono text-xs">report.html</code>. That evidence, not the
          sign of the delta, is what you act on.
        </p>

        <p className="mt-10 text-xs text-text-muted">
          For a description of the public benchmark platforms — what they
          measure and how they score — see{" "}
          <a
            href="/docs/compare-platforms"
            className="underline decoration-border underline-offset-4 hover:decoration-text"
          >
            Comparing platforms
          </a>
          .
        </p>
      </DocsArticle>
    </DocsShell>
  );
}
