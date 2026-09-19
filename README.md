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

**The product does not exist yet.** This repository currently contains:

- a **Next.js landing page** (`app/`, `components/`)
- a **complete product and engineering specification** (the documents below)
- **no CLI, no API route, no database, no evaluation engine, and no test runner**

ModelCheck has produced **zero measurements**. Every figure shown on the landing
page is labelled illustrative. No number in this repository is a result.

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
