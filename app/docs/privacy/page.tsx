import { DocsShell } from "@/components/DocsShell";
import { DocsArticle } from "@/components/docs/DocsArticle";
import { Code, Note } from "@/components/docs/DocsBits";

export const metadata = {
  title: "Privacy & cost — ModelCheck",
  description:
    "What leaves your machine, where results are stored, and how cost estimates are labelled.",
};

export default function PrivacyPage() {
  return (
    <DocsShell active="/docs/privacy">
      <DocsArticle>
        <p className="eyebrow">Docs</p>
        <h1 className="display-2 mt-4">Privacy &amp; cost</h1>

        <h2 className="mt-10 text-lg font-semibold tracking-tight">What leaves your machine</h2>
        <p className="mt-4 text-md text-text-muted">
          <strong className="text-text">
            The suite’s prompts are sent to the provider you select, as ordinary API
            requests, and are subject to that provider’s data policy.
          </strong>{" "}
          This is the one place data leaves your machine, and it is stated plainly
          rather than implied. There is no ModelCheck server, no upload path, and no
          telemetry. Your API key is never written to reports, exports, or logs, and
          never accepted as a command-line argument; it lives in memory for the
          process lifetime only.
        </p>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">Where results are stored</h2>
        <ul className="mt-4 space-y-3 text-sm text-text-muted">
          <li>
            <code className="font-mono text-xs">RUNS_DIR</code> is user-controlled: it
            defaults to <code className="font-mono text-xs">~/.modelcheck/</code> and can
            be pointed anywhere with the{" "}
            <code className="font-mono text-xs">RUNS_DIR</code> environment variable.
          </li>
          <li>
            <code className="font-mono text-xs">RUNS_DIR</code> may contain sensitive
            prompts and model outputs. Exclude it from backups and never commit it.
          </li>
          <li>
            Mock runs write to a temporary directory instead, so an offline test never
            pollutes your run history.
          </li>
        </ul>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">Cost is an estimate — and “unpriced” is not zero</h2>
        <p className="mt-4 text-sm text-text-muted">
          Pre-flight estimates use a dated price snapshot and clearly-labelled token
          assumptions. Per-case and run totals use the token counts the provider
          actually returned. Every charge in a report is labelled{" "}
          <code className="font-mono text-xs">estimated</code>. If a model has no price
          row, cost is reported as <strong>unpriced</strong> — never <code className="font-mono text-xs">0</code>{" "}
          — and a run that mixed priced and unpriced cases refuses to print a partial
          total rather than misstate spend.
        </p>
        <Code label="bash">{`# refuse to start if the estimate exceeds your budget
modelcheck run --suite core --model anthropic/claude-sonnet-5 --spend-limit 0.50`}</Code>

        <Note>
          ModelCheck charges nothing itself. Your provider bills you directly for the
          model calls the suite makes. Prefer a key scoped to evaluation use, and never
          run with a production key that has write privileges it does not need.
        </Note>
      </DocsArticle>
    </DocsShell>
  );
}
