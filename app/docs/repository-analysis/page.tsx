import { DocsShell } from "@/components/DocsShell";
import { DocsArticle } from "@/components/docs/DocsArticle";
import { ApiTable, Code, Note } from "@/components/docs/DocsBits";

export const metadata = {
  title: "Repository analysis — ModelCheck",
  description: "Profile a local repository, find relevant ModelCheck evidence, and assess a chosen model.",
};

export default function RepositoryAnalysisPage() {
  return (
    <DocsShell active="/docs/repository-analysis">
      <DocsArticle>
        <p className="eyebrow">Evaluate</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.045em] text-text sm:text-5xl">Repository analysis</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-text-muted">
          Start with the project you are building. ModelCheck reads a local repository,
          describes its workload, and connects that profile to the evaluation evidence
          already available on your machine.
        </p>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">Recommend models for a project</h2>
        <p className="mt-4 text-md leading-7 text-text-muted">
          Give ModelCheck a repository path to create a profile and rank suitable
          candidates. The command reports what it found before it explains the
          recommendation, so the result is reviewable rather than a black-box label.
        </p>
        <Code label="bash">modelcheck repo ./my-project</Code>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">Assess one model and provider</h2>
        <p className="mt-4 text-md leading-7 text-text-muted">
          Add both a model and provider to run the existing evaluation flow for that
          choice. The assessment reflects the measured result; supplying a model does
          not make it the recommendation automatically.
        </p>
        <Code label="bash">modelcheck repo ./my-project anthropic/claude-sonnet-5 openrouter</Code>

        <ApiTable
          rows={[
            ["<project-repo>", "A local repository or project directory to inspect."],
            ["<model-name>", "A ModelCheck model identifier, such as anthropic/claude-sonnet-5."],
            ["<provider-name>", "The provider used to access that model, such as openrouter."],
          ]}
        />

        <h2 className="mt-12 text-lg font-semibold tracking-tight">What repository analysis reads</h2>
        <p className="mt-4 text-md leading-7 text-text-muted">
          The scan identifies source languages, common frameworks, database signals,
          test presence, and source-file counts. It does not execute project scripts,
          install dependencies, or send your source code to a provider.
        </p>
        <Note>
          Repository recommendations use completed local ModelCheck reports as evidence.
          If comparable evidence is unavailable, the output says so instead of claiming
          a measured fit.
        </Note>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">How to interpret the result</h2>
        <p className="mt-4 text-md leading-7 text-text-muted">
          The repository profile helps explain the shape of the work, such as whether a
          project spans several languages or has a test suite. The current core suite
          measures structured output and tool calling; it does not directly measure
          code generation or multi-file repository reasoning. Treat those workload
          signals as context, and the reported evaluation coverage as the evidence.
        </p>

        <h2 className="mt-12 text-lg font-semibold tracking-tight">Model naming and validation</h2>
        <p className="mt-4 text-md leading-7 text-text-muted">
          Use the same model naming system as the rest of the CLI. ModelCheck combines
          the provider and model into its existing gateway/wire identifier—for example,
          <code className="mx-1 font-mono text-xs">openrouter/anthropic/claude-sonnet-5</code>.
          Provider and identifier validation is structural; provider-side availability
          is confirmed when the evaluation runs.
        </p>
      </DocsArticle>
    </DocsShell>
  );
}
