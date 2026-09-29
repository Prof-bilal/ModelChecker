# Repo-aware benchmarking audit

Date: 2026-09-29

## Conclusion

Status before implementation: **PARTIAL**.

The repository had a real `repo` command, but it did not perform repo-aware model
benchmarking end to end. `web/cli/src/repo/scanner.ts` could inspect a local tree
without executing it, and `web/cli/src/repo/recommend.ts` could select among
comparable local reports. However, `web/cli/src/commands/repo.ts` always delegated
an explicit model evaluation to the generic `core@1.0.0` suite. That suite contains
only structured-output and tool-calling cases. No repository files or repository
profile were included in model requests, and the recommendation code explicitly
reported coding/repository reasoning as not tested.

This means the old flow stopped at:

```text
Repository → static profile → generic model run / generic local-report recommendation
```

It did not establish:

```text
Repository → repository context → repository-specific cases → model evidence
```

## Capability audit before the change

| Capability | Result | Evidence |
|---|---|---|
| Accept a repository/project | YES | `commands/repo.ts` accepts a local path. |
| Inspect repository structure | YES | `repo/scanner.ts` performs bounded recursive metadata scanning. |
| Detect language/framework/stack | PARTIAL | Extension, manifest, and dependency heuristics exist; broad framework and stack inference is limited. |
| Understand what the repository does | NO | No model request receives repository context; no semantic project-purpose analysis exists. |
| Identify important workloads | NO | `recommend.ts` infers only generic workload signals such as size, tests, and frameworks. |
| Generate/select repository-specific tests | NO | `repo.ts` delegates to fixed `core@1.0.0`; no dynamic suite existed. |
| Run repository-specific tests against a model | NO | `run.ts` ran fixed suite cases only. |
| Score repository-specific results | NO | Existing scorers were applied only to the generic suite. |
| Compare multiple models for this repository | PARTIAL | `recommend.ts` compares comparable local reports, but those reports were not repo-specific. |
| Determine repo-specific suitability | NO | The command itself warned that repository coding and multi-file reasoning were not tested. |
| Produce evidence explaining the result | PARTIAL | Generic reports preserve raw responses, scores, latency, cost, and errors; they lacked repository context and repo-task evidence. |

## Real repository and baseline measurement

Repository tested: `/home/abdullah/Music/ModelChecker` (the existing project, not a
toy fixture). The pre-change scanner reported 182 scanned files, 103 source files,
approximately 10,455 lines, TypeScript/HTML/CSS/Shell, npm, tests present, no CI,
and multi-file reasoning signals.

The existing local provider run was:

```text
Model: openrouter/poolside/laguna-s-2.1:free
Provider: openrouter
Suite: core@1.0.0
Planned: 30
Status: completed_with_gaps
structured_output: 11 scored, 0 pass, 11 fail, 4 request errors
tool_calling: 9 scored, 6 pass, 1 partial, 2 fail, 6 request errors
Latency: p50 1034 ms, p95 1630 ms, n=20
Cost: unpriced
```

This is genuine provider evidence stored in the local report at
`~/.modelcheck/runs/run-20260919T173913-openrouter-poolside-laguna-s-2.1-free/report.json`.
It is useful evidence about the generic suite, not evidence about this repository.

## Implementation

The smallest missing production capability was repository-specific case generation
and context injection. The change adds:

- `web/cli/src/repo/benchmark.ts`: builds a deterministic 10-case suite from the
  scanned repository profile and a bounded local context bundle. It excludes common
  generated/vendor directories and sensitive filenames, reads no scripts, and uses
  exact JSON-schema facts for deterministic scoring.
- `web/cli/src/engine/suite-loader.ts`: validates an in-memory generated suite with
  the same rules and hashing as file-backed suites.
- `web/cli/src/commands/run.ts`: accepts the generated suite through the existing
  execution, scoring, aggregation, and report pipeline.
- `web/cli/src/commands/repo.ts`: explicit model/provider evaluations now run the
  `repository@1.0.0` suite while retaining the existing CLI shape and reporting the
  context paths and case count.
- `web/cli/src/repo/benchmark.test.ts`: verifies deterministic case creation and
  that sensitive files are excluded.

The suite has 10 cases covering repository understanding, architecture
understanding, dependency understanding, and code navigation. It records the normal
ModelCheck case-level outcomes, raw responses, latency, attempts, token usage, cost
state, category aggregates, and report artefacts.

## Post-change validation

The generated path was executed against the same repository with the same model name
and the offline mock adapter because no provider API keys are present in the current
environment. The run proved the new end-to-end plumbing:

```text
Suite: repository@1.0.0
Cases planned: 10
Context paths: bounded and reported in the command result
Report: generated report.json and report.html
Status: completed_with_gaps
Results: 10 request errors, 0 scored
Reason: the mock adapter has no repository-case fixtures
```

This is intentionally not presented as a model-quality result. A real post-change
provider rerun is unavailable until a key is supplied; the baseline provider run
above must not be silently compared with the new suite because their case hashes and
denominators differ.

## Before vs after

| Stage | Before | After |
|---|---|---|
| Repository analysis | PASS: static profile | PASS: same scanner, now used to build benchmark facts |
| Workload/context selection | FAIL: only generic signals | PASS: bounded context paths and profile facts are selected |
| Benchmark generation | FAIL: fixed generic suite only | PASS: 10 repository-specific cases, hashed as `repository@1.0.0` |
| Model execution | PASS: generic provider execution | PASS: generated suite enters existing adapter/executor; real provider rerun pending credentials |
| Scoring | PASS for generic cases | PASS in design and pipeline via exact JSON Schema; no scored post-change provider responses yet |
| Comparison | PARTIAL: generic local reports only | PARTIAL: comparable repository suite hashes can now be selected, but two real repo runs are still required |
| Recommendation | FAIL for repo suitability | PARTIAL: recommendation remains evidence-qualified and refuses a winner without comparable repo-specific reports |
| Report generation | PASS for generic report | PASS: repository suite report and HTML were generated in the mock run |

## Final end-to-end status

```text
Repository                         PASS
→ Analysis                         PASS
→ Workload/context selection       PASS
→ Benchmark generation/selection   PASS
→ Model execution                  PARTIAL (provider rerun pending credentials)
→ Scoring                          PARTIAL (pipeline works; no post-change model output)
→ Comparison                       PARTIAL (needs ≥2 comparable repo runs)
→ Repository recommendation        PARTIAL (will refuse unsupported winner)
→ Report                           PASS
```

## Remaining limitations

The implementation is a focused MVP, not a full coding trial system. It does not
generate implementation patches, run model-authored code, trace arbitrary feature
flows, discover a test command, execute repository tests, or use a semantic judge.
The current deterministic cases primarily verify repository facts and bounded
navigation context. A real developer still needs a provider rerun and at least two
models on the same generated suite before a suitability recommendation is defensible.
The existing scanner also remains heuristic and does not understand project purpose
as deeply as a human or agentic repository exploration would.
