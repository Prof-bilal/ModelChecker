import { DocsShell } from "@/components/DocsShell";
import { DocsArticle } from "@/components/docs/DocsArticle";

export const metadata = {
  title: "Docs — ModelCheck",
  description:
    "ModelCheck CLI documentation: installation, quick start, running and comparing evaluations, privacy and cost.",
};

export default function DocsIndexPage() {
  return (
    <DocsShell active="/docs">
      <DocsArticle>
        <p className="eyebrow">Docs</p>
        <h1 className="display-2 mt-4">ModelCheck CLI</h1>
        <p className="mt-6 text-md text-text-muted">
          ModelCheck measures what a model change does to the capability you ship.
          It loads a versioned suite of cases from disk, sends them to a model you
          choose with your own API key, scores every response with a declared rule,
          and writes a portable <code className="font-mono text-xs">report.json</code> +{" "}
          <code className="font-mono text-xs">report.html</code> where every number
          traces back to the raw model output and the rule that scored it.
        </p>
        <p className="mt-4 text-md text-text-muted">
          Two runs of the same suite can be compared, and the comparison states its
          denominators. The current <code className="font-mono text-xs">core</code>{" "}
          suite (v1.0.0) measures <strong>two capabilities</strong> —{" "}
          <strong>structured output</strong> (15 cases) and <strong>tool calling</strong>{" "}
          (15 cases). Anything else is reported as <strong>not tested</strong>, which
          is not the same as zero.
        </p>
        <h2 className="mt-12 text-lg font-semibold tracking-tight">Start here</h2>
        <ol className="mt-4 space-y-3 text-sm text-text-muted">
          <li>
            <a href="/docs/installation" className="text-text underline decoration-border underline-offset-4 hover:decoration-text">
              Installation
            </a>{" "}
            — install the CLI from npm (Node.js ≥ 20).
          </li>
          <li>
            <a href="/docs/quick-start" className="text-text underline decoration-border underline-offset-4 hover:decoration-text">
              Quick start
            </a>{" "}
            — set a key, run the core suite, open the report.
          </li>
          <li>
            <a href="/docs/usage" className="text-text underline decoration-border underline-offset-4 hover:decoration-text">
              How to use
            </a>{" "}
            — model ids, gateways, run options, reading the report.
          </li>
          <li>
            <a href="/docs/comparison" className="text-text underline decoration-border underline-offset-4 hover:decoration-text">
              Comparing runs
            </a>{" "}
            — two runs against each other, with denominators.
          </li>
          <li>
            <a href="/docs/compare-platforms" className="text-text underline decoration-border underline-offset-4 hover:decoration-text">
              Comparing platforms
            </a>{" "}
            — what public benchmark surfaces measure, with sources.
          </li>
          <li>
            <a href="/docs/privacy" className="text-text underline decoration-border underline-offset-4 hover:decoration-text">
              Privacy &amp; cost
            </a>{" "}
            — what leaves your machine, where results live, how cost is labelled.
          </li>
        </ol>
        <p className="mt-10 text-xs text-text-muted">
          The suite, scoring rules, and limits are readable in the open-source
          repository — nothing here is a black box.
        </p>
      </DocsArticle>
    </DocsShell>
  );
}
