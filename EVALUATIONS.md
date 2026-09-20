# ModelCheck — Evaluation Methodology

**Version:** 0.3 · **Date:** 2026-09-20 · **Status:** binding domain contract
**This file owns:** terminology, scoring, metrics, reproducibility, and the limits of what a ModelCheck number means.
**Related:** concrete cases are in [docs/benchmarks.md](./docs/benchmarks.md); execution is in [ARCHITECTURE.md](./ARCHITECTURE.md); scope is in [MVP.md](./MVP.md).

> **Lane A (2026-09-20).** Repository trials extend this methodology: a trial unit is a **setup** (model + harness + context bundle + params + route — [D22](./docs/decisions.md#d22--the-measurement-unit-is-the-setup-not-the-model)), outcomes are extended with `apply_failed`, `not_executed`, `case_invalid` and `completed_with_gaps`, and no score exists without a validated verifier ([D23](./docs/decisions.md#d23--no-score-without-a-validated-verifier)). The normative specification is [docs/trials.md](./docs/trials.md); everything below remains binding for Lane B capability runs.

> **The governing sentence:** a ModelCheck result describes *one model, on one
> versioned set of cases, at one time, through one provider route*. It is not a
> statement about intelligence, and it is not permanent.

---

## 1. Terminology (normative)

These words have exactly one meaning in this project. Prose, UI copy, code
identifiers and test names must all conform.

| Term | Definition |
|---|---|
| **Suite** | A versioned collection of cases, grouped into capabilities, with a fixed scoring rule per case. Identified by `suite_id@version` plus a content hash. |
| **Case** | One reproducible task: an input, an optional reference, and one scoring rule. Identified by a stable `case_id`. |
| **Capability** | A named group of cases measuring one kind of behaviour (e.g. `structured_output`, `tool_calling`). A capability is a grouping, **not** a score. |
| **Run** | One execution of one suite version against one resolved model configuration. Identified by `run_id`. |
| **Outcome** | The terminal state of a case in a run: `pass`, `fail`, `partial`, `request_error`, `scoring_error`, `skipped`, `timeout`, `not_run`. |
| **Scored** | A case whose outcome is `pass`, `fail` or `partial`. Only scored cases enter a denominator. |
| **Settled** | A case that reached any terminal outcome, including errors. |
| **Planned** | A case the run intended to execute. |
| **Coverage** | `scored / planned` for a capability or a run. |
| **Deterministic score** | A result computed by a rule that does not involve a model, e.g. schema validation. A fact. |
| **Model-judged score** | A result produced by a language model acting as a grader. **An opinion**, always labelled as such. Never mixed into a deterministic aggregate. |
| **Partial** | An outcome where a required-but-not-sufficient condition held (e.g. correct tool, invalid arguments). Counts as scored, never as pass. |
| **Delta** | The difference between the same metric across two runs of the same suite version. Must carry its denominator and its comparison basis. |
| **Not tested** | A capability the suite does not exercise. Rendered explicitly. **Never 0.** |
| **Resolved model** | The provider-returned model identifier actually served for a request, as distinct from the requested string. |
| **Baseline** | The run a candidate is compared against. Usually the model currently in production. |

**Forbidden vocabulary in this project:** "intelligence", "smartness", a
capability "score" standing alone without a denominator, and any phrasing that
implies a universal model ranking.

## 2. Test structure

Normative shape of a case. Fields marked **R** are required.

| Field | R | Notes |
|---|---|---|
| `case_id` | R | Stable, unique, never recycled. Format `<capability>-<nnn>` |
| `capability` | R | One of the suite's capability keys |
| `version` | R | Case-level version; changes when the input or the scoring rule changes |
| `input` | R | The messages sent to the model; may include a system prompt |
| `tools` | — | Tool definitions, for `tool_calling` cases only |
| `scoring` | R | The scoring rule: `json_schema`, or `tool_call_match` |
| `scoring_params` | R | e.g. the JSON Schema, or the expected tool name and argument constraints |
| `expected_notes` | — | Human note on what a correct answer looks like. **Not** used for scoring |
| `difficulty` | — | Coarse label for ordering and coverage review |
| `limitations` | — | Known weaknesses of this case, surfaced in the report |
| `source` | — | Provenance if adapted from an existing benchmark |

**Rule:** the author of a case may not weaken its scoring parameters after seeing
a model fail it. Changes are recorded in [docs/decisions.md](./docs/decisions.md)
when they alter a published result.

## 3. Evaluation lifecycle

```text
load suite@version
   ↓ validate (schema, unique ids, scoring rule present)
plan run  →  print estimate + case list  →  user confirms
   ↓
for each case (bounded concurrency, timeout, bounded retries)
   ↓
request model  →  record request metadata  →  persist raw response
   ↓
score (deterministic rule)  →  outcome
   ↓
aggregate (per capability: scored/planned, pass/fail/partial, cost, latency)
   ↓
write report.json  →  render report.html
   ↓
compare (optional)  →  deltas vs a baseline run
   ↓
persist baseline (optional)  →  enables the next delta
```

Every arrow is a place where data can be lost. The manifest in §5 exists to make
that loss visible rather than silent.

## 4. Evaluator types

Six families exist in the field. We use two in v1, and we say plainly why the
others are not used yet.

| Family | Deterministic? | Used in v1? | Why / why not |
|---|---|---|---|
| **Schema / exact validation** | Yes | **Yes** — `structured_output` | Cheapest, most defensible, and directly matches a real product requirement (parseable output) |
| **Structured comparison** (tool chosen + arguments validated) | Yes | **Yes** — `tool_calling` | Measures behaviour that agents depend on, without running anything |
| **Execution-based** (run the code, run the unit test) | Yes | **No** | The most valuable signal for coding, but requires sandboxing untrusted generated code — a security project in itself ([SECURITY.md](./SECURITY.md)). Stage 2/3 |
| **Reference comparison** (exact string, normalized match) | Mostly | **No** | Brittle for generative text; low value for the v1 capabilities |
| **Rubric-based, model-judged** | No | **No** | Introduces a second model, cost, latency and contested reliability ([D3](./docs/decisions.md)). Stage 3 |
| **Pairwise, model- or human-judged** | No | **No** | Requires two candidate outputs and a judge; the strongest signal for chat quality, which is not our v1 user |
| **Human evaluation** | No | **No** | Not reproducible at this scale and unusable in the MVP loop |

**Rule (normative):** the two families may never share an aggregate. A
model-judged number may not be summed, averaged or plotted against a deterministic
one, and may never be described as an accuracy. When Stage 3 introduces judging,
the report must carry the label **model-judged** adjacent to the number itself,
not in a tooltip.

## 5. The reproducibility manifest

**What makes a result trustworthy is that someone else can see exactly what was
measured.** This is the required field list for `report.json`. A run missing any
**R** field is invalid and must not be rendered as complete.

### 5.1 Run identity

| Field | R | Notes |
|---|---|---|
| `run_id` | R | Generated; sortable; unique |
| `run_label` | — | User-supplied, e.g. `baseline` / `candidate` (SHOULD) |
| `started_at_utc` | R | ISO 8601, UTC. Never local time |
| `finished_at_utc` | R | ISO 8601, UTC |
| `status` | R | `completed` / `completed_with_gaps` / `failed` / `aborted` |
| `modelcheck_version` | R | The tool version that produced the run |
| `report_schema_version` | R | Schema of `report.json` itself |

### 5.2 Model and route identity

| Field | R | Notes |
|---|---|---|
| `provider` | R | Adapter identity, e.g. `openai_compatible` / `anthropic` |
| `endpoint_base_url` | R | Exact base URL used |
| `requested_model` | R | Exact string the user asked for |
| `resolved_model` | R | Provider-returned model identifier, or `unresolved` with a reason — never silently omitted |
| `provider_request_ids` | — | Per-request ids where the provider returns them |

### 5.3 Suite and case identity

| Field | R | Notes |
|---|---|---|
| `suite_id`, `suite_version` | R | e.g. `core@1.0.0` |
| `suite_content_hash` | R | Hash of the case set, so a silently edited suite is detectable |
| `case_ids` | R | The exact planned set |
| `planned_count` | R | Denominator anchor |
| `repeats_per_case` | R | 1 in v1 unless `--repeat` is used |

### 5.4 Parameters

| Field | R | Notes |
|---|---|---|
| `temperature` | R | Value sent, or `provider_default` — the two are different states |
| `max_output_tokens` | R | Value sent, or `provider_default` |
| `seed` | — | Only when the provider supports it; `unsupported` otherwise |
| `streaming` | R | Boolean |
| `timeout_ms`, `max_retries`, `concurrency` | R | Execution envelope |

### 5.5 Per-case record

| Field | R | Notes |
|---|---|---|
| `case_id`, `capability` | R | |
| `outcome` | R | One of the eight in §1 — never booleans |
| `score` | R | Numeric or null; null when not scored |
| `scoring_rule` | R | The rule actually applied, e.g. `json_schema@1` |
| `raw_response` | R | The provider response, verbatim |
| `error_class` | — | Required whenever `outcome` is an error: `auth`, `rate_limit`, `timeout`, `server`, `network`, `refusal`, `malformed` |
| `input_tokens`, `output_tokens` | — | Required when the provider returns them; `not_reported` otherwise |
| `latency_ms` | R | End-to-end request duration |
| `attempts` | R | How many requests were made for this case |
| `estimated_cost_usd` | — | Only when prices for the model are known; otherwise `unpriced` |

### 5.6 Aggregates

| Field | R | Notes |
|---|---|---|
| Per capability: `planned`, `settled`, `scored`, `pass`, `fail`, `partial`, error counts | R | The denominators that must never be collapsed |
| `coverage` | R | `scored / planned` |
| `cost_total_usd`, `cost_basis` | R | `estimated` or `unpriced`; plus a dated price-table reference |
| `latency_p50_ms`, `latency_p95_ms`, `latency_n` | R | p95 only over ≥20 samples, else `not_available` with a reason |
| `interval` | — | Only where the assumptions in §7 hold |
| `limitations` | R | Human-readable strings, rendered in the body of the report |

**The recomputability rule (normative):** every number printed in `report.html`
must be derivable from `report.json` alone, with no provider call and no external
lookup. This is what makes a result checkable by a third party, and it is
acceptance criterion 2 in [MVP.md](./MVP.md#7-acceptance-criteria).

## 6. Scoring rules

### 6.1 `json_schema@1` (capability: `structured_output`)

| Condition | Outcome |
|---|---|
| Response body parses as JSON **and** validates against the case schema | `pass` |
| Response contains no parseable JSON | `fail` |
| Parses, but violates the schema | `fail` (the violation is recorded as the reason) |
| Model returns a refusal in prose | `fail`, with the refusal recorded — a refusal is a real product outcome, not an error |
| Provider returned an HTTP error | `request_error` |
| The scorer itself threw | `scoring_error` |

`partial` is not used for this capability: a schema either validates or it does not.

### 6.2 `tool_call_match@1` (capability: `tool_calling`)

| Condition | Outcome |
|---|---|
| The expected tool was called **and** its arguments validate against the tool's parameter schema | `pass` |
| A **different but declared** tool was called, or the expected tool was called with arguments that fail validation | `partial` |
| No tool was called, or a tool was called that the request never declared | `fail` |
| Provider returned an HTTP error | `request_error` |

**Rationale for `partial`:** "called the right function with a malformed argument
object" is the most common real-world agent failure and is materially different
from "did nothing". Collapsing it into `fail` would hide the most actionable
signal in the suite.

### 6.3 Scoring invariants

- A scorer is a pure function of `(raw_response, scoring_params)`. It performs no
  network I/O and reads no clock.
- Scorers are versioned (`<rule>@<n>`) and the version is stored per case, so a
  later change to a scorer never silently rewrites a past result.
- A scorer may not call a language model. That is a different rule family (§4).
- Scoring must be reproducible: the same response and parameters yield the same outcome.

## 7. Statistics and uncertainty

**The problem:** with ~15 cases per capability, a difference of one case moves the
percentage by ~6.7 points. Almost every "Model A beats Model B" claim at this
sample size is noise.

**Rules (normative).**

1. **Always show the denominator.** `23/30`, not `77%` alone.
2. **Binary, single-observation case metrics may carry a 95% Wilson score
   interval**, and only then. If cases are clustered, repeated, or partially
   scored, show `Interval not available` with the reason.
3. **Precision follows support.** Report percentages to at most one decimal.
   Never report a third decimal on a 20-case suite ([D11](./docs/decisions.md)).
4. **A delta must state the comparison basis.** `+2 cases of 30 (same suite
   version, same parameters)` — not `+6.7%`.
5. **Overlapping intervals mean "not resolved".** If two capabilities' intervals
   overlap, the report says the difference is not distinguishable with this many
   cases. It does not declare a winner.
6. **No aggregate score across capabilities.** Averaging structured-output
   accuracy with tool-calling accuracy produces a number with no meaning
   ([D10](./docs/decisions.md); [PRODUCT §7](./PRODUCT.md#7-what-modelcheck-must-not-become)).
7. **Uncertainty is stated as a limitation, not a footnote.** It appears next to
   the number it qualifies.

**What we do not claim.** A ModelCheck result does not establish that a suite
represents the user's full workload, does not control for training-data
contamination, and does not measure a model's general ability. These are stated in
every report's limitations block.

## 8. Cost and latency measurement

### 8.1 Cost

| Rule | Detail |
|---|---|
| Basis | Token counts **returned by the provider** × a **dated price table** committed to the repository |
| Label | Always "Estimated charge". Never "invoice", never "actual cost" |
| Unpriced models | Emit `unpriced`, and do not present a total. A missing price is not zero |
| Judge/retry cost | Included in the total when they occur, and broken out separately |
| Stopping | A pre-flight estimate is printed and a stop threshold is applied **before** scheduling; if the provider cannot guarantee a hard cap, the report says "stop threshold" and explains possible in-flight overrun (`../design.md` §9) |
| Currency | USD, explicit |

### 8.2 Latency

| Rule | Detail |
|---|---|
| Definition | End-to-end duration of a single request, including retries when retries occurred (and `attempts` is reported) |
| Reported | p50 and n always; p95 only when n ≥ 20, otherwise `not_available` with a reason |
| Context | Concurrency, streaming mode, endpoint and region are part of the record — latency is meaningless without them |
| Not reported | Tokens/second, unless the provider returns timing data that supports it; TTFT is Stage 2+ |
| Caveat | Latency is dominated by the provider route, not the model. The report says so near the number |

**Rule:** cost, latency and completion are never combined with quality into a
single value ([P4](./PRODUCT.md#2-product-principles)). A "cost per correct
answer" is a legitimate *derived* figure to show **when both inputs are present**,
and must state both denominators.

## 9. Versioning

| Object | Rule |
|---|---|
| **Suite** | Semantic version. A change to any case input or scoring parameter **must** bump the version and change the content hash. Two runs of different suite versions are not comparable and `compare` must refuse |
| **Case** | Has its own version; changing an input or scoring rule bumps it |
| **Scoring rule** | Versioned (`json_schema@1`). A rule change creates a new version, never an in-place edit |
| **Report schema** | Versioned; the version is embedded in every report so an old artefact remains readable |
| **Price table** | Dated. A report references the table it used |
| **Tool** | `modelcheck_version` is recorded. A run from an unknown version is still readable and is not silently reinterpreted |

**Deletion rule:** a case is never silently removed after publication. It is
retired, and the retirement is recorded, because removing a case silently changes
every future percentage.

## 10. Limitations (must appear in every report)

These strings are part of the artefact, not optional commentary:

1. **Sample size.** "Results are based on N cases per capability. A one-case
   difference is roughly X points."
2. **Representativeness.** "This suite is a fixed set of cases. It does not
   represent your production traffic."
3. **Non-determinism.** "Provider outputs may vary between requests. Reproducing
   this run reproduces the procedure, not necessarily the outputs."
4. **Coverage.** "Capabilities not listed were not tested. They are not zero."
5. **Contamination.** "This suite does not control for training-data contamination."
6. **Route dependency.** "Latency and cost reflect this provider, endpoint and
   parameter set."
7. **Snapshot.** "This result describes this model version at this time. Provider
   aliases can change what a model name serves."

## 11. Model-judged scoring (designed, not built)

Recorded so the design constraints exist before the temptation to ship it.

- Judging is a **separate rule family** and a separate section of the report,
  labelled `model-judged`, never merged with §6 results.
- The judge model, its version, its prompt, the prompt's version and its own cost
  are all recorded — the judge is itself an evaluated component.
- A judged score is **never** called an accuracy or a pass rate.
- Judge agreement is not a substitute for validity, and no judge-derived number may
  appear in a delta that a deterministic number also appears in.
- Requirement before shipping: a documented rubric for each judged capability, plus
  a stated position on position bias and self-preference (a judge preferring
  outputs from its own family).

## 12. What would change this methodology

Stated in advance so the methodology is falsifiable rather than defended:

- If users report that the deterministic capabilities do not describe their
  workload, the suite is wrong — not the users ([MVP K3](./MVP.md#8-kill-criteria)).
- If repeated runs of the same model produce materially different outcomes on what
  should be deterministic cases, the scoring rules are too loose.
- If a judge-based approach is shown to agree with human raters well enough on a
  specific capability, it may be adopted for that capability — with the labels above.
- If coding coverage proves to be the entry requirement, the sandbox in
  [SECURITY.md](./SECURITY.md) moves from Stage 3 to Stage 1, and the MVP gets longer.