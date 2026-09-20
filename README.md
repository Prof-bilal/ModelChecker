# ModelCheck

**Measure what a model change does to the capability you ship — and show the evidence.**

AI models change constantly. Leaderboards and vendor announcements do not tell you
whether a new model is better *for your workload*. ModelCheck runs a small,
versioned, deterministic evaluation against a model you choose, compares it with
your current one, and produces a portable report where every number links back to
the raw model output and the rule that scored it.

```text
model changes → run against a capability → delta vs your baseline → decide
```

## Status — read this first

**The CLI is built; the hosted product does not exist.** This repository contains:

- a **Next.js landing page** (`app/`, `components/`)
- the **CLI** (`cli/`) — built through Phase 7 in [PHASES.md](./PHASES.md), with
  install and usage in [cli/README.md](./cli/README.md)
- a **complete product and engineering specification** (the documents below)
- **no API route, no database, no hosted service, no telemetry, and no CI
  evaluation** — the CLI writes local files only

The CLI's automated suite passes without network access. Run artefacts are written
to your local `RUNS_DIR` and are not committed; every figure shown on the landing
page is labelled illustrative.

## Where to start

| You want to know | Read |
|---|---|
| What we are building and why | [PRD.md](./PRD.md) |
| What is being built **right now** (and what is not) | [MVP.md](./MVP.md) |
| Positioning, principles, product voice | [PRODUCT.md](./PRODUCT.md) |
| How the system is structured | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| How evaluation, scoring and trust work | [EVALUATIONS.md](./EVALUATIONS.md) |
| What the V1 suite actually contains | [docs/benchmarks.md](./docs/benchmarks.md) |
| The evidence behind every claim | [docs/research.md](./docs/research.md) |
| Why things are the way they are | [docs/decisions.md](./docs/decisions.md) |
| Security and data handling | [SECURITY.md](./SECURITY.md) |
| Testing | [TESTING.md](./TESTING.md) |
| Code conventions | [CODESTYLE.md](./CODESTYLE.md) |
| What happens after the MVP | [ROADMAP.md](./ROADMAP.md) |
| **Working in this repo as an AI agent** | **[AGENTS.md](./AGENTS.md)** |

## Current verdict: BUILD WITH CHANGES

The problem is real and the timing is good, but the product as originally framed
was self-undermining: a fixed capability suite *is* a benchmark, which is the
commodity this product exists to replace. The corrected framing is a **decision
artefact** — a delta against a pinned baseline — not a scorecard. See
[docs/decisions.md](./docs/decisions.md) for the reasoning and the four unresolved
contradictions currently recorded.

## Running the landing page

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build
npm run lint     # eslint (eslint-config-next)
npx tsc --noEmit # type check
```

## Running the CLI

From `cli/`, install and build with `npm install`. Provide a provider key through
the environment (never as a command-line argument), then run:

```bash
export OPENAI_API_KEY='...'
npx modelcheck run --suite core --model gpt-4o
modelcheck list
modelcheck compare <run-a> <run-b>
```

Read `report.html` in the run directory. Suite prompts are sent to the selected
provider, so do not evaluate sensitive workloads without checking that provider's
data policy. Runs are stored locally under `RUNS_DIR` (user-controlled); it may
contain prompts and model outputs. Prefer a key scoped to evaluation use, rotate
it if it appears in shell history, and never use a production key with unnecessary
write privileges.

Stack: Next.js 16.3.5 (App Router), React 19.2.8, Tailwind CSS v4, TypeScript
(strict). Design tokens live in `app/globals.css` and are defined in the design
contract; components consume tokens only.

## What this is not

Not a leaderboard. Not an evaluation framework or SDK. Not an observability
platform. Not a model router. Not a dashboard. Each of these is a deliberate
rejection with a recorded reason in [PRODUCT.md](./PRODUCT.md) and
[docs/decisions.md](./docs/decisions.md).

## Contributing

Read [AGENTS.md](./AGENTS.md) first — it is the entry point for both human and AI
contributors, and it defines the source-of-truth order and the hard rules. The
short version: check [MVP.md](./MVP.md) before building anything, never invent a
number, and never present an unbuilt capability as shipped.
