# ModelCheck — Feature Map

**Version:** 0.1 · **Date:** 2026-09-20 · **Status:** planning artefact; **not scope**
**This file owns:** how proposed features collapse onto one execution engine, which
features are duplicates of each other, and the explicit list of things ModelCheck will
**not** build. Scope lives in [MVP.md](../MVP.md); evidence in
[docs/research.md](./research.md); decisions in [docs/decisions.md](./decisions.md).

> **Rule.** No feature may introduce a second execution engine, a second report format
> family, or a second scoring path. Everything below must resolve to
> `Trial → ModelRun → Attempt → Check → Evidence → Verdict`.

---

## 1. The primitive

**Trial** — a repository snapshot + a task + a context bundle + one or more model
configurations + parameters + a budget. Everything else is a view, an axis, or a
lifecycle stage over that primitive. See [docs/trials.md](./trials.md) for the formats.

## 2. Overlap map

```text
Trial
├── Project Trial ................ Trial with one model                       (MVP)
├── Model Shootout ............... Trial with N models                        (MVP)
├── Task Replay .................. Trial with a pinned snapshot and params —
│                                  a property of Trial, not a feature         (MVP)
├── Model Swap Test .............. Shootout whose baseline is the incumbent —
│                                  already shipped as `compare`               (MVP)
├── Before/After Evaluation ...... Trial's evidence layer: checks + diff + tests (MVP)
├── Failure Fingerprint .......... Trial's evidence-by-kind view (≤6 kinds)   (MVP)
├── Human Override ............... One labelled evidence row on the verdict   (MVP-lite)
├── Cost-to-Quality .............. Metrics columns on every trial            (MVP)
├── Context Sensitivity .......... Trial × context-variant axis               (V1)
└── Unknown-Model entry UX ....... The flow that starts a Trial               (MVP)

Personal benchmark
├── Saved EvaluationCase ......... A frozen Trial definition; versioned       (V1)
├── Task from a merged PR ........ A task source, not a subsystem             (V1)
└── Regression Watch ............. A scheduled Trial plus comparison over time (V2)

Project-specific model profile ... Aggregation over many Trials; no new pipeline (V2)
```

## 3. Merge table — proposed feature → what it becomes

| Proposed | Verdict | Becomes |
|---|---|---|
| Project Trial | Build | The primitive |
| Model Shootout | Merge | `trial` with N models and one shared baseline |
| Task Replay | Merge | Snapshot + parameter pinning; asserted by the trial's identity hash |
| Before/After | Build | The evidence layer (`Check` + `Evidence`), no separate artefact |
| Failure Fingerprint | Build, capped | A grouped view of checks (≤6 kinds); no composite profile score |
| Project model profile | Defer to V2 | Aggregation over trials, with `insufficient evidence` as a first-class state |
| Personal Benchmark | Build (V1) | Versioned `EvaluationCase` set; reuses the Trial pipeline |
| Task Recorder | **KILL** | Replaced by "task from PR" (V1) and "save this trial" — no editor instrumentation |
| Regression Watch | Defer to V2 | Scheduled trial + the existing `compare` refusal/denominator discipline |
| Context Sensitivity | Build (V1) | Trial parameterised over context variants (2–3 variants, 1 model) |
| Cost-to-Quality | Build (MVP) | Metric columns; cost per *successful* task with both denominators |
| Model Swap Test | **KILL** | Identical to Shootout-with-baseline = `compare` |
| Human Evaluation | Build, minimal | One optional verdict + note per trial; never a score adjustment |
| Unknown Model Sandbox | Adopt as the flow | Renamed: "Trial". *Sandbox* is reserved for execution isolation only |

## 4. Additional features considered

| # | Feature | Problem | Differentiation | Complexity | MVP? | Risk |
|---|---|---|---|---|---|---|
| 1 | Task from a merged PR (ticket + pre-merge tree) | Realistic tasks for free | Evidence-first reporting vs leaderboards | M | V1 | Answer leakage via history → export with no `.git` ([trials §7](./trials.md)) |
| 2 | **Verifier validity gate** (fail-without / pass-with + flaky detection) | "Your tests may not detect the fix" | **Strong: nobody surfaces "we refused to score this"** | M | **MVP** | Slow, absent or flaky suites → `case_invalid` |
| 3 | Scope and risk diff lint (files outside scope, new deps, deleted/skipped tests, lockfile churn, secret-shaped strings, `eslint-disable`, TODOs) | Models "helpfully" rewrite the repo | Yes; hunk-linked, deterministic | L–M | **MVP (top 6 rules)** | False positives → always attach the hunk; label heuristic |
| 4 | Test-oracle discovery (find the command, select the related subset) | "I don't know what to run" | Moderate | M–H | V1 | Monorepos, exotic runners, networked suites |
| 5 | **Context manifest + redaction preview** | Trust and privacy; "what did it see?" | **Strong: context auditability is the new provenance** | M | **MVP** | Token estimates must be labelled estimates, never measurements |
| 6 | Hard budget with partial-report semantics | A shootout must not silently cost $40 | Moderate | L | **MVP** | Partial runs must be `failed` / `completed_with_gaps` |
| 7 | **"No measurable difference" verdict + pre-run MDE** | Small-n leaderboards lie | **Strong vs entrants printing percentages from 4 tasks** | M | **MVP** | Over-engineering → cap the statistics module |
| 8 | Control fixtures (known-good / known-bad patches) | A verifier that always passes | Yes | M | V1 | Maintenance |
| 9 | Repo-convention rules (≤5 built-ins) | "Not our way" | Moderate | L–M | V1 | Config bloat |
| 10 | Trial as a CI guard | Regressions where the work happens | Yes (workflow lock-in) | M | V2 | CI secrets and cost; local runner only |
| 11 | Provider/route pinning and identity recording | "Same name, different backend" | Yes (measurement hygiene) | L | **MVP** | Pinning reduces availability → explicit, not silent |
| 12 | Release-day "what changed for my repo" digest | Tempting content play | — | — | **KILL** | Becomes a leaderboard; [PRODUCT §7](../PRODUCT.md#7-what-modelcheck-must-not-become) forbids it |

Complexity: L ≈ low, M ≈ medium, H ≈ high.

## 5. Do not build yet

Each line is a deliberate cut with its reason. Do not reintroduce one without editing
[MVP.md](../MVP.md) and recording the decision in [docs/decisions.md](./decisions.md).

| Not building | Why |
|---|---|
| Any hosted service, account, billing, quota | [D1](./decisions.md) — and the [SECURITY §8](../SECURITY.md#8-what-changes-when-a-server-exists-stage-2-re-review-gate) gate has not been completed |
| Agentic repository exploration in the MVP | Needs a sandbox fleet and redefines the measurement; one-shot with an explicit bundle first |
| Automatic context selection as a *trusted* default | May suggest; the user confirms the manifest |
| LLM-judge composite scores | Position bias and self-preference are measured facts ([E23](./research.md#2-evidence-register)); judged evidence stays a separate tier |
| A public leaderboard, release-day rankings, scored share pages | The commodity this product exists to replace ([E1](./research.md#2-evidence-register), [E3](./research.md#2-evidence-register)) |
| Our own secrets scanner, sandbox runtime, or tokenizer | gitleaks / trufflehog / detect-secrets and container runtimes already exist ([E25](./research.md#2-evidence-register)); token counts come from the provider |
| Task Recorder / editor instrumentation | Largest privacy surface, smallest marginal gain; an OSS project already occupies session capture ([E17](./research.md#2-evidence-register)) |
| Project profiles and Regression Watch in v0 | They need accumulated, version-tagged data before they can be honest |
| Multi-repo, monorepo-aware, language-specific build intelligence | Biggest cost sink with no hypothesis attached |
| Composite capability profiles, confidence percentages, AI-written verdict prose | Opinion wearing a number ([PRODUCT §5](../PRODUCT.md#5-product-language)) |
| CI Action, badges, thresholds | A baseline must exist first (Stage 5 in [ROADMAP.md](../ROADMAP.md)) |
| Dashboards, charts, history UI, alerts, mobile or editor extensions | The report is the interface ([PRODUCT §7](../PRODUCT.md#7-what-modelcheck-must-not-become)) |
