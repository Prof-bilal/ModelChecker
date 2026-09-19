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

- [ ] `cli/src/adapters/types.ts` — `ModelAdapter` interface: `send(request: AdapterRequest) => Promise<AdapterResponse>`, `identify(): string`, `resolvedModel(): string`
- [ ] `cli/src/adapters/types.ts` — `AdapterRequest` (messages, tools, params), `AdapterResponse` (content, tool_calls, model, usage, latency_ms, raw)
- [ ] `cli/src/adapters/openai-compatible.ts` — implementation: build `POST /v1/chat/completions`, normalise response, classify errors (401→auth, 429→rate_limit, 5xx→server, timeout→timeout, network→network)
- [ ] `cli/src/adapters/anthropic.ts` — implementation: build `POST /v1/messages`, normalise response, same error classification
- [ ] `cli/src/adapters/mock.ts` — reads from `tests/fixtures/responses/<case_id>.json`; returns recorded response; error scenarios via `<case_id>.<scenario>.json`
- [ ] `cli/src/engine/retry.ts` — classify error as retryable (`rate_limit`, `server`, `network`) or terminal (`auth`, `malformed`, `refusal`); exponential backoff with jitter, cap at 60s; respect `Retry-After`
- [ ] `cli/src/engine/execute.ts` — bounded concurrency pool (default: 3); per-case timeout via `AbortController`; bounded retries (default: 2); record `attempts` per case; persist raw response to `raw/<case_id>.json`
- [ ] `cli/src/engine/execute.test.ts` — unit test: mock adapter returns fixture; timeout triggers `timeout` outcome; retryable error retried to bound; terminal error not retried
- [ ] `cli/src/adapters/openai-compatible.test.ts` — unit test: request shape matches OpenAI spec; 401 classified as `auth`; raw response preserved
- [ ] `cli/tests/fixtures/responses/so-001.json` — recorded OpenAI response for the structured-output fixture case
- [ ] `cli/tests/fixtures/responses/tc-001.json` — recorded OpenAI response for the tool-calling fixture case

### Verification

```bash
cd cli && npm test
modelcheck run --suite core --model gpt-4o --api-key-env OPENAI_API_KEY
# makes real calls, prints progress, writes raw/ directory
```

---

## Phase 3 — Scorers

**Goal:** every case resolves to a defined `Outcome`.

- [ ] `cli/src/scorers/types.ts` — `Scorer` interface: `(raw: AdapterResponse, params: ScoringParams) => ScorerResult`; `ScorerResult` = `{ outcome, score, reason? }`
- [ ] `cli/src/scorers/json-schema.ts` — `json_schema@1`: parse JSON → validate against schema; pass/fail only; refusal text recorded as reason
- [ ] `cli/src/scorers/json-schema.test.ts` — test matrix (TESTING.md §5.1):
  - [ ] valid object → `pass`
  - [ ] unparseable → `fail`
  - [ ] schema violation → `fail` with reason
  - [ ] refusal text → `fail` with reason
  - [ ] empty body → `fail`
  - [ ] JSON in markdown fence → `fail` (policy: not stripped)
  - [ ] array-counting case `so-006` correct, including off-by-one check
- [ ] `cli/src/scorers/tool-call-match.ts` — `tool_call_match@1`: tool called + args valid → `pass`; right tool wrong args → `partial`; wrong declared tool → `partial`; undeclared tool → `fail`; no tool → `fail`
- [ ] `cli/src/scorers/tool-call-match.test.ts` — test matrix (TESTING.md §5.1):
  - [ ] correct tool + valid args → `pass`
  - [ ] correct tool + invalid args → `partial`
  - [ ] wrong declared tool → `partial`
  - [ ] undeclared tool → `fail`
  - [ ] no tool call when none required → correct outcome
  - [ ] scorer purity: same input → same outcome, no clock, no network
- [ ] `cli/src/engine/score.ts` — wire: for each settled case, call the appropriate scorer; catch scorer throws → `scoring_error`

### Verification

```bash
cd cli && npm test
# all scorer tests pass, pure functions, no network
```

---

## Phase 4 — Aggregation + report.json

**Goal:** complete `Report` written to disk, satisfying EVALUATIONS.md §5.

- [ ] `cli/src/engine/aggregate.ts` — compute per-capability: `planned`, `settled`, `scored`, `pass`, `fail`, `partial`, `request_errors`, `scoring_errors`, `timeouts`, `coverage`; compute run-level: `p50_ms`, `p95_ms` (only when n≥20, else `not_available`), `cost_total_usd`
- [ ] `cli/src/engine/aggregate.test.ts` — unit tests (TESTING.md §5.2):
  - [ ] `scored = pass + fail + partial`
  - [ ] `settled = scored + request_errors + scoring_errors + timeouts`
  - [ ] `planned ≥ settled`
  - [ ] coverage = `scored / planned`
  - [ ] absent capability → not rendered as 0
  - [ ] p95 rule: n<20 → `not_available`; n≥20 → numeric
- [ ] `cli/src/report/write-json.ts` — build full `Report` object; write to `~/.modelcheck/runs/<run_id>/report.json`; validate all required fields from EVALUATIONS.md §5 present
- [ ] `cli/src/report/schema.json` — JSON Schema for `report.json` (the reproducibility manifest)
- [ ] `cli/src/report/write-json.test.ts` — golden test: fixture input → output matches `tests/fixtures/reports/golden/report.json`
- [ ] `cli/src/report/limits.ts` — the 7 mandatory limitation strings (EVALUATIONS.md §10)
- [ ] `cli/suites/core/1.0.0/suite.json` — expand to full 30 cases from benchmarks.md (15 structured_output + 15 tool_calling)
- [ ] `cli/src/commands/run.ts` — wire: load → plan → estimate → execute → score → aggregate → write report.json → print summary to stderr

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

- [ ] `cli/src/report/render-html.ts` — read `report.json`, emit a single HTML file; inline all CSS and JS (no external deps); escape all model output as inert text
- [ ] HTML structure:
  - [ ] Run header: model, suite version, timestamp, status
  - [ ] Capability table: name, scored/planned, pass/fail/partial, coverage, per-capability latency
  - [ ] Cost section: estimated total, price table ref
  - [ ] Latency section: p50, p95 or `not_available`, n
  - [ ] Limitations section: all 7 strings
  - [ ] Per-case expandable: case_id, outcome, score, raw_response (escaped text, never HTML), error class if applicable
  - [ ] Untested capabilities rendered as "Not tested", never 0
- [ ] `cli/src/report/render-html.test.ts` — golden test: fixture `report.json` → output matches `tests/fixtures/reports/golden/report.html`; model output containing `<script>` and `<img onerror=...>` renders as escaped text
- [ ] `cli/src/commands/run.ts` — after writing `report.json`, call `render-html` to write `report.html` in the same run directory

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

- [ ] `cli/src/commands/compare.ts` — load two `report.json` files; refuse if different `suite_version` or `suite_content_hash` with a clear message; compute per-capability delta: `+N cases of M (same suite version, same parameters)`; cost delta; latency delta
- [ ] `cli/src/commands/compare.test.ts` — unit tests (TESTING.md §5.4):
  - [ ] refuses across different suite versions → error message
  - [ ] refuses across different content hashes → error message
  - [ ] deltas carry denominators
  - [ ] parameters flagged when different
- [ ] `cli/src/commands/list.ts` — read `~/.modelcheck/index.json`; print table: run_id, label, model, suite version, timestamp, status; if no index, scan `runs/` directory
- [ ] `cli/src/commands/list.test.ts` — unit test: empty index → empty table; populated index → correct table
- [ ] `cli/src/commands/run.ts` — after writing report, append entry to `~/.modelcheck/index.json`

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

- [ ] `cli/src/lib/redact.ts` — shared redaction helper; replaces any known credential value with `[REDACTED]` in any string
- [ ] `cli/src/lib/redact.test.ts` — sentinel credential appears in **no** artefact, log line, or error message after a full mock run
- [ ] `cli/src/lib/errors.ts` — structured error classes: `ProviderError`, `SuiteLoadError`, `ConfigError`, `SpendLimitError`; each carries `error_class`, message follows "object, reason, next step" pattern (design.md §15)
- [ ] `cli/src/lib/errors.test.ts` — 401 → error names provider and status; no credential in output
- [ ] `cli/src/lib/errors.test.ts` — 429 exhaustion → `request_error` with `error_class: rate_limit`
- [ ] `cli/src/lib/errors.test.ts` — mid-run 5xx → affected cases `request_error`, run status `completed_with_gaps`
- [ ] `cli/src/lib/errors.test.ts` — unpriced model → cost is `unpriced`, no fabricated total
- [ ] `cli/src/report/render-html.test.ts` — HTML escapes `<script>` and `<img onerror=...>` in model output
- [ ] `cli/src/adapters/openai-compatible.test.ts` — `base_url` to metadata endpoint `169.254.169.254` is refused
- [ ] `cli/src/adapters/openai-compatible.test.ts` — cross-origin redirect does not receive credentials
- [ ] `cli/package.json` — add `"test": "node --test src/**/*.test.ts"`, `"lint": "tsc --noEmit"`
- [ ] Run `npx tsc --noEmit` in `cli/` — zero errors
- [ ] Run `npm run lint` in `web/` — zero errors
- [ ] Run `npm test` in `cli/` — all pass, zero network calls
- [ ] `README.md` — install, provide key, run, read report, compare; documents that suite prompts go to the provider; documents `RUNS_DIR` is user-controlled; recommends scoped key

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
├── README.md
├── src/
│   ├── index.ts                    # argv parsing + command dispatch
│   ├── types.ts                    # Run, CaseResult, Outcome, Report, Suite types
│   ├── lib/
│   │   ├── args.ts                 # shared argv schema
│   │   ├── errors.ts               # ProviderError, SuiteLoadError, etc.
│   │   └── redact.ts               # credential redaction helper
│   ├── commands/
│   │   ├── run.ts                  # load → plan → execute → score → aggregate → write
│   │   ├── compare.ts              # two runs → per-capability deltas
│   │   └── list.ts                 # local run index
│   ├── engine/
│   │   ├── suite-loader.ts         # load + validate suite from disk
│   │   ├── plan.ts                 # expand cases × repeats
│   │   ├── estimate.ts             # cost estimation + spend guard
│   │   ├── execute.ts              # bounded concurrency, timeout, retry
│   │   ├── retry.ts                # error classification + backoff
│   │   ├── score.ts                # wire scorers to cases
│   │   └── aggregate.ts            # counts, coverage, latency, cost
│   ├── adapters/
│   │   ├── types.ts                # ModelAdapter interface
│   │   ├── openai-compatible.ts    # OpenAI-compatible adapter
│   │   ├── anthropic.ts            # Anthropic adapter
│   │   └── mock.ts                 # fixture-based mock adapter
│   ├── scorers/
│   │   ├── types.ts                # Scorer interface
│   │   ├── json-schema.ts          # json_schema@1
│   │   └── tool-call-match.ts      # tool_call_match@1
│   ├── report/
│   │   ├── write-json.ts           # schema-validated report.json
│   │   ├── render-html.ts          # report.json → static HTML
│   │   ├── schema.json             # report.json schema
│   │   └── limits.ts               # mandatory limitation strings
│   └── config/
│       └── prices.json             # dated price table
├── suites/
│   └── core/
│       └── 1.0.0/
│           └── suite.json          # 30 cases (15 so + 15 tc)
└── tests/
    └── fixtures/
        ├── responses/              # recorded provider responses
        └── reports/
            └── golden/             # golden report.json + report.html
```

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
