# ModelCheck — Architecture

**Version:** 0.2 · **Date:** 2026-09-18
**This file owns:** components, responsibilities, data flow, failure handling and security boundaries.
**Scope:** [MVP.md](./MVP.md). Methodology: [EVALUATIONS.md](./EVALUATIONS.md). Threats: [SECURITY.md](./SECURITY.md).

> **Rule:** the MVP is a modular monolith — one Node/TypeScript package with clear
> internal boundaries. No services, no queue, no database, no orchestration layer,
> until a validated need exists.

---

## 1. Current state of the system (as of 2026-09-18)

Honest inventory. This is all that exists.

| Component | Status | Notes |
|---|---|---|
| Next.js 16.3.5 App Router app in `web/` | **Exists** | React 19.2.8, Tailwind v4, TypeScript strict, `@/*` → `./*` path alias |
| Landing page (`app/page.tsx` + 12 components) | **Exists** | Implements `../design.md` §8; illustrative figures labelled |
| `/run` route | **Exists, stub** | Renders a placeholder; no form, no logic |
| API routes, server actions, route handlers | **Do not exist** | `app/` has no `api/` directory |
| Database, ORM, migrations | **Do not exist** | No persistence of any kind |
| Model adapters | **Do not exist** | No provider SDK in `package.json` |
| Evaluation engine, suites, scorers | **Do not exist** | No `lib/`, no `cli/` |
| Auth, accounts, sessions | **Do not exist** | None |
| Tests | **Do not exist** | No test runner configured; `package.json` has no `test` script |
| CI | **Do not exist** | No `.github/` |
| CLI / published package | **Do not exist** | `modelcheck-cli` returns 404 on npm ([U2](./docs/decisions.md#u2--the-landing-page-advertises-a-cli-package-that-does-not-exist)) |

**Consequence:** any document describing hosted execution, a database schema, or a
job queue is describing something that does not exist and is not scheduled. Those
belong in §10 (future), not §2.

## 2. Target MVP architecture

One new package, inside the existing repository, reusing the existing toolchain.

**Packaging decision:** `cli/` carries **its own `package.json` and its own `bin`
entry**, so the CLI's dependency graph never includes Next.js, React or Tailwind.
Sharing one manifest would drag a web framework into a command-line tool, and would
make the CLI's install footprint a function of the marketing site. The two packages
share only the repository and the documentation, and are deliberately not a
workspace yet — a monorepo layout is premature for two packages ([D6](./docs/decisions.md)).

```text
web/
├── app/                     # EXISTS — Next.js landing page (marketing only in MVP)
├── components/              # EXISTS — landing-page components; report visual language reference
├── cli/                     # TO BUILD — the entire MVP
│   ├── src/
│   │   ├── index.ts              # argv parsing + command dispatch
│   │   ├── commands/
│   │   │   ├── run.ts            # plan → estimate → execute → report
│   │   │   ├── compare.ts        # two runs → deltas
│   │   │   └── list.ts           # local run index
│   │   ├── engine/
│   │   │   ├── plan.ts           # suite + options → planned case list
│   │   │   ├── execute.ts        # bounded concurrency, timeout, retry
│   │   │   ├── retry.ts          # retryable-vs-final error classification
│   │   │   └── aggregate.ts      # outcome counts, coverage, latency, cost
│   │   ├── adapters/
│   │   │   ├── types.ts          # ModelAdapter interface (the only provider boundary)
│   │   │   ├── openai-compatible.ts
│   │   │   └── anthropic.ts
│   │   ├── scorers/
│   │   │   ├── types.ts          # Scorer interface: (response, params) => Outcome
│   │   │   ├── json-schema.ts    # json_schema@1
│   │   │   └── tool-call-match.ts# tool_call_match@1
│   │   ├── report/
│   │   │   ├── write-json.ts     # schema-validated report.json
│   │   │   ├── render-html.ts    # report.json → static self-contained HTML
│   │   │   └── limits.ts         # the mandatory §10 limitation strings
│   │   ├── config/
│   │   │   └── prices.json       # dated price table; unpriced models stay unpriced
│   │   └── types.ts              # Run, CaseResult, Outcome, Report
│   ├── suites/core/1.0.0/        # the 30 cases from docs/benchmarks.md, as JSON
│   └── tests/                    # fixtures + unit tests; no real provider calls
├── docs/                    # research.md, decisions.md, benchmarks.md
└── *.md                     # this file and its siblings
```

**Zero new runtime services.** The CLI is a Node process. Its only external calls
are to the model provider.

### 2.1 Why a CLI and not a server (MVP)

Recorded in [D1](./docs/decisions.md). Architecturally this means: no request
authentication, no credential storage, no job scheduling, no tenancy, no quota
enforcement, no payment integration, no DDoS surface, and no data-retention
policy to write. Every one of those is a Stage 2+ problem that must be *earned*
by usage.

## 3. Components and responsibilities

| Component | Owns | Explicitly does **not** own |
|---|---|---|
| `index.ts` | Argument parsing, command routing, exit codes, top-level error formatting | Business logic |
| `commands/run.ts` | Orchestrating the lifecycle: load → estimate → confirm → execute → score → aggregate → write | Provider specifics, scoring rules |
| `commands/compare.ts` | Validating comparability (same suite version), computing deltas, rendering the comparison | Re-running models |
| `engine/*` | Case planning, scheduling, concurrency, timeouts, retry classification, aggregation | Talking to providers directly |
| `adapters/*` | Provider-specific request construction, response normalisation, error classification, resolved-model identification | Scoring, retry policy, report shape |
| `scorers/*` | Pure functions from a raw response to an outcome | Network access, clock access, model calls |
| `report/*` | Serialising the run record and rendering it; injecting the mandatory limitations | Deciding what happened |
| `config/prices.json` | A dated, reviewable price snapshot | Being authoritative. It is labelled as a snapshot |

## 4. Data model

Four types carry the domain. They are defined once and used everywhere, so
`report.json` is a direct serialisation rather than a translation.

```text
Outcome      = pass | fail | partial | request_error | scoring_error | skipped | timeout | not_run
RunStatus    = completed | completed_with_gaps | failed | aborted

CaseResult {
  case_id, capability, outcome, score | null, scoring_rule,
  raw_response, error_class?, reason?,
  input_tokens?, output_tokens?, latency_ms, attempts, estimated_cost_usd? | "unpriced"
}

CapabilityAggregate {
  capability, planned, settled, scored, pass, fail, partial,
  request_errors, scoring_errors, timeouts,
  coverage, interval? | "not_available"
}

Report {
  schema_version, modelcheck_version, run_id, run_label?, status,
  started_at_utc, finished_at_utc,
  provider, endpoint_base_url, requested_model, resolved_model,
  suite_id, suite_version, suite_content_hash, planned_count, repeats_per_case,
  parameters { temperature | "provider_default", max_output_tokens | "provider_default",
               seed | "unsupported", streaming, timeout_ms, max_retries, concurrency },
  cases: CaseResult[],
  capabilities: CapabilityAggregate[],
  cost { total_usd | "unpriced", basis: estimated | unpriced, price_table_ref },
  latency { p50_ms, p95_ms | "not_available", n },
  limitations: string[]
}
```

**Invariants.**

- `Report` is the only artefact the renderer reads. The renderer makes no network
  calls and reads no system clock ([EVALUATIONS.md §5](./EVALUATIONS.md#5-the-reproducibility-manifest)).
- `scored = pass + fail + partial`; `settled = scored + request_errors + scoring_errors + timeouts`.
  `planned ≥ settled`. These relationships are asserted in tests.
- A capability absent from `capabilities` is **not tested**, not zero
  ([D4](./docs/decisions.md)).
- `compare` refuses two reports with different `suite_version` or
  `suite_content_hash`, and states why.

## 5. Execution model

### 5.1 Lifecycle

```text
load suite@1.0.0        → validate: unique ids, scoring rule present, params valid
plan                    → expand cases × repeats → ordered planned list
estimate                → count requests; look up prices → print; apply spend threshold
execute                 → bounded pool, per-case timeout, bounded retries
score                   → pure function per case; failures become scoring_error
aggregate               → counts, coverage, latency percentiles, cost
write                   → run directory: report.json, report.html, raw responses, run.log
```

### 5.2 Concurrency, timeouts, retries

| Concern | MVP behaviour |
|---|---|
| **Concurrency** | A single bounded pool. Conservative default (single digits). Configurable, and the effective value is recorded in the report |
| **Timeout** | Per request, end-to-end. A timeout is a terminal `timeout` outcome for that case, **not** an automatic retry loop |
| **Retries** | Bounded. Only on retryable classes: `rate_limit`, `server` (5xx), `network`. **Never** on `auth`, `malformed` content, or a scoring failure |
| **Backoff** | Exponential with jitter, capped; respects `Retry-After` when present |
| **Idempotency** | Each case × repeat is a distinct scheduled unit. A retry is recorded as `attempts > 1` and never silently replaces the original outcome |
| **Ordering** | Deterministic scheduling order so two runs of the same suite issue requests in the same sequence |
| **Spend guard** | Checked before scheduling each unit against the running estimate; on breach the run stops and is marked appropriately |

### 5.3 Failure semantics

A failure must be *visible*, never *absorbed*.

| Situation | Result |
|---|---|
| Invalid credential | Single actionable error naming provider and HTTP status. No run directory. Credential never printed ([SECURITY.md](./SECURITY.md)) |
| Invalid model id | Adapter error naming the requested string and the provider's message |
| Rate limit | Retried within bounds; if exhausted, `request_error` with `error_class: rate_limit` |
| Provider outage mid-run | Affected cases `request_error`; run status `completed_with_gaps`; coverage reflects it |
| Scorer throws | `scoring_error`, distinct from a model failure. Never folded into `fail` |
| Process killed | Run directory contains what completed; the run is left `incomplete` — resumption is a SHOULD ([MVP §5](./MVP.md#5-should-have)) |
| Unpriced model | Cost is `unpriced`; no total is shown; the run still proceeds |

## 6. Persistence

**MVP: the filesystem.** No database.

```text
~/.modelcheck/
├── runs/
│   └── <run_id>/
│       ├── report.json          # canonical artefact
│       ├── report.html          # rendered from report.json only
│       ├── raw/                 # verbatim provider responses, one file per case
│       └── run.log              # execution trace; no credentials
└── index.json                   # id, label, model, suite, timestamp, status, path
```

- `RUNS_DIR` is overridable by environment variable so CI can point it at a
  workspace path.
- The index is a convenience for `list` and `compare`; it is rebuildable by
  scanning `runs/`. It is never the source of truth.
- Nothing is uploaded anywhere. There is no network call other than to the model
  provider ([SECURITY.md](./SECURITY.md)).
- `raw/` may contain sensitive prompts and outputs. It is *not* redacted, because
  redacting a raw response would break the provenance promise — the mitigation is
  that it never leaves the machine, and the README says so plainly.

## 7. Security boundaries

Details and the threat model are in [SECURITY.md](./SECURITY.md). The
architectural consequences:

| Boundary | MVP position |
|---|---|
| **Credential → process** | Read from an environment variable only. Never an argv value (argv is visible in process listings and shell history). Never written to disk |
| **Credential → network** | Sent only to the configured provider endpoint, in an `Authorization`/`x-api-key` header |
| **Credential → artefacts** | Never. `report.json`, `report.html`, `raw/`, `run.log` and error messages are all credential-free by construction and checked by a redaction test |
| **Untrusted input** | Only two sources: the suite files (reviewed, in-repo) and the model's own output (parsed and validated, never executed) |
| **Untrusted output** | Model output is rendered as **inert text** in the HTML report. No HTML injection, no remote images, no script execution, no auto-linking. Generated content is escaped |
| **Outbound network** | Exactly one destination class: the configured provider base URL. A user-supplied `base_url` is intentional (SSRF considerations in [SECURITY.md](./SECURITY.md)), so the client must still refuse to follow redirects into unexpected hosts and must never attach credentials to a redirect target on a different origin |
| **Inbound** | There is no inbound surface. No server, no port, no listener |
| **Filesystem** | Writes only under `RUNS_DIR`. Never modifies user files, the suite files, or the working directory |

## 8. Extensibility strategy

The MVP has exactly two axes of extension, and both are designed to be data-driven
rather than code-driven.

| Axis | Mechanism | Cost to add |
|---|---|---|
| **A new provider** | Implement `ModelAdapter` (build request, normalise response, classify errors, report resolved model). Nothing else changes | One file + fixtures |
| **A new capability with a deterministic rule** | Add a `Scorer` (pure function) and cases that reference it | One file + suite entries |
| **A new capability needing a model judge** | A *new rule family* per [EVALUATIONS.md §11](./EVALUATIONS.md#11-model-judged-scoring-designed-not-built) — not a scorer. Deliberately more expensive | Design + rubric + labels |
| **A user-supplied suite** | Load a suite directory from a path instead of the bundled one | Stage 3 — the loader already takes a directory |

**Non-extensibility by design:** there is no plug-in system, no dynamic code
loading, no user-supplied JavaScript, and no evaluator authored by the user in v1.
A plug-in API is a security surface and a supported-API commitment; neither is
justified by current evidence.

## 9. Future architecture (designed, not built)

Sketch only. Each entry is gated on a validated need, and none may be started
before its stage in [ROADMAP.md](./ROADMAP.md).

| Stage | Capability | Architectural change |
|---|---|---|
| 2 | Hosted share links | Static report upload to object storage; a read-only route in the existing Next.js app; pre-signed immutable snapshots; explicit redaction preview before upload |
| 2 | Coding capability | A sandboxed execution service (container per run, no network, CPU/memory/time limits) — a security project, not a feature |
| 3 | Custom suites | Suite authoring via a documented file format; validate-and-preview flow; no hosted code execution |
| 3 | Judge-based scoring | A judge adapter behind the separate rule family; judge version + rubric version recorded per case |
| 4 | Accounts, teams, billing | Auth provider, Postgres, tenancy, quotas. **This is the point at which the product stops being a CLI** |
| 5 | CI/CD | A GitHub Action wrapping the CLI; threshold policy in the repo; PR comment from stored JSON; badge from the same JSON |
| 6 | Continuous monitoring | Scheduled runs, drift detection against a stored baseline, alerting. This is where a database and a scheduler finally earn their place |

**Anti-pattern recorded here so it is not built by accident:** none of the stages
above requires a microservice split, a message queue, a Kubernetes deployment, an
event bus, or a custom vector store. If a proposed design needs one of those,
the design is wrong for this product.

## 10. What the architecture deliberately is not

- Not a platform. Not a framework. Not an API product.
- Not microservices, and not a "worker fleet" — a bounded promise pool in one
  process is the correct level of sophistication for 30 cases.
- Not event-driven. Not a queue. There is exactly one job class and it runs for
  five minutes.
- Not multi-tenant, because there is no tenancy.
- Not a data platform. The output is a file.

Each of these is a real engineering temptation, and each would be premature at
this stage (brief Rule 15).