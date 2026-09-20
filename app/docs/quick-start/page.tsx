import { DocsShell } from "@/components/DocsShell";
import { DocsArticle } from "@/components/docs/DocsArticle";
import { Code, Note } from "@/components/docs/DocsBits";

export const metadata = {
  title: "Quick start — ModelCheck",
  description:
    "Set an API key, run the 30-case core suite, and open the evidence report.",
};

export default function QuickStartPage() {
  return (
    <DocsShell active="/docs/quick-start">
      <DocsArticle>
        <p className="eyebrow">Docs</p>
        <h1 className="display-2 mt-4">Quick start</h1>
        <p className="mt-6 text-md text-text-muted">
          From install to a scored report in four steps. The run below executes the{" "}
          <code className="font-mono text-xs">core</code> suite — 30 cases across
          structured output and tool calling — against the model you name.
        </p>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">1. Provide a key — never as an argument</h2>
        <p className="text-sm text-text-muted">
          The key is read from an <strong>environment variable</strong>. It is never
          accepted on the command line, because argv is visible in <code className="font-mono text-xs">ps</code>{" "}
          output and shell history.
        </p>
        <Code label="bash">{`export ANTHROPIC_API_KEY='...'   # or OPENAI_API_KEY / OPENROUTER_API_KEY`}</Code>
        <p className="text-sm text-text-muted">
          <code className="font-mono text-xs">--api-key-env &lt;name&gt;</code> selects a
          different variable when your key is not in the provider’s conventional one.
          Passing a literal key there is rejected — the flag expects a variable{" "}
          <em>name</em>.
        </p>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">2. Run the suite</h2>
        <Code label="bash">{`modelcheck run --suite core --model anthropic/claude-sonnet-5`}</Code>
        <p className="text-sm text-text-muted">
          Before anything is billed, the CLI prints the suite hash, the planned case
          count, a <strong>pre-flight cost estimate</strong>, and the resolved target.
          Progress and the final path go to stderr, so stdout stays scriptable. A{" "}
          <strong>spending limit</strong> is reserved against the estimate and the run
          refuses to start above it.
        </p>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">3. Open the report</h2>
        <p className="text-sm text-text-muted">
          The run writes to <code className="font-mono text-xs">~/.modelcheck/runs/&lt;run_id&gt;/</code>{" "}
          (point it anywhere with the <code className="font-mono text-xs">RUNS_DIR</code>{" "}
          environment variable). Start with <code className="font-mono text-xs">report.html</code> —
          every case expands to its outcome, the scoring rule, and the raw response.
          Capabilities with no scored cases render <strong>“Not tested”</strong>, never{" "}
          <code className="font-mono text-xs">0</code>.
        </p>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">4. Run a second model and compare</h2>
        <Code label="bash">{`modelcheck run --suite core --model openai/gpt-4o --label baseline
modelcheck list
modelcheck compare <run-a-id> <run-b-id>`}</Code>
        <p className="text-sm text-text-muted">
          The product is the delta between two runs, not a single score. See{" "}
          <a href="/docs/comparison" className="text-text underline decoration-border underline-offset-4 hover:decoration-text">
            Comparing runs
          </a>
          .
        </p>

        <Note>
          No key yet, or want to see the mechanics first?{" "}
          <code className="font-mono text-xs">--adapter mock</code> replays recorded
          fixtures with <strong>no network and no key</strong>. It is selected only by
          that explicit flag.
        </Note>
      </DocsArticle>
    </DocsShell>
  );
}
