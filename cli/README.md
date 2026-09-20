# ModelCheck CLI

**Measure what a model change does to the capability you ship — and show the evidence.**

This directory is the CLI. It loads a versioned suite of cases from disk, sends
them to a model you choose, scores every response with a declared rule, and writes
a portable `report.json` + `report.html` where every number traces back to the raw
model output and the rule that scored it. Two runs of the same suite can be
compared, and the comparison states its denominators.

> **Status.** The CLI is built (Phases 0–7 in [PHASES.md](../PHASES.md)) and its
> automated suite passes with **no network calls**. The V1 `core` suite measures
> **two capabilities**: `structured_output` (15 cases) and `tool_calling` (15
> cases). Anything else is **not tested** — which is not the same as zero
> ([D4](../docs/decisions.md)).

The product intent, scope, and rules live in the repository documents, not here:
[MVP.md](../MVP.md) is binding for scope, [EVALUATIONS.md](../EVALUATIONS.md)
owns methodology, [SECURITY.md](../SECURITY.md) owns data handling, and
[docs/benchmarks.md](../docs/benchmarks.md) describes the suite. This file is how
to install and run it.

---

## Requirements

- **Node.js ≥ 20** (uses `node:test`, `fetch`, and `node:util parseArgs`).
- **No runtime dependencies.** Only `typescript` and `@types/node` are installed,
  for the build.

## Install

```bash
npm install -g modelcheck-cli   # published on npm; puts `modelcheck` on your PATH
```

Or run it without installing globally:

```bash
npx modelcheck-cli@latest --help
```

Working from a clone of this repository:

```bash
cd cli
npm install        # builds via the prepare script
npm link           # optional: puts `modelcheck` on your PATH
```

## Provide a key — never as an argument

The key is read from an **environment variable**. It is never accepted on the
command line, because argv is visible in `ps` output and shell history
([SECURITY.md §2](../SECURITY.md)).

```bash
export ANTHROPIC_API_KEY='...'      # or OPENAI_API_KEY / OPENROUTER_API_KEY
```

`--api-key-env <name>` selects which variable to read when your key is not in the
provider's conventional variable. Passing a literal key there is rejected: the flag
expects a variable **name**.

## Run

```bash
# a full run against the 30-case core suite
modelcheck run --suite core --model anthropic/claude-sonnet-5

# a second model, labelled so the comparison reads clearly
modelcheck run --suite core --model openai/gpt-4o --label baseline
```

`run` prints the suite hash, the planned case count, a **pre-flight cost estimate**,
and the resolved target before it starts; progress and the final path go to stderr
so stdout stays scriptable.

### Model ids, gateways, and adapters

A model id is `gateway/wire-id`. The gateway prefix selects the default endpoint,
the key variable, and the adapter. The wire id is what is actually sent.

| `--model` prefix | Endpoint | Key variable | Adapter |
|---|---|---|---|
| `openai/…` | `https://api.openai.com/v1` | `OPENAI_API_KEY` | OpenAI-compatible |
| `openrouter/…` | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | OpenAI-compatible |
| `anthropic/…` | `https://api.anthropic.com/v1` | `ANTHROPIC_API_KEY` | Anthropic Messages API |
| `groq/…` | `https://api.groq.com/openai/v1` | `GROQ_API_KEY` | OpenAI-compatible |
| `xai/…` | `https://api.x.ai/v1` | `XAI_API_KEY` | OpenAI-compatible |
| `deepseek/…` | `https://api.deepseek.com` | `DEEPSEEK_API_KEY` | OpenAI-compatible |

```bash
modelcheck run --suite core --model openrouter/deepseek/deepseek-v4-flash
modelcheck run --suite core --model anthropic/claude-sonnet-5
```

- `--base-url <https-url>` targets any other OpenAI-compatible or Anthropic
  endpoint. Non-HTTPS is refused except for loopback, and the cloud metadata
  service (`169.254.169.254`) is refused outright.
- `--adapter <name>` overrides the adapter explicitly: `openai-compatible`,
  `anthropic`, or `mock`. An unknown name is an error, not a silent fallback.
- `--adapter mock` runs against recorded fixtures in `tests/fixtures/responses/`
  with **no network**. It is selected only by that explicit flag.

The Anthropic Messages API requires `max_tokens` on every request, so it always
sends one; when a case asks for the provider default, the adapter sends its
documented ceiling and the report records the value actually sent
([EVALUATIONS.md §5.4](../EVALUATIONS.md)).

### Run options

| Flag | Meaning |
|---|---|
| `--repeat <n>` | Repeat every case n times (`repeats_per_case` in the report) |
| `--concurrency <n>` | Bounded request pool (default 3) |
| `--timeout <ms>` | Per-request timeout (default 60000) |
| `--max-retries <n>` | Retries for retryable classes only (default 2) |
| `--spend-limit <usd>` | Refuse to start if the estimate exceeds this |
| `--label <label>` | Human-readable run label, also used in the run id |
| `--json` | Machine-readable output where a command supports it |

## Read the report

Each run writes to a directory `RUNS_DIR/runs/<run_id>/`:

| File | Contents |
|---|---|
| `report.json` | The reproducibility manifest: parameters, per-case records, per-capability aggregates, cost, latency, limitations |
| `report.html` | Self-contained static report rendered **only** from `report.json`. No network, no external assets; all model output is escaped as inert text |
| `raw/<case_id>.json` | The provider's response, verbatim and unredacted |

Start with `report.html`. Every case expands to its outcome, the scoring rule, and
the raw response. Capabilities with no scored cases render **"Not tested"**, never
`0` — a denominator that was never measured is not a zero.

## Compare two runs

```bash
modelcheck list
modelcheck compare <run-a-id> <run-b-id>
```

`compare` refuses to compare runs from different suite versions or content hashes,
and says why. Every delta it prints carries its denominator, so `+2 of 15` can
never be mistaken for `+2 of 30`. Differing parameters are flagged.

## Cost is an estimate — and "unpriced" is not zero

Pre-flight estimates use the dated price snapshot in
`cli/src/config/prices.json` and clearly-labelled token assumptions. Per-case and
run totals use the token counts the provider actually returned. If the model has no
price row, cost is reported as **`unpriced`** — never `0`. A run that mixed priced
and unpriced cases refuses to print a partial total rather than misstate spend
([D18](../docs/decisions.md)).

## What leaves your machine

**The suite's prompts are sent to the provider you select, as ordinary API
requests, and are subject to that provider's data policy.** This is the one place
data leaves your machine, and it is stated plainly rather than implied. There is no
ModelCheck server, no upload path, and no telemetry in the MVP.

## Where results are stored

- `RUNS_DIR` is **user-controlled**: it defaults to `~/.modelcheck/` and can be
  pointed anywhere with the `RUNS_DIR` environment variable.
- `RUNS_DIR` may contain **sensitive prompts and model outputs**. Exclude it from
  backups and never commit it.
- Mock runs write to a temporary directory instead, so an offline test never
  pollutes your run history.

## Credentials

- Credentials are never written to `report.json`, `report.html`, `index.json`, or
  any log or error message; known credential values are redacted from error output.
- The key lives in memory for the process lifetime only — no vault, no cache, no
  temp file.
- **Prefer a key scoped to evaluation use, rotate it if you ever see it in your
  shell history, and never run this with a production key that has write privileges
  it does not need.**

## Development

```bash
cd cli
npm test           # builds, then runs node:test — zero network calls
npx tsc --noEmit   # type check
npm run lint       # same as the type check for this package
```

From the repository root, `npm run lint` runs ESLint over the landing page
(`cli/` is excluded there and type-checked separately).

Tests never make a real, billable provider call
([TESTING.md §1](../TESTING.md)). The only place a live call is permitted is the
opt-in contract smoke test, which is not part of `npm test`.

## Commands at a glance

```text
modelcheck run      load a suite, plan, estimate, execute, score, aggregate, write
modelcheck compare  per-capability deltas between two local runs, with denominators
modelcheck list     local runs (run id, label, model, suite version, status)
```