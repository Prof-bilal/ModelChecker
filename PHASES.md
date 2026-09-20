# ModelCheck — Build Phases

**Date:** 2026-09-18 · **Budget:** 7 days · **Scope:** [MVP.md](./MVP.md)
**End state:** a working CLI that runs 30 cases against a model, scores them, writes `report.json` + `report.html`, and can compare two runs.

> Every checkbox below maps to a file or a concrete deliverable. Nothing is abstract.
> When the last box is checked, the product exists.

---

## Phase 0 — CLI scaffold

**Goal:** `modelcheck` prints a help message and exits cleanly.

- [x] `cli/package.json` — name `@modelcheck/cli`, `bin.modelcheck` → `dist/index.js`, type `module`, engines `>=20` ([D14](./docs/decisions.md#d14--the-cli-bin-targets-compiled-javascript))
- [x] `cli/tsconfig.json` — `strict: true`, `module: "node16"`, `moduleResolution: "node16"`, `target: "ES2022"`, `outDir: "dist"`, `rootDir: "src"`, `resolveJsonModule: true`
- [x] `cli/src/types.ts` — `Outcome`, `RunStatus`, `ErrorClass`, `CaseResult`, `CapabilityAggregate`, `Report`, `ReportCost`, `ReportLatency`, `Parameters`, `ScoringRule`, `SuiteCase`, `SuiteMeta`, `AdapterConfig`, `RunOptions` (ARCHITECTURE.md §4)
- [x] `cli/src/index.ts` — parse argv with `node:util parseArgs`; dispatch `run`, `compare`, `list`; exit codes 0/1/2 (CODESTYLE.md §2.6)
- [x] `cli/src/commands/run.ts` — stub that prints "run not yet implemented" and exits 0
- [x] `cli/src/commands/compare.ts` — stub that prints "compare not yet implemented" and exits 0
- [x] `cli/src/commands/list.ts` — stub that prints "list not yet implemented" and exits 0
- [x] `cli/src/lib/args.ts` — shared argv schema for `--suite`, `--model`, `--label`, `--repeat`, `--concurrency`, `--timeout`, `--max-retries`, `--spend-limit`, `--json`
- [x] `npm link` works: `modelcheck --help` prints usage, `modelcheck run` prints stub

### Verification

```bash
cd cli && npm install && npm link
modelcheck --help
modelcheck run
# exits 0, prints stub message
```

---

## Phase 1 — Suite loader + plan command

**Goal:** load a suite from disk, validate it, print the case list and cost estimate.

- [x] `cli/src/engine/suite-loader.ts` — read `suites/<id>/<version>/suite.json`; validate shape; compute content hash via `node:crypto` SHA-256 of canonical JSON
- [x] `cli/src/engine/plan.ts` — expand cases × repeats → ordered planned list; return `PlannedRun` (suite meta, case list, estimated request count)
- [x] `cli/src/config/prices.json` — dated price table; keyed by `provider/model`; fields: `input_per_1k`, `output_per_1k`, `currency: "USD"`, `date`, `source`
- [x] `cli/src/engine/estimate.ts` — look up model in price table; estimate total cost from case count × avg token assumptions; print estimate; apply spend guard
- [x] `cli/src/commands/run.ts` — wire load → plan → estimate → print to stdout; no execution yet
- [x] `cli/suites/core/1.0.0/suite.json` — 3-case tiny fixture for testing (not the full 30 yet): 1 structured_output + 2 tool_calling cases, each with `case_id`, `capability`, `version`, `input`, `scoring`, `scoring_params`, `tools` (for tc)
- [x] `cli/src/engine/suite-loader.test.ts` — unit test: valid suite loads, invalid suite throws, content hash is deterministic
- [x] `cli/src/engine/plan.test.ts` — unit test: repeat=1 produces N cases, repeat=3 produces 3N

### Verification

```bash
cd cli && npm test
modelcheck run --suite core --model gpt-4o
# prints: suite loaded, 3 cases planned, estimated cost $X.XX, estimated requests: 3
```

---

## Phase 2 — Adapters + executor

**Goal:** call a real model, handle errors, record raw responses.

- [x] `cli/src/adapters/types.ts` — `ModelAdapter` interface: `send(request: AdapterRequest) => Promise<AdapterResponse>`, `identify(): string`, `resolvedModel(): string`
- [x] `cli/src/adapters/types.ts` — `AdapterRequest` (messages, tools, params), `AdapterResponse` (content, tool_calls, model, usage, latency_ms, raw)
- [x] `cli/src/adapters/openai-compatible.ts` — implementation: build `POST /v1/chat/completions`, normalise response, classify errors (401→auth, 429→rate_limit, 5xx→server, timeout→timeout, network→network)
- [x] `cli/src/adapters/anthropic.ts` — implementation: build `POST /v1/messages`, normalise response, same error classification *(Phase 6 per D17 — one adapter covers the four chat-completions gateways; the Messages API adapter landed in Phase 6 as planned)*
- [x] `cli/src/adapters/mock.ts` — reads from `tests/fixtures/responses/<case_id>.json`; returns recorded response; error scenarios via `<case_id>.<scenario>.json`
- [x] `cli/src/engine/retry.ts` — classify error as retryable (`rate_limit`, `server`, `network`) or terminal (`auth`, `malformed`, `refusal`); exponential backoff with jitter, cap at 60s; respect `Retry-After`
- [x] `cli/src/engine/execute.ts` — bounded concurrency pool (default: 3); per-case timeout via `AbortController`; bounded retries (default: 2); record `attempts` per case; persist raw response to `raw/<case_id>.json`
- [x] `cli/src/engine/execute.test.ts` — unit test: mock adapter returns fixture; timeout triggers `timeout` outcome; retryable error retried to bound; terminal error not retried
- [x] `cli/src/adapters/openai-compatible.test.ts` — unit test: request shape matches OpenAI spec; 401 classified as `auth`; raw response preserved
- [x] `cli/tests/fixtures/responses/so-001.json` — synthetic fixture for the structured-output case (D5: marked synthetic, not a recorded response)
- [x] `cli/tests/fixtures/responses/tc-001.json` — synthetic fixture for the tool-calling case (D5: marked synthetic, not a recorded response)

### Verification

```bash
cd cli && npm test
modelcheck run --suite core --model gpt-4o --api-key-env OPENAI_API_KEY
# makes real calls, prints progress, writes raw/ directory
```

---

## Phase 3 — Scorers

**Goal:** every case resolves to a defined `Outcome`.

- [x] `cli/src/scorers/types.ts` — `Scorer` interface: `(raw: AdapterResponse, params: ScoringParams) => ScorerResult`; `ScorerResult` = `{ outcome, score, reason? }`
- [x] `cli/src/scorers/json-schema.ts` — `json_schema@1`: parse JSON → validate against schema; pass/fail only; refusal text recorded as reason *(hand-rolled validation, no dependency — CODESTYLE §2.7)*
- [x] `cli/src/scorers/json-schema.test.ts` — test matrix (TESTING.md §5.1):
  - [x] valid object → `pass`
  - [x] unparseable → `fail`
  - [x] schema violation → `fail` with reason
  - [x] refusal text → `fail` with reason
  - [x] empty body → `fail`
  - [x] JSON in markdown fence → `fail` (policy: not stripped)
  - [x] array-counting case `so-006` correct, including off-by-one check
- [x] `cli/src/scorers/tool-call-match.ts` — `tool_call_match@1`: tool called + args valid → `pass`; right tool wrong args → `partial`; wrong declared tool → `partial`; undeclared tool → `fail`; no tool → `fail`
- [x] `cli/src/scorers/tool-call-match.test.ts` — test matrix (TESTING.md §5.1):
  - [x] correct tool + valid args → `pass`
  - [x] correct tool + invalid args → `partial`
  - [x] wrong declared tool → `partial`
  - [x] undeclared tool → `fail`
  - [x] no tool call when none required → correct outcome
  - [x] scorer purity: same input → same outcome, no clock, no network
- [x] `cli/src/engine/score.ts` — wire: for each settled case, call the appropriate scorer; catch scorer throws → `scoring_error`

### Verification

```bash
cd cli && npm test
# all scorer tests pass, pure functions, no network
```

---

## Phase 4 — Aggregation + report.json

**Goal:** complete `Report` written to disk, satisfying EVALUATIONS.md §5.

- [x] `cli/src/engine/aggregate.ts` — compute per-capability: `planned`, `settled`, `scored`, `pass`, `fail`, `partial`, `request_errors`, `scoring_errors`, `timeouts`, `coverage`; compute run-level: `p50_ms`, `p95_ms` (only when n≥20, else `not_available`), `cost_total_usd`
- [x] `cli/src/engine/aggregate.test.ts` — unit tests (TESTING.md §5.2):
  - [x] `scored = pass + fail + partial`
  - [x] `settled = scored + request_errors + scoring_errors + timeouts`
  - [x] `planned ≥ settled`
  - [x] coverage = `scored / planned`
  - [x] absent capability → not rendered as 0
  - [x] p95 rule: n<20 → `not_available`; n≥20 → numeric
- [x] `cli/src/report/write-json.ts` — build full `Report` object; write to `~/.modelcheck/runs/<run_id>/report.json`; validate all required fields from EVALUATIONS.md §5 present
- [x] `cli/src/report/schema.json` — JSON Schema for `report.json` (the reproducibility manifest)
- [x] `cli/src/report/write-json.test.ts` — golden test: fixture input → output matches `tests/fixtures/reports/golden/report.json` *(opt-in regeneration via `UPDATE_GOLDEN=1`, justified in review — TESTING.md §7)*
- [x] `cli/src/report/limits.ts` — the 7 mandatory limitation strings (EVALUATIONS.md §10)
- [x] `cli/suites/core/1.0.0/suite.json` — expand to full 30 cases from benchmarks.md (15 structured_output + 15 tool_calling)
- [x] `cli/src/commands/run.ts` — wire: load → plan → estimate → execute → score → aggregate → write report.json → print summary to stderr

### Verification

```bash
cd cli && npm test
# golden test passes
modelcheck run --suite core --model gpt-4o
# writes ~/.modelcheck/runs/<id>/report.json
# JSON contains every field from EVALUATIONS.md §5
```

---

## Phase 5 — report.html

**Goal:** static, self-contained, offline-renderable HTML from `report.json` only.

- [x] `cli/src/report/render-html.ts` — read `report.json`, emit a single HTML file; inline all CSS and JS (no external deps); escape all model output as inert text
- [x] HTML structure:
  - [x] Run header: model, suite version, timestamp, status
  - [x] Capability table: name, scored/planned, pass/fail/partial, coverage, per-capability latency
  - [x] Cost section: estimated total, price table ref
  - [x] Latency section: p50, p95 or `not_available`, n
  - [x] Limitations section: all 7 strings
  - [x] Per-case expandable: case_id, outcome, score, raw_response (escaped text, never HTML), error class if applicable
  - [x] Untested capabilities rendered as "Not tested", never 0
- [x] `cli/src/report/render-html.test.ts` — golden test: fixture `report.json` → output matches `tests/fixtures/reports/golden/report.html`; model output containing `<script>` and `<img onerror=...>` renders as escaped text
- [x] `cli/src/commands/run.ts` — after writing `report.json`, call `render-html` to write `report.html` in the same run directory

### Verification

```bash
cd cli && npm test
# golden HTML test passes
modelcheck run --suite core --model gpt-4o
# writes report.html; open in browser — readable, no network requests
```

---

## Phase 6 — compare + list

**Goal:** compare two runs; list local runs.

- [x] `cli/src/commands/compare.ts` — load two `report.json` files; refuse if different `suite_version` or `suite_content_hash` with a clear message; compute per-capability delta: `+N cases of M (same suite version, same parameters)`; cost delta; latency delta
- [x] `cli/src/commands/compare.test.ts` — unit tests (TESTING.md §5.4):
  - [x] refuses across different suite versions → error message
  - [x] refuses across different content hashes → error message
  - [x] deltas carry denominators
  - [x] parameters flagged when different
- [x] `cli/src/commands/list.ts` — read `~/.modelcheck/index.json`; print table: run_id, label, model, suite version, timestamp, status; if no index, scan `runs/` directory
- [x] `cli/src/commands/list.test.ts` — unit test: empty index → empty table; populated index → correct table
- [x] `cli/src/commands/run.ts` — after writing report, append entry to `~/.modelcheck/index.json`

### Verification

```bash
cd cli && npm test
modelcheck run --suite core --model gpt-4o --label baseline
modelcheck run --suite core --model gpt-4o-mini --label candidate
modelcheck compare <baseline-run-id> <candidate-run-id>
# prints per-capability delta with denominators
modelcheck list
# prints table with both runs
```

---

## Phase 7 — Polish + security + pass

**Goal:** `npm run lint`, `npx tsc --noEmit`, `npm test` all pass. Redaction test exists. Product is shippable.

- [x] `cli/src/lib/redact.ts` — shared redaction helper; replaces any known credential value with `[REDACTED]` in any string
- [x] `cli/src/lib/redact.test.ts` — sentinel credential appears in **no** artefact, log line, or error message after a full mock run
- [x] `cli/src/lib/errors.ts` — structured error classes: `ProviderError`, `SuiteLoadError`, `ConfigError`, `SpendLimitError`; each carries `error_class`, message follows "object, reason, next step" pattern (design.md §15)
- [x] `cli/src/lib/errors.test.ts` — 401 → error names provider and status; no credential in output
- [x] `cli/src/lib/errors.test.ts` — 429 exhaustion → `request_error` with `error_class: rate_limit`
- [x] `cli/src/lib/errors.test.ts` — mid-run 5xx → affected cases `request_error`, run status `completed_with_gaps`
- [x] `cli/src/lib/errors.test.ts` — unpriced model → cost is `unpriced`, no fabricated total
- [x] `cli/src/report/render-html.test.ts` — HTML escapes `<script>` and `<img onerror=...>` in model output
- [x] `cli/src/adapters/openai-compatible.test.ts` — `base_url` to metadata endpoint `169.254.169.254` is refused
- [x] `cli/src/adapters/openai-compatible.test.ts` — cross-origin redirect does not receive credentials
- [x] `cli/package.json` — add test and lint scripts
- [x] Run `npx tsc --noEmit` in `cli/` — zero errors
- [x] Run `npm run lint` in `web/` — zero errors
- [x] Run `npm test` in `cli/` — all pass, zero network calls
- [x] `cli/README.md` — install, provide key, run, read report, compare; documents that suite prompts go to the provider; documents `RUNS_DIR` is user-controlled; recommends scoped key

### Verification

```bash
cd cli && npm test && npm run lint && npx tsc --noEmit
# all green, no credentials in output
modelcheck run --suite core --model gpt-4o
# full end-to-end: installs, runs, produces report.html in <10 minutes from cold
```

---

## File manifest — complete at end of Phase 7

```text
cli/
├── package.json
├── tsconfig.json
├── README.md                       # install, key, run, read, compare, data handling
├── src/
│   ├── index.ts                    # argv parsing + command dispatch
│   ├── types.ts                    # Run, CaseResult, Outcome, Report, Suite types
│   ├── lib/
│   │   ├── args.ts                 # shared argv schema
│   │   ├── args.test.ts            # CLI argument parsing tests
│   │   ├── errors.ts               # ProviderError, SuiteLoadError, etc.
│   │   ├── errors.test.ts          # 401 / 429 / 5xx / unpriced error-path tests
│   │   ├── redact.ts               # credential redaction helper
│   │   └── redact.test.ts          # credential redaction tests
│   ├── commands/
│   │   ├── run.ts                  # load → plan → execute → score → aggregate → write
│   │   ├── run.priced.test.ts      # E2E priced path test
│   │   ├── run.unpriced.test.ts    # E2E unpriced path test
│   │   ├── run.adapter.test.ts     # adapter selection + --adapter validation tests
│   │   ├── compare.ts              # two runs → per-capability deltas
│   │   ├── compare.test.ts         # compare command tests
│   │   ├── list.ts                 # local run index
│   │   └── list.test.ts            # list command tests
│   ├── engine/
│   │   ├── suite-loader.ts         # load + validate suite from disk
│   │   ├── suite-loader.test.ts    # suite loader tests
│   │   ├── plan.ts                 # expand cases × repeats
│   │   ├── plan.test.ts            # planner tests
│   │   ├── estimate.ts             # cost estimation + spend guard
│   │   ├── estimate.test.ts        # pricing tests
│   │   ├── execute.ts              # bounded concurrency, timeout, retry
│   │   ├── execute.test.ts         # executor tests (mock adapter)
│   │   ├── retry.ts                # error classification + backoff
│   │   ├── score.ts                # wire scorers to cases
│   │   └── aggregate.ts            # counts, coverage, latency, cost
│   │   └── aggregate.test.ts       # aggregation tests
│   ├── adapters/
│   │   ├── types.ts                # ModelAdapter interface
│   │   ├── provider-http.ts        # shared base-URL safety, status → error class
│   │   ├── openai-compatible.ts    # OpenAI-compatible adapter
│   │   ├── openai-compatible.test.ts # adapter tests
│   │   ├── anthropic.ts            # Anthropic Messages API adapter
│   │   ├── anthropic.test.ts       # Messages API adapter tests
│   │   └── mock.ts                 # fixture-based mock adapter
│   ├── scorers/
│   │   ├── types.ts                # Scorer interface
│   │   ├── json-schema.ts          # json_schema@1
│   │   ├── json-schema.test.ts     # json_schema scorer tests
│   │   ├── tool-call-match.ts      # tool_call_match@1
│   │   └── tool-call-match.test.ts # tool_call_match scorer tests
│   ├── report/
│   │   ├── write-json.ts           # schema-validated report.json
│   │   ├── write-json.test.ts      # golden test for report.json
│   │   ├── render-html.ts          # report.json → static HTML
│   │   ├── render-html.test.ts     # golden test + XSS escaping tests
│   │   ├── schema.json             # report.json schema
│   │   ├── limits.ts               # mandatory limitation strings
│   │   └── fixture-report.ts       # test fixture for golden tests
│   └── config/
│       └── prices.json             # dated price table
├── suites/
│   └── core/
│       └── 1.0.0/
│           └── suite.json          # 30 cases (15 so + 15 tc)
└── tests/
    └── fixtures/
        ├── responses/              # recorded provider responses (36 files)
        └── reports/
            └── golden/             # golden report.json + report.html
```

### Missing from file manifest

None — every file above exists as of Phase 7 completion. The manifest is the
checklist; the executable check is `npm test`, `npx tsc --noEmit`, and
`npm run lint` (§7 verification).

## Exit criteria

The product is shippable when **all** of these are true:

1. `npm test` passes in `cli/` with zero network calls
2. `npx tsc --noEmit` passes in `cli/`
3. `npm run lint` passes in `web/`
4. `modelcheck run --suite core --model gpt-4o` produces `report.json` + `report.html` in <10 minutes
5. `report.json` contains every field from EVALUATIONS.md §5
6. `modelcheck compare <A> <B>` prints per-capability deltas with denominators
7. `modelcheck list` shows all local runs
8. No credential appears in any artefact or error message
9. HTML escapes all model output
10. Untested capabilities render "Not tested", never 0
