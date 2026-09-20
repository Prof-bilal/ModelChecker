import { DocsShell } from "@/components/DocsShell";
import { DocsArticle } from "@/components/docs/DocsArticle";
import { ApiTable, Code, Note } from "@/components/docs/DocsBits";

export const metadata = {
  title: "How to use — ModelCheck",
  description:
    "Model ids, gateways and adapters, run options, and what the report contains.",
};

const GATEWAYS: [string, string, string, string][] = [
  ["openai/…", "https://api.openai.com/v1", "OPENAI_API_KEY", "openai-compatible"],
  ["openrouter/…", "https://openrouter.ai/api/v1", "OPENROUTER_API_KEY", "openai-compatible"],
  ["anthropic/…", "https://api.anthropic.com/v1", "ANTHROPIC_API_KEY", "anthropic"],
  ["groq/…", "https://api.groq.com/openai/v1", "GROQ_API_KEY", "openai-compatible"],
  ["xai/…", "https://api.x.ai/v1", "XAI_API_KEY", "openai-compatible"],
  ["deepseek/…", "https://api.deepseek.com", "DEEPSEEK_API_KEY", "openai-compatible"],
];

export default function UsagePage() {
  return (
    <DocsShell active="/docs/usage">
      <DocsArticle>
        <p className="eyebrow">Docs</p>
        <h1 className="display-2 mt-4">How to use</h1>

        <h2 className="mt-10 text-lg font-semibold tracking-tight">Model ids, gateways, adapters</h2>
        <p className="mt-4 text-md text-text-muted">
          A model id is <code className="font-mono text-xs">gateway/wire-id</code>. The
          gateway prefix selects the default endpoint, the key variable, and the
          adapter; the wire id is what is actually sent.
        </p>
        <div className="my-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-160 text-left text-sm">
            <caption className="sr-only">Gateway prefixes and their endpoints</caption>
            <thead>
              <tr className="border-b border-border bg-surface text-xs text-text-muted">
                <th scope="col" className="px-4 py-2.5 font-medium uppercase tracking-wide">Prefix</th>
                <th scope="col" className="px-4 py-2.5 font-medium uppercase tracking-wide">Endpoint</th>
                <th scope="col" className="px-4 py-2.5 font-medium uppercase tracking-wide">Key variable</th>
                <th scope="col" className="px-4 py-2.5 font-medium uppercase tracking-wide">Adapter</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {GATEWAYS.map(([prefix, endpoint, key, adapter]) => (
                <tr key={prefix} className="border-b border-border last:border-b-0 align-top">
                  <th scope="row" className="px-4 py-2.5 font-medium">{prefix}</th>
                  <td className="px-4 py-2.5 text-text-muted">{endpoint}</td>
                  <td className="px-4 py-2.5 text-text-muted">{key}</td>
                  <td className="px-4 py-2.5 text-text-muted">{adapter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Code label="bash">{`modelcheck run --suite core --model openrouter/deepseek/deepseek-v4-flash
modelcheck run --suite core --model anthropic/claude-sonnet-5`}</Code>
        <p className="text-sm text-text-muted">
          <code className="font-mono text-xs">--base-url &lt;https-url&gt;</code> targets
          any other OpenAI-compatible or Anthropic endpoint. Non-HTTPS is refused except
          for loopback, and the cloud metadata service (169.254.169.254) is refused
          outright. <code className="font-mono text-xs">--adapter &lt;name&gt;</code>{" "}
          overrides the adapter explicitly — an unknown name is an error, not a silent
          fallback.
        </p>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">Run options</h2>
        <ApiTable
          rows={[
            ["--repeat <n>", "Repeat every case n times (repeats_per_case in the report)"],
            ["--concurrency <n>", "Bounded request pool (default 3)"],
            ["--timeout <ms>", "Per-request timeout (default 60000)"],
            ["--max-retries <n>", "Retries for retryable error classes only (default 2)"],
            ["--spend-limit <usd>", "Refuse to start if the estimate exceeds this"],
            ["--label <label>", "Human-readable run label, also used in the run id"],
            ["--json", "Machine-readable output where a command supports it"],
          ]}
        />

        <h2 className="mt-12 text-lg font-semibold tracking-tight">What a run writes</h2>
        <p className="text-sm text-text-muted">
          Each run writes to <code className="font-mono text-xs">RUNS_DIR/runs/&lt;run_id&gt;/</code>:
        </p>
        <ApiTable
          rows={[
            ["report.json", "The reproducibility manifest: parameters, per-case records, per-capability aggregates, cost, latency, limitations"],
            ["report.html", "Self-contained static report rendered only from report.json. No network, no external assets; all model output is escaped as inert text"],
            ["raw/<case_id>.json", "The provider's response, verbatim and unredacted"],
          ]}
        />

        <h2 className="mt-12 text-lg font-semibold tracking-tight">Commands at a glance</h2>
        <Code>{`modelcheck run      load a suite, plan, estimate, execute, score, aggregate, write
modelcheck compare  per-capability deltas between two local runs, with denominators
modelcheck list     local runs (run id, label, model, suite version, status)`}</Code>

        <Note>
          The suite — every case, prompt, and scoring rule — ships inside the package
          under <code className="font-mono text-xs">suites/</code> and is readable before
          you run anything. Suites are versioned; a suite version pins its case counts,
          repeats, scorer types, and known omissions.
        </Note>
      </DocsArticle>
    </DocsShell>
  );
}

