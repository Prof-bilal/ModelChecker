# Repository model recommendation audit

**Date:** 2026-09-29  
**Scope:** `modelcheck repo <project-repo> [<model-name> <provider-name>]`

## 1. What already exists

- A dependency-free Node.js/TypeScript CLI with one shared `node:util.parseArgs`
  parser and the commands `run`, `compare`, and `list`.
- A single model-id convention: `gateway/wire-id`. For example,
  `openrouter/deepseek/deepseek-v4-flash` selects the OpenRouter gateway and
  sends `deepseek/deepseek-v4-flash` on the wire.
- Provider selection and API-key environment defaults for OpenAI, Anthropic,
  OpenRouter, Groq, xAI, and DeepSeek. OpenAI-compatible providers share one
  adapter; Anthropic has its own Messages API adapter.
- A fixed, versioned `core@1.0.0` evaluation suite covering structured output
  and tool calling, with deterministic scorers, bounded execution, cost and
  latency accounting, and evidence-bearing JSON/HTML reports.
- A dated price table and local run index/report store. Completed reports retain
  per-capability denominators and can be reused as local evidence.
- Repository-trial architecture, security, and methodology documents. These
  explicitly require static-safe context handling, honest limitations, and no
  execution without isolation.

## 2. What partially exists

- The repository-trial design defines context manifests, exclusions, hashes,
  secret handling, and evidence vocabulary, but is marked **designed, not
  built**.
- The existing evaluation engine can evaluate a supplied model/provider on the
  fixed suite. It can be reused as supporting evidence, but it is not a coding
  trial and does not measure repository reasoning.
- Local reports provide real ModelCheck evidence for previously evaluated
  models. They do not justify a universal ranking or a cross-capability composite
  score.
- Provider/model validation is currently structural and configuration-based.
  Model existence is ultimately validated by the provider; the CLI deliberately
  supports unpriced models instead of treating the price table as an allow-list.

## 3. What is completely missing

- A `repo` CLI command and its positional argument contract.
- Static repository scanning and a structured repository profile.
- Language, framework, package-manager, database, test, CI, size, and
  architecture-signal detection.
- Repository-specific ignore, secret-exclusion, file-size, and file-count
  boundaries.
- Evidence-based candidate selection and recommendation output.
- An explicit model/provider repository assessment flow.
- Help text and tests for the new command.

## 4. Relevant existing files

- `cli/src/index.ts` — command dispatch and exit codes.
- `cli/src/lib/args.ts` — the one CLI parser and usage text.
- `cli/src/commands/run.ts` — model-id resolution, provider selection, and the
  existing evaluation orchestration.
- `cli/src/engine/*` — planning, execution, scoring, aggregation, and estimates.
- `cli/src/adapters/*` — OpenAI-compatible, Anthropic, and offline mock adapters.
- `cli/src/types.ts` and `cli/src/report/*` — canonical run/report structures.
- `cli/src/lib/runs.ts` — local report index and storage paths.
- `cli/src/config/prices.json` — dated gateway/model price evidence.
- `docs/trials.md`, `SECURITY.md §11`, and decisions D21–D27 — repository-data
  and honesty constraints.

## 5. Existing APIs/components to reuse

- Extend `parseCliArgs`; do not add another parser or executable.
- Reuse `resolveModel`, provider endpoints, API-key conventions, adapters, and
  `runCommand` for an explicitly requested evaluation.
- Reuse the fixed suite and its existing reports as supporting evidence only.
- Reuse `Report` and the local run directory when reading prior evaluation
  evidence.
- Reuse the price table for cost evidence; an absent price remains `unpriced`.

## 6. Potential conflicts with the current MVP

- Lane B forbids claiming coding, reasoning, or long-context results from the
  fixed suite. A repository recommendation must state that those properties are
  inferred requirements, not measured capabilities.
- Decisions D22 and D25 forbid presenting a model as universally best or forcing
  a winner when evidence is insufficient.
- EVALUATIONS forbids a composite aggregate across capabilities. Recommendation
  logic therefore cannot average structured-output and tool-calling scores into
  a synthetic quality number.
- Running repository code, installing dependencies, or invoking repository
  scripts would cross the D24 isolation boundary and is outside this command.
- The example `anthropic/claude-sonnet-4.5 openrouter` separates a wire model id
  from its gateway. It must normalize to the existing convention
  `openrouter/anthropic/claude-sonnet-4.5`, not create a second naming system.

## 7. Minimal implementation required

1. Add `repo` to the existing parser with exactly one positional (analysis) or
   three positionals (analysis plus explicit model/provider).
2. Add a bounded, deterministic, read-only scanner using Node built-ins. Respect
   root `.gitignore`, common generated/vendor directories, sensitive file names,
   binary/oversized files, and deterministic ordering. Never execute the target.
3. Produce a structured profile with detected technologies and explicit scan
   limits/exclusions.
4. For repository-only mode, use compatible completed local ModelCheck reports
   as evidence. Recommend a model only when the evidence supports an unambiguous
   conclusion; otherwise return the honest recommendation to evaluate candidates.
5. For explicit mode, normalize the model/provider into the existing gateway
   convention, run the existing fixed suite, and report results by capability.
   Clearly state that repository coding fit remains not tested.
6. Add human-readable and JSON output plus tests for scanning, exclusions,
   argument parsing, validation, recommendation evidence, and the offline
   explicit flow.

## Non-goals for this implementation

- No source upload or LLM-generated repository summary.
- No package installation, build, test, shell, or arbitrary code execution.
- No model leaderboard, capability composite score, or fabricated benchmark.
- No new provider abstraction, report schema, database, service, or dependency.
