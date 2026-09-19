# ModelCheck — V1 Suite Definition

**Version:** 0.2 · **Date:** 2026-09-18 · **Suite id:** `core@1.0.0`
**This file owns:** the concrete cases in the default suite, and the rules for changing them.
**Methodology and terminology:** [EVALUATIONS.md](../EVALUATIONS.md). Scope: [MVP.md](../MVP.md).

> **Note on honesty:** the cases below are *definitions*, not measurements.
> ModelCheck has produced no results. No model score exists anywhere in this
> repository ([decisions D5](./decisions.md)).

---

## 1. Suite conventions

| Item | Value |
|---|---|
| Suite id | `core` |
| Version | `1.0.0` |
| Capabilities | `structured_output` (15 cases), `tool_calling` (15 cases) |
| Total cases | 30 |
| Scoring | Deterministic only: `json_schema@1`, `tool_call_match@1` |
| Repeats | 1 by default; `--repeat` available |
| Temperature | `provider_default` by default; the value sent is always recorded |
| Content hash | Computed over the canonical serialisation of all 30 cases; embedded in every report |
| Estimated runtime | ≤ 5 minutes at default concurrency ([MVP §4.6](../MVP.md#46-the-10-minute-test)) |
| Estimated cost | Printed before the run from the dated price table; unknown models show `unpriced` |

### 1.1 Case authoring rules

1. Every case tests **one** behaviour. Two concerns means two cases.
2. The expected behaviour must be checkable by a rule, not by taste.
3. Cases must be solvable by a competent model. A trap case measures the trap.
4. No case may require knowledge that postdates the model's training data.
5. Each case states its known limitation, because a case with no stated weakness
   is probably measuring something unintended.
6. Changing an input or a scoring parameter bumps the suite version
   ([EVALUATIONS.md §9](../EVALUATIONS.md#9-versioning)).

### 1.2 Difficulty labels

`basic` — the mechanism only. `standard` — the mechanism plus one realistic
complication. `hard` — the mechanism plus several interacting constraints.

## 2. Capability: `structured_output` — `json_schema@1`

Scoring: parse the response as JSON, validate against the case schema. `pass` =
parses and validates; `fail` = anything else
([EVALUATIONS.md §6.1](../EVALUATIONS.md#61-json_schema1-capability-structured_output)).
`partial` is not used in this capability.

| ID | Purpose | Input (summary) | Expected behaviour | Difficulty | Known limitations | Ver |
|---|---|---|---|---|---|---|
| `so-001` | Baseline flat-object extraction | Short invoice text; schema with 4 flat fields | One JSON object, all four fields present and correctly typed | basic | Trivially solvable by frontier models; separates only weak models | 1 |
| `so-002` | Required vs optional fields | Profile text; 2 required + 3 optional fields, no data for the optionals | Required fields present; no invented optional values | standard | Models may emit `null` optionals; scoring accepts absence, not `null` | 1 |
| `so-003` | Numeric type discipline | Text stating "1,250 units at £3.50"; schema requires integer + number | `1250` as integer, `3.5` as number — no separators or symbols in numerics | standard | Locale conventions vary; one case only | 1 |
| `so-004` | Enum adherence | Support ticket; `category` enum with 5 values | Exactly one of the five values, no synonyms | basic | A plausible synonym is a `fail` by design | 1 |
| `so-005` | Nested object | Order description; nested `customer` and `address` objects | Nested structure exact, including required inner fields | standard | Only two levels of nesting are exercised | 1 |
| `so-006` | Array of uniform objects | Three line items; array of item objects with fixed keys | Array of 3, each with the same keys | standard | Miscounting is a `fail`; counting is the point | 1 |
| `so-007` | Empty-array case | Text explicitly describing zero matching records | `[]` — not `null`, not a fabricated entry | standard | Distinguishes "no data" from "cannot comply" | 1 |
| `so-008` | Escaped characters in strings | Text containing a quote, a newline and a backslash | Valid JSON with correct escaping; parsed value equals the source text | hard | Encodes the most common real serialisation bug | 1 |
| `so-009` | Unicode preservation | Text with accented characters and one emoji | Characters preserved exactly; no transliteration | standard | Unicode normalisation forms are not compared | 1 |
| `so-010` | Length-constrained free text | A paragraph to place in a `summary` field with a stated ceiling | Field present, within the ceiling, required content not summarised away | standard | Measured in characters, not tokens | 1 |
| `so-011` | Refusal with a valid shape | Input requests data the schema has no field for and says it is unavailable | Response uses declared fields only, with the documented absent convention | hard | A prose refusal is a `fail` by design, recorded with the refusal text | 1 |
| `so-012` | Conflicting constraints | Schema requires a field; input says the value is unknown | Schema-conformant output using the documented unknown convention, not a guess | hard | Requires the convention to be stated in the schema; the case states it | 1 |
| `so-013` | `additionalProperties: false` | Simple entity text; extra keys forbidden | No extra keys — no reasoning field, no wrapper, no commentary | standard | Catches the "helpful extra field" failure | 1 |
| `so-014` | No prose around the JSON | Plain extraction text | Body is exactly one JSON value; no fence, no preamble | standard | Some providers wrap in code fences; the adapter's fence policy is recorded per run | 1 |
| `so-015` | Ordered array of enums | Text listing three tags from a fixed set | Three enum values, correct order, no duplicates | hard | Order is asserted; a set-equal reordering is a `fail` — documented limitation to revisit in `1.1.0` | 1 |

## 3. Capability: `tool_calling` — `tool_call_match@1`

Scoring: the tool selected **and** its arguments validated against that tool's
parameter schema ([EVALUATIONS.md §6.2](../EVALUATIONS.md#62-tool_call_match1-capability-tool_calling)).
Each case declares 3–6 tools.

| ID | Purpose | Input + tool set (summary) | Expected behaviour | Difficulty | Known limitations | Ver |
|---|---|---|---|---|---|---|
| `tc-001` | Single unambiguous tool | Weather query; 4 tools, one clearly relevant | Calls `get_weather` with a valid location argument | basic | Frontier models rarely fail; establishes the floor | 1 |
| `tc-002` | No tool required | Conversational question needing no tool; 4 tools declared | Calls no tool | standard | Tests over-eagerness; scoring must accept a text answer | 1 |
| `tc-003` | Two candidate tools, one correct | "Email the report to Sam"; 5 tools incl. `send_email`, `create_document` | Calls `send_email` with valid recipient and subject | standard | Correct tool with wrong arguments is `partial`, not `pass` | 1 |
| `tc-004` | Required argument extraction | Booking request naming a date and a city; `book_flight` requires both | Both required arguments present and correctly typed | standard | Date-format flexibility is accepted only when the schema allows it | 1 |
| `tc-005` | Optional argument omission | Query where an optional filter has no stated value | Optional omitted or explicitly defaulted, never invented | standard | "Invented optional argument" is the failure under test | 1 |
| `tc-006` | Enum-constrained argument | Status update where `priority` is a 3-value enum | Exactly one valid enum member | basic | Synonym values are `partial` | 1 |
| `tc-007` | Nested argument object | Search with a `filters` object containing typed sub-fields | Nested object present and conformant | hard | Only one nesting level | 1 |
| `tc-008` | Array argument | Bulk operation over three named items | Array with exactly those three items | standard | Item order is not asserted | 1 |
| `tc-009` | Numeric vs string argument | Amount in prose; `amount` is a number, `currency` a string | `1250` and `"GBP"` in their declared types | standard | Catches numeric-as-string | 1 |
| `tc-010` | Ambiguity requiring a choice | "Cancel it"; two cancellable entities referenced earlier | Cancels the most recently referenced entity, or asks a clarifying question | hard | Both behaviours accepted — deliberately permissive; documented as such | 1 |
| `tc-011` | Multi-tool sequencing, one turn | Request needing two independent lookups | Emits both calls, both valid | hard | Partial credit is per call; a missing call is `fail` | 1 |
| `tc-012` | Refusal with a tool available | Request asks for an action the tool cannot express | No fabricated call; no call, or an honest explanation recorded | hard | Scoring accepts both; the case exists to detect invented arguments | 1 |
| `tc-013` | Argument derived from a prior turn | Second turn where the subject appears only in turn 1 | Argument carries the earlier subject correctly | hard | Requires shipping both turns with the case | 1 |
| `tc-014` | Emotionally loaded factual request | Frustrated user asking for a lookup | Correct tool and valid arguments; tone does not alter the call | standard | Tests that affect does not degrade structure | 1 |
| `tc-015` | Declared-but-unsuitable tool | A tool that sounds relevant but cannot satisfy the request | The correct tool is chosen instead of the superficial match | hard | The nearest thing to a trap case; the decoy's contract makes it unsatisfiable | 1 |

## 4. Coverage map

| Capability | Cases | Deterministic scoring | In v1 |
|---|---|---|---|
| `structured_output` | 15 | Yes | Yes |
| `tool_calling` | 15 | Yes | Yes |
| `reasoning` | — | No | **Not tested** — needs a judge or a formal checker |
| `instruction_following` | — | Partly | **Not tested** — free-text constraints are not deterministically scoreable |
| `long_context` | — | No | **Not tested** — needs a judge plus length-controlled fixtures |
| `coding` | — | Yes, via execution | **Not tested** — requires sandboxing ([SECURITY.md](../SECURITY.md), Stage 3) |
| `vision` | — | No | **Not tested** — out of scope |

**Normative:** these rows render in the report as `Not tested`, never as `0` and
never as an empty cell ([D4](./decisions.md)).

## 5. Changing the suite

| Change | Requirement |
|---|---|
| Correcting a typo in `purpose` or `limitations` | No version bump (metadata only) |
| Changing a case input or scoring parameter | **Must** bump `core`'s minor version **and** the content hash |
| Adding cases | Minor version bump |
| Removing a case | Minor version bump **plus** an entry in [decisions.md](./decisions.md); `compare` refuses across versions |
| Changing a scoring rule's behaviour | New rule version (`json_schema@2`); past results are untouched |
| Rebalancing difficulty | Minor version bump, with the reason recorded |

## 6. Deliberately not in the V1 suite

Recorded so this does not read as an oversight:

- **No coding cases.** The most-requested capability, and the one that needs a
  sandbox before it can be scored honestly ([MVP §6](../MVP.md#6-explicitly-excluded-from-the-mvp)).
- **No reasoning or maths cases.** Without a judge or a formal checker, a score
  would be an opinion wearing a number.
- **No trick cases.** A suite that games models produces results that do not
  transfer to a user's workload.
- **No case copied from a published benchmark** without recording its origin in the
  case's `source` field. Contamination is a limitation; plagiarism is a defect.
- **No 200-case suite.** Thirty cases a user actually reads beat two hundred they
  scroll past — and they keep the run inside the 5-minute budget.