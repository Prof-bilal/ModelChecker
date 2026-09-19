# ModelCheck — Agent Operating Manual

**ModelCheck measures what a model change does to the capability you ship — and shows its evidence.**
Read this file first. It is the entry point for every coding agent working in this repository.

**Current state (2026-09-18):** this repository contains a Next.js landing page and **no product**. There is no CLI, no API route, no database, no evaluation engine, and no test runner. The product is specified in these documents and has produced **zero measurements**.

---

## 1. Read before you write

Match your task to a document. Do not guess.

| Your task | Read first |
|---|---|
| Understand the problem, user, or requirements | [PRD.md](./PRD.md) |
| Decide whether something is in scope | [MVP.md](./MVP.md) — **authoritative for scope** |
| Build anything, or change structure | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Touch tests, fixtures, or scoring rules | [TESTING.md](./TESTING.md) |
| Touch scoring, metrics, cost, latency, statistics | [EVALUATIONS.md](./EVALUATIONS.md) |
| Handle a key, a log, storage, or network egress | [SECURITY.md](./SECURITY.md) |
| Write any code | [CODESTYLE.md](./CODESTYLE.md) |
| Add a case or change the suite | [docs/benchmarks.md](./docs/benchmarks.md) |
| Plan future work | [ROADMAP.md](./ROADMAP.md) — **never overrides MVP.md** |
| Cite a fact or a number | [docs/research.md](./docs/research.md) |
| Understand why something is the way it is | [docs/decisions.md](./docs/decisions.md) |
| Understand positioning and product voice | [PRODUCT.md](./PRODUCT.md) |
| Understand the UI design contract | `../design.md` — outside this repository, see [decisions U1](./docs/decisions.md#u1--designmd-and-the-source-evidence-live-outside-version-control) |

## 2. Source of truth hierarchy

When two sources disagree, the higher one wins **for its own domain**:

1. **Actual code and configuration** — what is really true right now
2. **[MVP.md](./MVP.md)** — current scope. Wins all scope disputes
3. **[PRD.md](./PRD.md)** — product intent and requirements
4. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — intended technical structure
5. **[EVALUATIONS.md](./EVALUATIONS.md)** — evaluation methodology
6. **[SECURITY.md](./SECURITY.md)** — security and privacy rules
7. **[TESTING.md](./TESTING.md)** — testing rules
8. **[PRODUCT.md](./PRODUCT.md)** — positioning, principles, voice
9. **[ROADMAP.md](./ROADMAP.md)** — future direction. **Cannot add scope**
10. **[docs/research.md](./docs/research.md)**, **[docs/decisions.md](./docs/decisions.md)**, **[docs/benchmarks.md](./docs/benchmarks.md)** — supporting

**If code contradicts a document, do not silently "fix" the document to match the code, and do not rewrite the code to match the document.** Investigate, then either record the resolution in [docs/decisions.md](./docs/decisions.md) or add it to that file's unresolved section.

Existing open contradictions: **U1** (`design.md` is outside version control), **U2** (the landing page advertises an npm package that returns 404), **U3** (hosted-key privacy copy for a server that does not exist), **U4** (the landing page advertises eight capabilities; the MVP measures two).

## 3. Before you code

1. Read the documents in §1 that match your task.
2. Read the files you are about to change, and the ones beside them. Existing code is the style reference.
3. Confirm the work is in [MVP.md](./MVP.md) §4. **If it is not, stop and say so.**
4. Check [docs/decisions.md](./docs/decisions.md) — the idea may already be rejected (§4) or deferred.
5. Check that any fact you need has an evidence row in [docs/research.md](./docs/research.md). If it does not, you may not use the number.

## 4. While you code

- Follow [CODESTYLE.md](./CODESTYLE.md). Prefer the existing file's patterns over your own preference.
- **Respect module boundaries** ([CODESTYLE §2.2](./CODESTYLE.md#22-module-boundaries)): scorers do no I/O; the report renderer reads only `report.json`; adapters know nothing about scoring.
- **Do not add a dependency without a recorded decision** ([CODESTYLE §2.7](./CODESTYLE.md#27-dependency-rules)). Prefer Node built-ins.
- Keep tests off the network. **Never make a real, billable provider call in an automated test** ([TESTING.md §3.1](./TESTING.md#31-the-live-smoke-test)).
- Never print, log, or persist a credential. Never accept one as a CLI argument.
- Never render model output as HTML. It is untrusted text.
- Do not expand scope. If you notice something needed but out of scope, record it in [ROADMAP.md](./ROADMAP.md) or [docs/decisions.md](./docs/decisions.md) — do not build it.
- Do not modify unrelated files. Do not reformat files you did not otherwise change.
- If you change behaviour a document owns, update that document **in the same commit**.

## 5. Before you finish

1. Run `npm run lint` and `npx tsc --noEmit`. Once the CLI exists, run `npm test`.
2. Inspect `git diff`. Confirm every changed line is one you intended.
3. Check for scope creep: does the diff contain anything outside [MVP.md](./MVP.md) §4?
4. Check the invariants: denominators intact, `not tested ≠ 0`, cost labelled *estimated*, no invented numbers.
5. Confirm no credential, secret, or real API key appears in any changed file.
6. Record any decision in [docs/decisions.md](./docs/decisions.md).
7. Report what you changed, what you deliberately did not, and anything you found that contradicts the docs.

## 6. Hard rules — never violate

| # | Rule |
|---|---|
| 1 | **Never invent a statistic, benchmark score, price, or user quote.** No number exists without an evidence row in [docs/research.md](./docs/research.md) or a real run. |
| 2 | **Never present "not tested" as 0**, and never infer an untested capability ([D4](./docs/decisions.md)). |
| 3 | **Never mix model-judged and deterministic numbers** in one aggregate ([EVALUATIONS §4](./EVALUATIONS.md#4-evaluator-types)). |
| 4 | **Never resolve a contradiction silently.** Record it. |
| 5 | **Never make a real provider call in an automated test.** |
| 6 | **Never add a dependency, a service, a database, or a framework** without a recorded decision. |
| 7 | **Never add scope.** [MVP.md](./MVP.md) is binding; [ROADMAP.md](./ROADMAP.md) is not a to-do list. |
| 8 | **Never weaken a scoring rule, suite case, or golden file to make a test pass.** |
| 9 | **Never present an unbuilt capability as shipped** — including in `components/` copy. |
| 10 | **Never commit a user's prompts, outputs, or keys.** |

## 7. Where things live

```text
web/                    the git repository (the workspace root is NOT a git repo)
├── app/                Next.js App Router — landing page; /run is a stub
├── components/         landing-page components; the report's visual language
├── docs/               research.md · decisions.md · benchmarks.md
├── cli/                TO BUILD — the entire MVP (see ARCHITECTURE.md §2)
└── *.md                this file and its siblings
```

## 8. Canonical homes — do not duplicate

| Topic | Home |
|---|---|
| Evidence, sources, hypotheses | [docs/research.md](./docs/research.md) |
| Decisions and open contradictions | [docs/decisions.md](./docs/decisions.md) |
| Suite cases | [docs/benchmarks.md](./docs/benchmarks.md) |
| Scope | [MVP.md](./MVP.md) |
| Scoring, metrics, reproducibility | [EVALUATIONS.md](./EVALUATIONS.md) |
| Secrets, data handling, threats | [SECURITY.md](./SECURITY.md) |
| Test strategy and mocking | [TESTING.md](./TESTING.md) |
| Conventions | [CODESTYLE.md](./CODESTYLE.md) |
| Components and data flow | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Positioning and voice | [PRODUCT.md](./PRODUCT.md) |
| Future stages, economics, moat | [ROADMAP.md](./ROADMAP.md) |

If a fact has a canonical home, **link to it** rather than restating it.

> **Note on the block below:** the `nextjs-agent-rules` section is written and
> re-added by `next dev`. Do not delete it — doing so only recreates an uncommitted
> change. Commit it together with your work to keep the tree clean.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
