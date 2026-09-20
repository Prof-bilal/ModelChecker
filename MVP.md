# ModelCheck — MVP Specification

**Version:** 0.3 · **Date:** 2026-09-20 · **Status:** binding scope contract
**This file owns:** what is being built *now*. If a feature is not in §4, it is not in the MVP, regardless of how it appears in [PRD.md](./PRD.md) or [ROADMAP.md](./ROADMAP.md).
**Precedence:** [AGENTS.md](./AGENTS.md) §4 defines the source-of-truth order. For *scope*, this file wins.

> **Scope note (2026-09-20).** This document now governs **Lane B — capability suites** only (shipped). **Lane A — repository trials** is the active build line and is governed by [docs/trials.md](./docs/trials.md) and [docs/web-app.md](./docs/web-app.md); the lane split itself is decision [D21](./docs/decisions.md#d21--two-lanes-repository-trials-active-and-capability-suites-shipped). Lane A has its own acceptance criteria ([trials §12](./docs/trials.md#12-acceptance-criteria-for-the-trial-mvp)) and does not amend the Lane B contract below. K3's pre-committed response to "coding is required" is hereby **executed** — as the Lane A split — not renegotiated.

---

## 1. MVP goal

Answer one question:

> **Will an engineer who owns an LLM feature run ModelCheck again, unprompted,
> the next time a model changes?**

Nothing else. The MVP is a **minimum viable experiment**, not a minimum viable
platform.

### 1.1 Build budget — 3 to 7 developer-days

The scope in §4 is sized to this budget. If work spills past it, **cut features — do
not extend the schedule.**

| Day | Work | Deliverable at end of day |
|---|---|---|
| 1 | Suite loader, validation, case/suite types, a 3-case fixture suite | `plan` prints the planned case list and a cost estimate |
| 2 | OpenAI-compatible adapter, mock adapter, bounded executor with timeout and retry classification | One real model can be called for a single case, and a mock run works offline |
| 3 | The two scorers (`json_schema@1`, `tool_call_match@1`) plus their unit tests | Every case resolves to a defined `Outcome` |
| 4 | Aggregation with the denominator invariants; `report.json` + report schema + golden test | A complete, machine-readable run record |
| 5 | `report.html` rendered from `report.json` only | A readable artefact with the raw cases attached |
| 6 | `compare`, `list`, the README, and the Anthropic adapter | The full workflow end to end |
| 7 | Buffer: failure paths, redaction test, polish, the 10-minute walkthrough | §7 acceptance criteria demonstrated |

**Reality check, stated honestly:** 30 cases of content plus two adapters is not
"one afternoon". If days 1–3 overrun, the correct cuts are, in order:
drop to one adapter; drop `list`; reduce the suite to 20 cases. The one thing that
may **not** be cut is the provenance in `report.json`, because without it the
artefact has no reason to exist.

## 2. Core hypothesis

| | |
|---|---|
| **Hypothesis** | If a developer can get a trustworthy, evidence-linked comparison of a candidate model against their current model for a capability they ship — without authoring an evaluation — they will repeat it whenever a model changes. |
| **Falsified by** | Users run it once and never return; or cannot complete a run; or the result does not cover a capability they recognise. |
| **Evidence status** | Untested. [H1, H2, H4, H5](./docs/research.md#4-hypotheses-unvalidated--must-not-drive-scope) are all open. |
| **Why this hypothesis** | [research I4](./docs/research.md#3-interpretation-of-the-evidence): free, adopted tools own the "curiosity" moment; retention exists only if a durable baseline does. |

## 3. ICP and trigger

Exactly one ICP: [PRD §2.1](./PRD.md#21-icp-1-definition). Exactly one trigger: a
model the user depends on changes, or a candidate appears
([PRD §3](./PRD.md#3-trigger), T1/T2). No personas, no segments, no "developers"
as a category.

## 4. MUST HAVE

Every item below is required to test the hypothesis. Nothing else is.

### 4.1 Commands

| Command | Behaviour |
|---|---|
| `modelcheck run --suite core --model <id>` | Executes the pinned default suite against one model; writes a run directory |
| `modelcheck compare <runA> <runB>` | Prints and renders a per-capability delta between two runs of the same suite version |
| `modelcheck list` | Lists local runs with model, suite version, timestamp and status |

Flags beyond these are added only when a user blocks on their absence.

### 4.2 Capabilities and scoring (deterministic only — [D3](./docs/decisions.md))

| Capability | Scoring mechanism | Cases | Why |
|---|---|---|---|
| **Structured output** | Parse + JSON Schema validation; pass = parses and validates | ~15 | Deterministic; universal to extraction/classification features |
| **Tool calling** | Valid tool selected **and** arguments validate against that tool's schema; a partial outcome is recorded when the tool is right and the arguments are wrong | ~15 | Deterministic; the dominant shape of agentic features |

Case content and IDs are specified in [docs/benchmarks.md](./docs/benchmarks.md).
Every case is versioned; the suite has an id, a version and a content hash.

### 4.3 Provider adapters

| Adapter | Covers |
|---|---|
| OpenAI-compatible (`base_url` + `api_key_env`) | OpenAI, and any compatible endpoint including local servers |
| Anthropic | Anthropic Messages API |

Two adapters, no more. A third requires a user blocked on its absence.

### 4.4 Execution behaviour

- Bounded concurrency (conservative default), per-request timeout, and bounded
  retries with backoff on retryable status codes only.
- Cost estimated from a **pinned, dated price table** committed to the repository,
  printed **before** the first request, with a stop-if-estimated-spend-exceeds-X guard.
- Request errors, scoring errors and model failures recorded as **distinct outcomes**
  ([PRD R9](./PRD.md#71-functional); `../design.md` §19).
- Raw provider responses persisted verbatim in the run directory.

### 4.5 Artefacts

- `report.json` — the complete run record, satisfying every field required in
  [EVALUATIONS.md §5](./EVALUATIONS.md#5-the-reproducibility-manifest).
- `report.html` — a static, self-contained, offline-renderable report reusing the
  design tokens in [CODESTYLE.md](./CODESTYLE.md) and the visual language already
  implemented in `components/ExampleReport.tsx`.
- Untested capabilities render as **not tested** ([D4](./docs/decisions.md)).

### 4.6 The "10 minute test"

The whole point of the MVP is this budget. From a cold machine:

| Step | Budget | Notes |
|---|---|---|
| Install | ≤ 1 min | One command; no config file required to run |
| Provide key | ≤ 1 min | Environment variable; never a CLI argument |
| Review estimated cost and case list | ≤ 1 min | Printed before any request |
| First run completes | ≤ 5 min | ~30 cases at default concurrency ([PRD N1](./PRD.md#72-non-functional)) |
| Read the report | ≤ 2 min | Capability table + raw cases, no navigation required |

**If a step exceeds its budget, cut features until it fits.** The MVP may not ship
a step that breaks this table.

## 5. SHOULD HAVE

Useful, not required to test the hypothesis. Build only once MUST is complete and
the §4.6 budget holds.

- `--label` on runs, so a user can name a baseline/candidate pair.
- `--repeat N` for flakiness detection on deterministic cases.
- A per-case diff view inside `compare`.
- `--json` stdout for scripting.
- Resume after interruption (becomes MUST once a real run has failed mid-way).

## 6. Explicitly excluded from the MVP

Each line is a deliberate cut with its reason. Do not reintroduce one without
editing this section.

| Excluded | Reason |
|---|---|
| Any hosted service, server, API route or database | [D1](./docs/decisions.md): no server means no secrets storage, no auth, no billing |
| Accounts, login, teams, workspaces, SSO | No user exists yet |
| Billing, plans, quotas, metering | Pricing research has not been done ([PRD Q5](./PRD.md#12-open-questions)) |
| Share links, public report pages, embeds | Stage 2; requires a server |
| GitHub Action, CI thresholds, badges | Stage 5; a baseline must exist first |
| Custom / user-authored suites | Stage 3; authoring is the expert task we route around |
| LLM-as-a-judge scoring | [D3](./docs/decisions.md): cost, latency, contested reliability |
| Coding capability | Needs a sandbox and an execution harness — a security project of its own ([SECURITY.md](./SECURITY.md)) |
| Reasoning / long-context / vision capabilities | Not deterministically scoreable at acceptable effort in 3–7 days |
| Dashboards, charts, history UI, alerts | [PRODUCT §7](./PRODUCT.md#7-what-modelcheck-must-not-become) |
| Model routing, fallbacks, gateways | Different product |
| Ollama / local-model special-casing | Works incidentally through the OpenAI-compatible adapter; no dedicated code |
| Prompt management, dataset CRUD, trace ingestion | Different products ([E6](./docs/research.md#2-evidence-register)) |
| Multi-user permissions, redaction tooling | No server, no sharing |
| Mobile app, browser extension, editor extension | No validated need |
| Telemetry / analytics | Add only once the validation experiment defines what to measure |
| i18n, theming beyond the existing tokens | Not a validated need |

## 7. Acceptance criteria

The MVP is done when **all** of the following are true, demonstrated in a recorded
walkthrough:

1. On a clean machine, a developer who has never seen the tool reaches a written
   `report.html` in under 10 minutes using only a README.
2. `report.json` contains every field required by
   [EVALUATIONS.md §5](./EVALUATIONS.md#5-the-reproducibility-manifest), and every
   number in the HTML report is recomputable from that JSON alone.
3. Two runs of the same suite against the same model may differ per case, but their
   structure, denominators and provenance are identical.
4. `compare` produces a per-capability delta, a cost delta and a latency delta, and
   states the denominator behind each.
5. A capability in the suite that is not exercised renders **not tested**, not 0.
6. An invalid API key produces one actionable error naming the provider and the HTTP
   status, with no credential in the output, and no partial run presented as complete.
7. A mid-run provider failure yields a run marked incomplete, with affected cases
   marked as request errors — never silently retried into a different outcome.
8. `npm run lint` and `npx tsc --noEmit` pass in the repository.
9. No test in the default test command makes a real provider call ([TESTING.md](./TESTING.md)).

## 8. Kill criteria

Explicit, pre-committed, checked at the end of the validation experiment. If a
criterion fires, the stated response is not renegotiated later.

| # | Criterion | Response if true |
|---|---|---|
| K1 | Fewer than 40% of users who completed a first run complete a second within 30 days | **Kill the Layer-3 vision.** The baseline does not retain. Keep at most a free utility. |
| K2 | Fewer than 60% of 20 observed first-time users finish a run unaided | **Cut scope further** — the product is too heavy. The failure is ours, not the market's. |
| K3 | ≥ 70% of interviewed ICP engineers say the two deterministic capabilities do not describe their workload, and name coding as required | **Re-scope to coding-first** and accept a sandbox project, or stop. |
| K4 | ≥ 5 of 20 interviewees already get an acceptable answer from promptfoo/Langfuse in under 15 minutes | **Kill the differentiation.** We would be a worse version of a free tool. |
| K5 | No interviewed user can describe a model-change decision from the last 6 months | **Kill the trigger.** The problem is not frequent enough for a business. |
| K6 | Users refuse to put a provider key into a locally-run tool | **Kill the channel**, not the concept — pivot to a hosted form with explicit key handling ([ROADMAP Stage 2](./ROADMAP.md)). |
| K7 | Willingness to pay is zero across all interviewees, with a credible free alternative | **Kill the business model**, keep the OSS tool. |

**K1 and K4 are the two that must be measured, not argued.**