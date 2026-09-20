import { DocsShell } from "@/components/DocsShell";
import { DocsArticle } from "@/components/docs/DocsArticle";
import { Code, Note } from "@/components/docs/DocsBits";

export const metadata = {
  title: "Installation — ModelCheck",
  description:
    "Install the ModelCheck CLI from npm, or run it with npx. Node.js 20 or newer.",
};

export default function InstallationPage() {
  return (
    <DocsShell active="/docs/installation">
      <DocsArticle>
        <p className="eyebrow">Docs</p>
        <h1 className="display-2 mt-4">Installation</h1>
        <p className="mt-6 text-md text-text-muted">
          ModelCheck ships as a single npm package with no runtime dependencies.
          You need <strong>Node.js 20 or newer</strong> — the CLI uses{" "}
          <code className="font-mono text-xs">node:test</code>, global{" "}
          <code className="font-mono text-xs">fetch</code>, and{" "}
          <code className="font-mono text-xs">node:util</code> parseArgs.
        </p>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">Install globally</h2>
        <Code label="npm">{`npm install -g modelcheck-cli`}</Code>
        <p className="text-sm text-text-muted">
          This puts the <code className="font-mono text-xs">modelcheck</code> command
          on your PATH. Check it:
        </p>
        <Code>{`modelcheck --help`}</Code>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">Run without installing</h2>
        <Code label="npx">{`npx modelcheck-cli@latest --help`}</Code>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">From a clone of the repository</h2>
        <Code label="bash">{`git clone https://github.com/Prof-bilal/ModelChecker.git
cd ModelChecker/cli
npm install     # builds via the prepare script
npm link        # optional: puts \`modelcheck\` on your PATH`}</Code>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">What gets installed</h2>
        <p className="text-sm text-text-muted">
          The package contains the compiled CLI (<code className="font-mono text-xs">dist/</code>)
          and the versioned suite definitions (<code className="font-mono text-xs">suites/</code>).
          It has <strong>zero runtime dependencies</strong>, phones home to nothing, and
          runs no telemetry. The only network traffic ModelCheck itself ever makes is
          the requests you ask it to make — to the model provider you select.
        </p>

        <Note>
          Upgrading: <code className="font-mono text-xs">npm update -g modelcheck-cli</code>{" "}
          (or <code className="font-mono text-xs">npx modelcheck-cli@latest</code> to always
          run the newest published version without a global install).
        </Note>
      </DocsArticle>
    </DocsShell>
  );
}
