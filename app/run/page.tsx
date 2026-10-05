import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { ActionButton } from "@/components/ActionButton";
import { Code, Note } from "@/components/docs/DocsBits";

/**
 * The primary CTA's destination. Deliberately a static page: MVP §6 excludes any
 * hosted service, server or API route (D1), and SECURITY §8 gates a web form that
 * would hold a provider key. Everything below executes on the user's machine; this
 * route runs no code, takes no key, and sends nothing anywhere.
 */
export const metadata = {
  title: "Run an evaluation — ModelCheck",
  description:
    "Install the CLI, provide a provider key, and run the 30-case core suite on your machine. There is no ModelCheck server: your key never touches this site.",
};

const STEPS = [
  {
    n: "01",
    t: "Install the CLI",
    body: (
      <>
        One package, zero runtime dependencies, Node.js 20 or newer. It puts the{" "}
        <code className="font-mono text-xs">modelcheck</code> command on your PATH.
      </>
    ),
    code: { label: "bash", cmd: "npm install -g modelcheck-cli" },
    link: { href: "/docs/installation", label: "Installation details" },
  },
  {
    n: "02",
    t: "Provide a key — from an environment variable",
    body: (
      <>
        The key is read from the environment and sent only to the provider you
        select. It is never accepted as a command-line argument, because argv is
        visible in <code className="font-mono text-xs">ps</code> output and shell
        history, and it is never written to a report, a log, or this site.
      </>
    ),
    code: {
      label: "bash",
      cmd: "export OPENAI_API_KEY='...'   # or ANTHROPIC_API_KEY / OPENROUTER_API_KEY",
    },
    link: { href: "/docs/quick-start", label: "Key handling" },
  },
  {
    n: "03",
    t: "Run the suite",
    body: (
      <>
        Before the first request, the CLI prints the suite hash, the planned case
        count and a <strong>pre-flight cost estimate</strong>, and refuses to start
        above a{" "}
        <code className="font-mono text-xs">--spend-limit</code> you set. The run
        executes 30 cases — structured output and tool calling — against the model
        you name.
      </>
    ),
    code: {
      label: "bash",
      cmd: "modelcheck run --suite core --model anthropic/claude-sonnet-5",
    },
    link: { href: "/docs/usage", label: "Run options" },
  },
  {
    n: "04",
    t: "Read the evidence",
    body: (
      <>
        The run writes{" "}
        <code className="font-mono text-xs">report.html</code> and{" "}
        <code className="font-mono text-xs">report.json</code> under{" "}
        <code className="font-mono text-xs">~/.modelcheck/runs/&lt;run_id&gt;/</code>{" "}
        (repoint it with <code className="font-mono text-xs">RUNS_DIR</code>).
        Every case expands to its outcome, the scoring rule and the raw response.
        Run a second model, then compare the two with denominators attached.
      </>
    ),
    code: {
      label: "bash",
      cmd: "modelcheck list\nmodelcheck compare <run-a-id> <run-b-id>",
    },
    link: { href: "/docs/comparison", label: "Comparing runs" },
  },
] as const;

export default function RunPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto max-w-(--content-max) px-4 py-16 sm:px-6 lg:py-24">
        <div className="max-w-3xl">
          <p className="eyebrow">Run an evaluation</p>
          <h1 className="display-2 mt-4">Run it on your machine</h1>
          <p className="mt-6 text-md text-text-muted">
            ModelCheck is a local command-line tool. Four commands take you from a
            clean machine to a scored report with the raw model output attached.
            Nothing on this page executes — there is no ModelCheck server.
          </p>
        </div>

        <Note>
          <strong className="text-text">This page runs nothing and asks for no key.</strong>{" "}
          The suite prompts go from your machine to the provider you selected, as
          ordinary API requests, subject to that provider’s data policy. Reports are
          local files under <code className="font-mono text-xs">RUNS_DIR</code>.
          Provider API charges apply.
        </Note>

        <ol className="mt-12 max-w-3xl">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="border-t border-border py-8 first:border-t-0 first:pt-0"
            >
              <div className="flex items-baseline gap-4">
                <span
                  aria-hidden="true"
                  className="font-mono text-xs text-text-muted"
                >
                  {s.n}
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight">{s.t}</h2>
                  <p className="mt-2 text-sm text-text-muted">{s.body}</p>
                  <Code label={s.code.label}>{s.code.cmd}</Code>
                  <Link
                    href={s.link.href}
                    className="text-sm text-text underline decoration-border underline-offset-4 hover:decoration-text"
                  >
                    {s.link.label}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <section className="max-w-3xl border-t border-border pt-10">
          <h2 className="text-lg font-semibold tracking-tight">What a run measures</h2>
          <p className="mt-2 text-sm text-text-muted">
            The shipped <code className="font-mono text-xs">core@1.0.0</code> suite
            scores <strong className="text-text">two capabilities</strong> —
            structured output and tool calling, 15 cases each — and reports latency,
            estimated cost and reliability for the run. Reasoning, instruction
            following, long context, coding and vision are{" "}
            <strong className="text-text">not tested</strong>: they render as “not
            tested”, never as 0.
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <ActionButton href="/docs/quick-start" size="lg">
            Read the quick start
          </ActionButton>
          <ActionButton href="/docs/installation" variant="outline" size="lg">
            Installation
          </ActionButton>
          <ActionButton href="/#example" variant="outline" size="lg">
            Explore example report
          </ActionButton>
        </div>
      </main>
    </>
  );
}
