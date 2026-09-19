# ModelCheck — Testing Strategy

**Version:** 0.2 · **Date:** 2026-09-18
**This file owns:** how correctness is established, and what may never run in an automated test.
**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md), [EVALUATIONS.md](./EVALUATIONS.md), [MVP §7](./MVP.md#7-acceptance-criteria).

> ## The one rule that matters most
>
> **No automated test may make a real, billable provider call.**
>
> Tests must not require a provider account, must not cost money, and must not
> depend on a third party's uptime or output. Every provider interaction in the
> test suite goes through a recorded fixture.

---

## 1. Current state (2026-09-18)

| Item | Status |
|---|---|
| Test framework | **None configured.** `package.json` has no `test` script and no test dependency |
| Test files | **None** |
| CI | **None.** No `.github/` directory |
| Coverage tooling | **None** |

The existing `web/` app is a static landing page; `npm run lint` and
`npx tsc --noEmit` are the only automated checks that exist today. Everything else
in this document describes the target state for the CLI, gated on the CLI existing.

## 2. Framework choice

**Use the Node.js built-in test runner (`node:test`) with `node:assert`.**

| Reason | Detail |
|---|---|
| No new dependency | Consistent with the brief's "do not install unnecessary dependencies" |
| Sufficient | The domain is pure functions plus process I/O — no DOM, no browser, no component rendering needed in the CLI |
| Native execution | Runs TypeScript directly on the Node versions the project already targets; no transform layer |
| Output | TAP-compatible, so any future CI can consume it |

If a real limitation appears, adding a framework is a decision recorded in
[docs/decisions.md](./docs/decisions.md) — never a default.

## 3. Test layers

| Layer | What it covers | Provider calls | Speed |
|---|---|---|---|
| **Unit — scorers** | `json_schema@1`, `tool_call_match@1` across pass/fail/partial/error | Never | Instant |
| **Unit — aggregation** | Counts, coverage, denominators, percentile selection, cost maths | Never | Instant |
| **Unit — adapters** | Request construction and response normalisation from recorded payloads | Never (fixtures) | Instant |
| **Unit — retry classification** | Which errors retry, which are terminal, backoff bounds | Never | Instant |
| **Unit — redaction** | No credential value survives into any artefact or message | Never | Instant |
| **Integration — full run** | Fixture provider → execute → score → aggregate → `report.json` → `report.html` | Never (mock adapter) | Fast |
| **Integration — compare** | Delta maths, denominator statements, refusal across suite versions | Never | Fast |
| **Integration — failure paths** | Mid-run 429 / 5xx / timeout / kill → outcomes and status | Never (scripted mock) | Fast |
| **Golden — report rendering** | `report.json` fixture → HTML compared against an approved golden file | Never | Fast |
| **Contract — live smoke** | One real call per adapter, to prove the adapter still matches reality | **Yes — opt-in only** | Slow, costs money |

### 3.1 The live smoke test

The only place a real call is permitted. Constraints are mandatory:

- Never part of the default test command.
- Requires both an explicit flag (e.g. `--live`) **and** a credential env var.
  Absent either, it **skips** with a visible reason — it does not fail.
- Uses a single trivial case, never the suite.
- Prints the estimated cost before running.
- Never runs in CI.
- Its purpose is narrow: *has the provider's wire format changed?* It is a
  diagnostic, not a quality gate.

## 4. Provider mocking

**The mock adapter is a first-class fixture, not an afterthought.**

```text
tests/fixtures/
├── responses/
│   ├── <case_id>.openai.json        # recorded provider response, verbatim shape
│   ├── <case_id>.anthropic.json
│   └── <case_id>.<scenario>.json    # error scenarios: 401, 429, 500, timeout, refusal
├── reports/
│   └── <run_id>/report.json         # golden run records
└── suites/
    └── tiny@1.0.0/                  # a 3-case suite for fast integration tests
```

Rules:

1. Fixtures are **recorded** where possible, not hand-invented. Hand-authored
   fixtures are permitted but must be marked synthetic and must live under
   `tests/fixtures/` — never in `suites/` ([D5](./docs/decisions.md)).
2. Fixtures are checked in. A test never reaches the network.
3. The mock adapter is selected by an explicit option, never by accident, and the
   test asserts the real adapter was not constructed.
4. Fixture files keep the provider's original field names and shapes. A normalised
   fixture stops testing the normaliser — which is the thing under test.
5. When a provider changes its response shape, the case that would have caught it is
   the contract smoke test in §3.1.

## 5. What must be tested (MVMF checklist)

Each item maps to a real failure that would destroy trust in a result.

### 5.1 Scorers

- `json_schema`: valid object; unparseable; schema violation; refusal text; empty
  body; valid JSON wrapped in a markdown fence (the policy asserted, not assumed).
- `tool_call_match`: correct tool with valid args; correct tool with invalid args →
  `partial`; wrong declared tool → `partial`; undeclared tool → `fail`; no tool call
  when none was required → assert the documented outcome.
- The array-counting case (`so-006`) is scored correctly, including off-by-one.
- Scorer purity: same input → same outcome; no clock and no network, asserted by
  injecting throwing doubles.

### 5.2 Aggregation and denominators

- `scored = pass + fail + partial`
- `settled = scored + request_errors + scoring_errors + timeouts`
- `planned ≥ settled`
- Coverage is `scored / planned`, **not** `scored / settled`
- **A capability with zero cases is absent, and the renderer shows "not tested".**
  This is the [D4](./docs/decisions.md) invariant and it gets a dedicated test.
- p95 only at n ≥ 20; below that it is `not_available` with a reason.

### 5.3 Failure and honesty paths

- 401 → the run does not start; the error names provider and status; no credential anywhere
- 429 exhaustion → `request_error` with `error_class: rate_limit`
- 5xx → retried to the bound then recorded; `attempts` reflects reality
- Timeout → a `timeout` outcome, not a retry loop
- Scorer throws → `scoring_error`, **never** `fail`
- Interrupted process → artefacts hold only completed work; status is not `completed`
- Unpriced model → `unpriced`; no fabricated total

### 5.4 Comparability

- `compare` refuses across different suite versions and says why
- `compare` refuses across different suite content hashes
- Every delta carries its denominator
- Deltas between runs with different parameters are flagged, not silently computed

### 5.5 Security

- Redaction: a sentinel credential appears in **no** artefact, log line or error
  message after a full mock run
- The HTML report escapes model output: a response containing `<script>` and
  `<img onerror=...>` renders as inert text
- A metadata-endpoint `base_url` is refused
- A cross-origin redirect does not receive credentials

## 6. What is deliberately not tested

- **Model quality.** No test asserts that any model passes any case. That would
  encode a product claim as a test, and it would be unmaintainable.
- **Provider availability.** Out of our control; handled as an outcome, not a test.
- **Visual regression of the landing page.** No browser-automation dependency is
  justified for a static marketing page.
- **Statistical properties beyond the documented rules.** We test that the p95 rule
  is *applied*; we do not test that Wilson intervals are mathematically ideal.

## 7. Regression discipline

1. Every bug fix adds a test that fails before the fix. No exceptions.
2. A change to a scoring rule requires: a new rule version, updated fixtures, and a
   new golden report. Editing a golden file to make a test pass is a review red flag.
3. A change to a suite case requires a version bump
   ([benchmarks.md §5](./docs/benchmarks.md#5-changing-the-suite)) and therefore a
   new golden report.
4. If a fixture changes because a provider changed, the commit message must say which
   provider changed what. Silent fixture updates are forbidden.

## 8. Commands (target)

```bash
npm run lint          # exists today (eslint-config-next)
npx tsc --noEmit      # exists today
npm test              # unit + integration; no network, no credentials
npm run test:live     # opt-in contract smoke test; requires a key and --live
```

The default command must pass on a machine with no credentials and no network
access beyond package installation. If it cannot, the test is wrong.