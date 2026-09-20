# ModelCheck — Product Requirements

**Version:** 0.3 · **Date:** 2026-09-20 · **Status:** research-derived; supersedes the implicit PRD in `../design.md`

> **Lane A (2026-09-20).** ModelCheck now has two lanes: **Lane A — repository trials** (evaluate a model against the developer's own repository, tasks and tests; the active build line, specified in [docs/trials.md](./docs/trials.md) with decisions [D21–D27](./docs/decisions.md)) and **Lane B — capability suites** (the fixed 30-case suite described below; shipped, maintenance-only). This document's §2–§12 describe Lane B unless stated otherwise. The two lanes share the same trust machinery and the same evidence register.

**Canonical-home rules:** evidence lives in [docs/research.md](./docs/research.md). Scope lives in [MVP.md](./MVP.md). Evaluation methodology lives in [EVALUATIONS.md](./EVALUATIONS.md). This document owns *intent* only.

## 1. Problem

AI model releases are frequent, and every release arrives with claim-like
artifacts: vendor marketing, an aggregate index score, social-media threads, and
review posts. None of them describe the reader's own workload, and the dominant
public ranking signal is publicly contested
([research E1](./docs/research.md#2-evidence-register)).

The engineer therefore ends up with a decision they cannot defend. They have been
asked, usually by someone senior, whether the product should move to the new
model — and the honest answer is "we would have to try it and see".

## 2. Target user

**Primary (ICP #1) — see [PRD §2.1](#21-icp-1-definition).**
**Secondary:** a tech lead or founder who receives a shared result and must act
on it. **Future, explicitly not v1:** platform teams, agencies, enterprise ML.

### 2.1 ICP #1 definition

> **A founding or early engineer at a 5–50 person company that ships an AI
> feature, who personally owns the prompts and the model configuration for that
> feature, and who is on the hook to justify model changes.**

Qualifying attributes (all should hold):

- Ships a **structured or tool-using** LLM feature (extraction, classification,
  form filling, function calling, agentic steps) — not free-form chat only.
  This is required because v1 scoring is deterministic ([decisions D3](./docs/decisions.md)).
- Uses hosted provider APIs (OpenAI, Anthropic, Google, or an
  OpenAI-compatible endpoint). Local-only Ollama users are out of scope for v1.
- Has **no** evaluation harness. They test by hand, or by reading a few outputs.
- Feels the trigger in §3 at least monthly.

Explicitly **not** the first customer: model researchers (they have Inspect and
lm-evaluation-harness — [E3](./docs/research.md#2-evidence-register)), ML
platform teams at large enterprises (procurement cycle), and prompt-security
teams (promptfoo's territory — [E5](./docs/research.md#2-evidence-register)).

## 3. Trigger

Three trigger events, in descending order of frequency:

| # | Trigger | Frequency | v1 handles it? |
|---|---|---|---|
| T1 | A new frontier model is released and someone asks "should we switch?" | Per release; high | Yes |
| T2 | A model the team already uses is **deprecated or superseded** by the provider, forcing a migration | Provider cadence | Yes |
| T3 | The team is changing something adjacent — prompt rewrite, provider switch, price increase, latency SLO miss — and needs to know whether quality moves | Ad hoc | Partially |

**T1 and T2 are the same job.** Both are "the model changed; what does that do to
my capability?" — which is why the product is framed as a **delta**, not a score
([decisions D2](./docs/decisions.md)).

## 4. Job to be done

> **When a model I depend on changes — a new release, or a version my provider
> moved under me — I want to know whether it is better or worse for the specific
> capability my product depends on, with evidence I can show someone else, so I
> can decide to switch, stay, or escalate — without building an evaluation
> harness.**

## 5. Context: what exists today

Established in [docs/research.md §5](./docs/research.md#5-competitor-research).
Summarised: producing evaluations is a **solved, commoditized, mostly free**
problem (promptfoo 25,254★ MIT; lm-evaluation-harness 14,016★; Inspect 2,805★).
Producing a **decision about one's own workload, with provenance, for someone who
will not author an evaluation** is not solved.

Two consequences that shape every requirement below:

- We must not compete on suite authoring, breadth, or dashboards.
- Our differentiator is the **artefact** — a result a reader can trace from
  conclusion to raw model output — not the test set
  ([research I3](./docs/research.md#3-interpretation-of-the-evidence)).

## 6. Core workflow

```text
modelcheck run --suite core --model <provider/model>          # creates a baseline
        ↓
report.json + report.html   (local, versioned, portable)
        ↓
# a model changes, or a candidate appears
modelcheck run --suite core --model <candidate> --label candidate
        ↓
modelcheck compare <baseline-run> <candidate-run>
        ↓
per-capability delta + estimated cost delta + latency delta,
every number linked to its cases
```

Both paths end at the same artefact. Comparison is not a separate product.

## 7. Requirements

Priority uses **MUST / SHOULD / NOT NOW**. Only MUST items exist in v1, and all of
them are enumerated in [MVP.md](./MVP.md) — this section states intent, not scope.

### 7.1 Functional

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| R1 | Run a versioned suite against a named provider/model using a key from the environment | MUST | The key is never accepted as a CLI argument |
| R2 | Score capabilities **deterministically** where possible | MUST | [decisions D3](./docs/decisions.md) |
| R3 | Emit a portable JSON report containing raw outputs and full provenance | MUST | Superset of the manifest in [EVALUATIONS.md](./EVALUATIONS.md) |
| R4 | Emit a human-readable static HTML report from the same data | MUST | Reuses the token system in [CODESTYLE.md](./CODESTYLE.md) |
| R5 | Compare two runs of the same suite version and report deltas | MUST | The core value unit ([D2](./docs/decisions.md)) |
| R6 | Report cost and latency as measurements **separate** from quality | MUST | [D9](./docs/decisions.md) |
| R7 | Mark untested capabilities as **not tested**, never 0 | MUST | [D4](./docs/decisions.md) |
| R8 | Record the provider's *resolved* model identifier, not just the requested alias | MUST | Enables the T2 use case |
| R9 | Fail loudly and distinguish request errors from scoring errors | MUST | `../design.md` §10, §19 |
| R10 | Support OpenAI-compatible and Anthropic endpoints | MUST | Covers ICP #1's two most likely providers |
| R11 | Support a user-supplied suite | SHOULD | Stage 3 |
| R12 | Model-judged scoring for open-ended tasks, labelled *model-judged* | SHOULD | Stage 3 |
| R13 | Hosted share link for a report | SHOULD | Stage 2 — the distribution loop |
| R14 | CI integration with threshold-based failure | SHOULD | Stage 5 |
| R15 | GitHub Action with PR comment and badge | NOT NOW | Stage 5 |
| R16 | Accounts, teams, billing | NOT NOW | Stage 4 |
| R17 | Production monitoring / alerting from live traffic | NOT NOW | Different product ([E6](./docs/research.md#2-evidence-register)) |

### 7.2 Non-functional

| ID | Requirement |
|---|---|
| N1 | The default ≤30-case suite completes in under ~5 minutes at default concurrency on a normal connection |
| N2 | The HTML report is self-contained and renders offline |
| N3 | A run is resumable, or cheaply repeatable, after a provider failure without double-spending |
| N4 | Any displayed number is reproducible from the stored JSON alone |
| N5 | Credentials are never printed and are redacted from error paths ([SECURITY.md](./SECURITY.md)) |

## 8. Explicit non-requirements (v1)

Rejected positions and their reasons live in
[decisions §5](./docs/decisions.md#5-rejected-options-recorded-so-they-are-not-re-litigated).
In one line: no leaderboard, no dashboard, no routing, no observability, no
marketplace, no accounts, no team features, no mobile app, no browser extension,
no agent framework.

## 9. Success metrics

**Proposed validation criteria — not market facts.** Deliberately few, and set to
fail fast.

| Metric | Proposed target | Measured at |
|---|---|---|
| A stranger reaches a finished report unaided | ≥ 60% of 20 observed attempts, no help | Stage 0/1 |
| First-run completion (started → report written) | ≥ 80% | Stage 1 |
| **Repeat usage** — users with a saved baseline who run again within 30 days, **unprompted** | ≥ 40% | Stage 1/2 — this is the thesis ([H4](./docs/research.md#4-hypotheses-unvalidated--must-not-drive-scope)) |
| Users who show a result to a second human | ≥ 30% | Stage 2 |
| Users reporting the result changed a decision | ≥ 30% (self-reported; weak, directional only) | Stage 2 |

A single-digit repeat rate falsifies the retention thesis and triggers the kill
criteria in [MVP.md §8](./MVP.md#8-kill-criteria).

## 10. Constraints

| Constraint | Impact |
|---|---|
| No validation interviews have happened yet | Scope must stay falsifiable; Stage 0 precedes Stage 1 in [ROADMAP.md](./ROADMAP.md) |
| One developer, part-time | v1 is a CLI — no server, database, or auth |
| The user pays the provider bill | The default suite must be small and cheap; cost is shown before running |
| Deterministic scoring only ([D3](./docs/decisions.md)) | v1 covers structured output + tool calling; coding is deferred ([EVALUATIONS.md](./EVALUATIONS.md)) |
| No invented numbers ([D5](./docs/decisions.md)) | The landing page's illustrative figures must stay labelled |

## 11. Assumptions register

Every claim is classified. Nothing moves to "validated" without an artefact — an
interview transcript, a telemetry query, or a run.

### 11.1 Validated (by evidence in this repo or its cited sources)

- Producing evaluations is commoditized and largely free — [E3, E5](./docs/research.md#2-evidence-register).
- A vendor-owned eval framework can go stale — [E4](./docs/research.md#2-evidence-register).
- Aggregate ranking credibility is publicly contested — [E1](./docs/research.md#2-evidence-register).
- This repository contains a landing page and a `/run` stub, and no product code.
- `modelcheck-cli` does not exist on npm (HTTP 404, 2026-09-18) — [U2](./docs/decisions.md#u2--the-landing-page-advertises-a-cli-package-that-does-not-exist).

### 11.2 Hypothesis (must be tested before it drives scope)

- **H1/H2** — the trigger is recurring and currently unmet ([research §4](./docs/research.md#4-hypotheses-unvalidated--must-not-drive-scope)).
- **H4** — a saved baseline produces unprompted repeat usage. **This is the business.**
- **H5** — deterministic-only coverage is useful to ICP #1. **Highest-risk assumption in v1.**
- **H6** — teams will pay for regression prevention once a baseline exists.
- **H7 — Lane A, the first assumption to test.** An engineer who owns a repository and is adopting a coding model will run a repository trial, and re-run it when the model, harness or version changes. Counter-evidence exists and is recorded ([E18](./docs/research.md#2-evidence-register) — negligible engagement for every existing entrant; [E15](./docs/research.md#2-evidence-register) — small-n pipelines do not produce confident decisions). Validation method: the five-repository concierge test ([research §4, H7](./docs/research.md#4-hypotheses-unvalidated--must-not-drive-scope)).

### 11.3 Unknown

- Willingness to pay at any price point. No pricing was researched or verified.
- Whether the ICP will trust an unproven tool with provider credentials.
- Whether coding coverage is required for the ICP's first yes.
- Whether provider aliases actually drift (**H3**) — never observed.
- Which channel actually reaches this user.

## 12. Open questions

| # | Question | Blocks | Owner |
|---|---|---|---|
| Q1 | Does the ICP want a CLI, or a web form where they paste a key? [D1](./docs/decisions.md) chose CLI for build speed — the ICP may disagree | Stage 1 scope | unassigned |
| Q2 | Is the second run triggered by releases (unpredictable) or migrations (predictable)? This changes the retention design | Stage 2 | unassigned |
| Q3 | Should the default suite include coding (requires sandboxing) before Stage 3? | v2 scope | unassigned |
| Q4 | Does a report need a URL to be shared at all? | Stage 2 | unassigned |
| Q5 | What do competitors charge? Required before any pricing decision | Stage 4 | unassigned |
| Q6 | Does the Lane A ICP (a repository owner adopting a coding model, [trials §1](./docs/trials.md#1-what-a-trial-is)) overlap ICP #1 enough to share one funnel, or do the lanes need separate onboarding? | Lane A onboarding design | unassigned |