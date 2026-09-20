# ModelCheck — Project Trials: task, context, verifier, statistics

**Version:** 0.1 · **Date:** 2026-09-20 · **Status:** designed, not built (planning only)
**This file owns:** the *trial* (repository-aware evaluation) definition, the task and
context-bundle formats, the verifier-validity rules, leakage guards, outcome and verdict
vocabulary, and versioning for trial-derived cases.
**Related:** methodology and terminology — [EVALUATIONS.md](../EVALUATIONS.md); the fixed
capability suite (Lane B) — [docs/benchmarks.md](./benchmarks.md); scope — [MVP.md](../MVP.md);
components and data model — [ARCHITECTURE.md](../ARCHITECTURE.md); data handling —
[SECURITY.md](../SECURITY.md); why this direction — [PRD.md](../PRD.md), [docs/research.md](./research.md),
[docs/decisions.md](./decisions.md).

> **Honesty note.** Every construct in this file is a *design*, not a measurement. No
> trial has been run, and no model has been scored on a repository task by ModelCheck.
> Where this file cites a number it is labelled with its source in
> [docs/research.md §2](./research.md#2-evidence-register).

---

## 1. What a trial is — and what it is not

A **trial** runs one real task, drawn from or written for a real repository, against one
or more model configurations, on an identical starting state, and reports what actually
happened: which checks passed, what changed in the tree, what it cost, and whether the
difference between two configurations is measurable at all.

**A trial measures a *setup*, not "a model".** The unit of comparison is
`model + harness + context bundle + parameters + route`. This is not pedantry: one model
has been reported at pass@1 50 / 45 / 40 under three different harnesses
([E16](./research.md#2-evidence-register)), and a published practitioner pipeline reports
that *"no single setup won everywhere"* across task types ([E15](./research.md#2-evidence-register)).
Any claim that names only a model is incomplete unless the rest of the setup is recorded.

A trial is **not**:

- a benchmark leaderboard (no cross-repo ranking, ever — [PRODUCT §7](../PRODUCT.md#7-what-modelcheck-must-not-become));
- a score out of 100 (there is no composite score in a trial, by design);
- a statement about safety, security or compliance;
- a replacement for code review.

## 2. Task definition

A **task** is the input a model receives, plus the checks that decide whether the work was
done. It is versioned and hashed; the hash is part of the trial identity.

```jsonc
{
  "task_id": "add-auth",              // stable, unique, never recycled
  "version": "1",                     // bumped when prompt, files or checks change
  "source": "manual" | "pr" | "case", // provenance
  "prompt": "…",                      // what the model sees: the request, not the answer
  "files": ["src/auth/**", "src/app.ts"],   // context selection input (MVP: explicit)
  "test_command": "npm test -- --runInBand", // MVP: explicit; discovery is V1
  "checks": [ /* see §6 */ ],
  "requirements": ["…"],              // optional, only if expressible as a check (T3)
  "limitations": ["…"]                // required: what this task does not measure
}
```

**Authoring rules** (mirrors [docs/benchmarks.md §1.1](./benchmarks.md#11-case-authoring-rules)):

1. One task, one behaviour. Two concerns are two tasks.
2. The prompt states the request, never the solution. A task that includes the diff
   measures copying.
3. Every check must be runnable or inspectable by a rule, a command, or a labelled judge.
4. If the task came from history, the reference solution must be removed from every input
   the model can see (§7).
5. Each task states its known limitation, because a task with no stated weakness is
   probably measuring something unintended.

### 2.1 Task sources

| Source | How it is produced | Available |
|---|---|---|
| `manual` | The user writes the prompt and names the files | MVP |
| `pr` | A merged change in history: ticket text + pre-merge tree + reference diff (never shown) | V1 |
| `case` | A previously saved `EvaluationCase` (frozen snapshot + task + checks) | V1 |

## 3. Snapshot: identical starting conditions

| Rule | Detail |
|---|---|
| Snapshot method | Export the working tree at a commit into a temporary directory. **The `.git` directory is never copied** — history is an answer key (§7) |
| Identity | `commit_sha` + `tracked_file_hash` (SHA-256 over the sorted list of `path` + blob digest) + `snapshot_method` + `tree_hash` |
| Dirty trees | Refused by default. `--allow-dirty` records `dirty: true` and the hash of the dirty state, and marks the trial `comparability: reduced` |
| Untracked files | Excluded. They are not part of any commit and cannot be reproduced |
| Submodules / LFS pointers | Recorded as `not_resolved`; a task touching them is `case_invalid` (§6) |
| Environment | The trial records the OS, Node/Python/toolchain versions and the container image digest when isolation is used. An unpinned environment is stated as `env: unpinned` — never presented as reproducible |

## 4. Context bundle: what the model is allowed to see

The context bundle is **an artefact with a manifest**, not an implementation detail. It is
what makes the trial auditable and what makes Feature J (context sensitivity) a
measurement rather than a claim.

| Field | Required | Notes |
|---|---|---|
| `files[]` | R | `path`, `bytes`, `sha256`, `selection_reason` (`explicit` · `glob` · `readme` · `import-graph` · `broad`), `token_estimate` |
| `excluded[]` | R | `path`/`glob`, `reason` (`gitignored` · `secret-pattern` · `binary` · `vendor` · `generated` · `too-large` · `user-excluded`) |
| `redactions[]` | R | `path`, `line`, `pattern_id`, `replacement`. Applied before the bundle is built |
| `scanner` | R | Which secret scanner ran (`gitleaks@x.y` · `trufflehog@x.y` · `builtin-conservative` · **`none`**) |
| `bundle_hash` | R | SHA-256 over the sorted (`path`, `sha256`) list |
| `token_estimate` | R | Approximate, and labelled as an estimate. Never presented as a measurement |
| `bytes_total` | R | For the size cap |
| `variants[]` | — | Named alternatives used by a context-sensitivity trial (§9.4) |

**Selection rules**

1. **Explicit first.** The MVP selection is a user-supplied path/glob list. Nothing is
   added silently.
2. **Suggestions are labelled.** A file the tool *suggests* (from an import graph, a
   README, or a manifest) is shown with its reason and is removable. Aider's repo map
   (tree-sitter + graph ranking under a token budget, `--map-tokens` default 1k) is the
   reference for how to *rank*; ModelCheck does not adopt it as a default
   ([E19](./research.md#2-evidence-register) and aider docs).
3. **Exclusions are defaults, not omissions:** `.gitignore` matches, binary files,
   `node_modules`/`vendor`/`dist`/build outputs, lockfiles (diff-only), minified assets,
   and everything matched by the deny-pattern list in
   [SECURITY §11](../SECURITY.md#11-repository-data-and-context-bundles-new-2026-09-20).
4. **Nothing is truncated silently.** If the bundle exceeds the model's context window,
   the trial refuses and offers exclusions; a truncated bundle is a different experiment
   and must be recorded as one.
5. **Context is not persisted by default.** The manifest and hash are stored; file
   *contents* are stored only with `--persist-context`
   ([SECURITY §11.4](../SECURITY.md#114-retention)).

## 5. Execution and isolation

| Rule | Detail |
|---|---|
| Patch-only output | The model returns a unified diff as text. It does not receive shell access in the MVP |
| Application | The patch is applied to the snapshot copy. A patch that does not apply is `apply_failed` — a distinct outcome, never folded into `fail` |
| Isolation | Verification runs in a **container** (no network by default, non-root, read-only base, CPU/memory/pid/wall-clock limits). This is the minimum bar already written in [SECURITY §5](../SECURITY.md#5-code-execution-future--coding-capability) |
| Container unavailable | The trial is marked `not_executed`. ModelCheck **refuses to run model-generated code on the host by default**; `--allow-host-execution` exists, is documented as running untrusted code with the user's privileges, and marks the trial `isolation: none` |
| Cost and time capture | Provider-reported tokens and cost ([E20](./research.md#2-evidence-register)); wall-clock and per-request latency measured by ModelCheck; `attempts` counts retries so retry-inflated cost is visible |

## 6. Checks, and the verifier-validity gate

A **check** is the smallest unit of evidence. Every check declares its kind, and kinds are
never merged ([EVALUATIONS §4](../EVALUATIONS.md#4-evaluator-types)).

| Kind | Tier | Example | Deterministic |
|---|---|---|---|
| `test` | T1 | `npm test` exit code; per-test pass→fail and fail→pass transitions | Yes |
| `build` | T1 | typecheck / compile exit code | Yes |
| `static` | T2 | new dependency added; test deleted or skipped; file outside scope touched; lockfile churn; secret-shaped string | Yes |
| `rule` | T3 | a declared requirement expressed as a predicate (symbol exists, migration present) | Yes |
| `judge` | T4 | rubric-scored requirement coverage | **No** — labelled `model-judged`, judge + prompt + rubric versions recorded |
| `human` | T5 | reviewer verdict + note | **No** — a label, never a score adjustment |

### 6.1 The gate (normative)

A task may be scored **only if all four hold**; otherwise the task is `case_invalid` and
**every model's result on it is excluded from denominators and shown as excluded**:

1. **Pass-with:** with the reference change, every `test`/`build`/`rule` check passes.
2. **Fail-without:** without it (or with it reverted), at least one check fails. A verifier
   that cannot detect the fix is not a verifier.
3. **Stability:** the checks produce the same outcome on the unmodified snapshot across the
   configured repeats. Any flip is `flaky`, and a flaky task is not scored until it is fixed.
4. **Control:** the untouched snapshot is green before any model runs (catches a broken
   environment, a missing dependency, a stale lockfile).

**Why this is a gate and not a metric:** the strongest published critique of the industry's
most-used coding benchmark found that **≥ 59.4% of an audited 27.6% subset had flawed tests
that reject functionally correct submissions** ([E12](./research.md#2-evidence-register)),
and a leading practitioner pipeline states plainly that hidden-test pass rates *"are an
incomplete measure of code quality"* ([E15](./research.md#2-evidence-register)). A refusal to
score is the honest output when the verifier cannot do its job.

## 7. Leakage guards for tasks derived from history

A task derived from a merged change is contaminated unless the answer is physically
removed. These are mandatory for `source: "pr"` and `source: "case"`:

| # | Guard | Detail |
|---|---|---|
| L1 | **No `.git`** | The snapshot is an export. No packfiles, no reflog, no branches, no tags, no `ORIG_HEAD` |
| L2 | **No reference diff** | The gold patch, its commit message, and any branch/PR description containing the solution are excluded from every input |
| L3 | **No future state** | The model sees the pre-change tree only. Files that only exist after the change are absent |
| L4 | **Prompt scrubbing** | Ticket text is scanned for the solution: file paths with diff hunks, "fixed by", test names introduced by the change, and verbatim code from the reference diff |
| L5 | **Test-file policy** | Tests the change *adds* are removed from the model's visible tree; they are the verifier's, not the model's. Tests the change *modifies* are shown only in their pre-change form |
| L6 | **Leak check as a check** | A `static` check asserts L1–L5 on every PR-derived task, so a leak is a failing check rather than a reviewer's hope |

**Rationale:** benchmark memorization is measured, not hypothetical — models identify the
buggy file from the issue text alone with **up to 76%** accuracy on SWE-bench versus
**≤ 53%** on comparable repositories outside it ([E13](./research.md#2-evidence-register)).
A leaked task does not measure capability; it measures recall.

## 8. Outcome and verdict vocabulary (normative additions)

These extend, and never replace, the vocabulary in [EVALUATIONS §1](../EVALUATIONS.md#1-terminology-normative).

### 8.1 Per-attempt outcome

| Outcome | Meaning | Counts as scored? |
|---|---|---|
| `pass` | All declared checks passed | Yes |
| `partial` | A required-but-not-sufficient condition held (e.g. tests pass, scope check failed) | Yes |
| `fail` | The patch applied and at least one check failed | Yes |
| `apply_failed` | The returned patch did not apply to the snapshot | No |
| `case_invalid` | The verifier failed the gate (§6.1) | **No — excluded from every denominator** |
| `not_executed` | No isolation available, or execution declined | No |
| `cost_exceeded` | The budget stopped the attempt | No |
| `request_error` / `timeout` | Provider failure / terminal timeout (existing meanings) | No |
| `scoring_error` | A check itself threw | No |
| `not_run` | Planned, never attempted | No |

### 8.2 Trial verdict (per model, per task set)

| State | When it is used |
|---|---|
| `better` | The paired difference favours this model and the interval excludes zero |
| `worse` | As above, in the other direction |
| `no measurable difference` | The interval includes zero **and** the trial had enough power to detect the effect that matters (§9.3) |
| `inconclusive (underpowered)` | The interval includes zero **and** the trial could not have detected a meaningful effect |
| `insufficient coverage` | Too few tasks passed the verifier gate to compare anything |

**`no measurable difference` is a successful result**, not a failure. It is what an honest
small-n comparison usually produces, and printing a winner instead is the behaviour this
product exists to replace.

## 9. Statistics for trials

Small samples are the norm here, so the method must be honest about what it cannot see.

### 9.1 Repeats and reliability

- Default: **`--repeat 3`** for a stochastic model; `1` is allowed only with `--repeat 1` explicitly chosen, and the verdict then reports `reliability: not measured`.
- Report **pass^k** per model (the fraction of tasks where *all* k repeats passed), alongside the per-repeat vector. Never average away a flaky failure.
- Rationale: agent reliability degrades sharply across repeats in published work — one widely used agent benchmark reports < 50% single-attempt success and **pass^8 < 25%** on one domain ([E24](./research.md#2-evidence-register)); and an `n = 1` per model per prompt benchmark was publicly criticised as not being a benchmark at all ([E24](./research.md#2-evidence-register)).

### 9.2 Comparison is paired

Every model in a shootout runs the **same tasks on the same snapshots** with the same
context bundle hash. The primary display is the per-task transition table
(`A pass / B pass`, `A pass / B fail`, …), not a difference of two percentages. Paired
designs are strictly more informative than independent samples at the same n, and the
evaluation-as-experiment framing is established practice ([E24](./research.md#2-evidence-register)).

### 9.3 Power, stated before spending

Before the run, ModelCheck prints the **minimum detectable difference** implied by
`tasks × repeats` for a paired comparison. If the user's question needs a smaller effect
than that, the tool says so *before* the money is spent. This is the single cheapest piece
of honesty in the product.

### 9.4 Context sensitivity (V1)

A context-sensitivity trial runs the same model and task against 2–3 named bundle variants
(e.g. `task-only`, `+readme`, `+selected-files`). It reports, per variant: outcome vector,
tokens, cost, latency — and an explicit statement that longer context is not automatically
better, because measured degradation with input length is non-uniform across models
([E19](./research.md#2-evidence-register)).

## 10. Versioning, lifecycle and reuse

| Object | Rule |
|---|---|
| `Task` | Has a `version`; any change to prompt, file list, test command or checks bumps it. The task hash is part of the trial identity |
| `Check` | Versioned per rule family (`test@1`, `static@1`, `build@1`, `rule@1`, `judge@1`). A rule change means a new version, never an in-place edit |
| `EvaluationCase` (V1) | A frozen, reusable trial definition: snapshot ref + task + checks + verifier-validity record. Reuse requires the same snapshot |
| `Benchmark` set (V2) | A versioned set of cases plus a selection rule; changing membership bumps the set version, and comparisons across versions are refused |
| Retirement | A task is never silently deleted. It is retired, and the retirement is recorded — removing a task silently changes every future percentage |
| Project drift | When the repository moves past a case's snapshot, the case is `stale`, not broken. Re-basing it creates a new case version; it does not edit the old one |
| Model identity | The trial records `requested_model`, `resolved_model`, the gateway's canonical dated slug, and the route/quantization ([E20](./research.md#2-evidence-register), [E21](./research.md#2-evidence-register)). A changed identity invalidates a cross-time comparison rather than being silently compared |

## 11. Not in a trial (yet)

A trial does **not**, in the MVP: explore the repository on its own; discover the test
command; discover which files matter; score anything with a judge; judge its own output;
run model-authored shell commands; upload anything; rank models across repositories; or
claim that a result generalises beyond this repository, this snapshot and this route.
Anything not measured is rendered as **not measured** — never as zero
([D4](./decisions.md)).

## 12. Acceptance criteria for the Trial MVP

A trial implementation is done when all of the following are demonstrable:

1. Two models, one task, three repeats: identical snapshot hash, task hash and bundle hash, asserted in the artefact.
2. A task whose verifier fails the §6.1 gate is refused, and the refusal is visible in the report.
3. A model that returns an unapplicable patch yields `apply_failed`, not `fail`.
4. No isolation available ⇒ `not_executed`, and no model-generated code runs on the host.
5. Every number in `trial.html` is recomputable from `trial.json` alone.
6. Cost, tokens and latency are reported separately from checks, with `unpriced` where no price row exists.
7. A comparison with one task renders `inconclusive (underpowered)`, never a winner.
8. The context bundle's contents are absent from disk unless `--persist-context` was passed.
9. The secret scanner ran (or the report says `scanner: none`), and no denied file reached the bundle.
10. No automated test makes a real provider call ([TESTING.md](../TESTING.md)).



