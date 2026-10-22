# ModelCheck project regression CLI v1

This is the implementation contract for the ModelCheck sections of the owner's
22 October 2026 strategy document. Scope approval is recorded in
[decisions.md](./decisions.md); [MVP.md §4](../MVP.md#4-must-have) explicitly permits
this project workflow. The shipped capability-suite commands remain available.
These commands require 0.2.0 or a corresponding source build; older package
versions do not contain them. See [release status](./releases/0.2.0.md) before
installing from npm.

## Quick start

```sh
modelcheck init --provider openai --model gpt-4o
# Set OPENAI_API_KEY in your environment; never pass a key as an argument.
# Replace modelcheck/cases/example.jsonl with your application cases.
modelcheck baseline
# Edit the model or runtime settings in modelcheck/config.yaml.
modelcheck verify
modelcheck compare --candidate anthropic:YOUR_MODEL --format json
```

`init` prompts for provider/model on an interactive terminal without flags.
`--yes`, explicit flags, or a noninteractive terminal use the displayed defaults.
It creates the YAML config, example cases, custom evaluator directory and adds
`.modelcheck/` to `.gitignore`. Existing config or example files are refused.
No lockfile exists until a complete baseline succeeds. A baseline may include
model assertion failures (the purpose of a baseline is to measure these), but
every case must execute and every evaluator must complete. Request/evaluator
errors invalidate the baseline. Replacing a baseline requires `--force`.

## Configuration

Paths are relative to the project working directory, including when `--config`
selects a different config file. Supported case patterns are literal paths,
`*` within a path segment and `**` across segments. Files are sorted and duplicate
case IDs fail validation. Symlink directories are not traversed. JSONL is read
line by line; blank lines are ignored, malformed lines report file and line.

```yaml
version: 1
target:
  provider: openai
  model: gpt-4o
  # base_url: https://your-compatible-provider.example/v1
  # api_key_env: MY_EVALUATION_KEY
runtime:
  temperature: 0
  timeout_ms: 30000
  retries: 1
  concurrency: 3
  max_output_tokens: provider_default
  # reasoning_effort: medium
  # system_prompt: Your application system prompt
  # tools: [OpenAI function-tool declarations]
suite:
  paths:
    - ./modelcheck/cases/*.jsonl
schemas:
  answer_v1:
    type: object
    required: [answer]
    additionalProperties: false
    properties:
      answer: {type: string}
thresholds:
  task_success: {warn_drop: 0.03, fail_drop: 0.08}
  schema_validity: {warn_drop: 0.01, fail_drop: 0.03}
  instruction_following: {warn_drop: 0.03, fail_drop: 0.07}
  tool_accuracy: {warn_drop: 0.03, fail_drop: 0.08}
  latency_p95: {warn_increase: 0.20, fail_increase: 0.50}
  cost: {warn_increase: 0.20, fail_increase: 0.50}
```

Provider names are `openai`, `anthropic`, `openrouter`, `groq`, `xai`, `deepseek`.
Model is the wire ID, including vendor prefixes when a gateway requires them.
Credentials use the existing provider environment variables or `api_key_env`.
Endpoint credentials, query parameters and fragments are forbidden. Existing
HTTPS, loopback and redirect protections apply. Configuration is validated with
unknown fields rejected. Runtime numeric values must be finite and bounded.
YAML aliases are bounded and duplicate keys are rejected.

The runtime records provider/model, system prompt, tools, temperature, token
limit, timeouts/retries/concurrency and optional reasoning effort. Reasoning
effort is passed explicitly to OpenAI-compatible endpoints; Anthropic rejects
that option rather than silently ignoring it. Its required output-token ceiling
is normalized to the adapter's explicit default in the hashed configuration.
Retrieval and agent configuration
may be recorded as object-valued `runtime.retrieval` and `runtime.agent` metadata.
This CLI replays the supplied messages/tools; callers must materialize retrieved
context and agent behavior in those cases. It does not run retrieval pipelines or
agent frameworks. The full normalized config is stored and hashed.

## Case and evaluator contract

Each JSONL line is one object. Cases require a unique `id`, nonempty message
array and at least one assertion. `input.tools` overrides runtime tools. Tags
are optional metadata. Message roles are system/user/assistant, content is text.

```json
{"id":"answer-001","input":{"messages":[{"role":"user","content":"Return a JSON answer mentioning confirmed"}]},"expected":{"schema":"answer_v1","must_include":["confirmed"],"must_not_include":["raw_secret"],"max_tool_calls":0},"tags":["support"]}
```

Assertions are deterministic, versioned as part of the suite hash:

- `schema`: inline JSON Schema (draft-07) or a name in `schemas`. Ajv strict validation
  checks parsed JSON without stripping fences. Unsupported/invalid schemas fail
  before requests. No remote schema fetching occurs.
- `exact`: string equality for a string expectation; otherwise parsed JSON
  structural equality, ignoring object-key ordering.
- `must_include` / `must_not_include`: case-sensitive literal substrings of the
  response text. These are explicit instruction assertions, not semantic judging.
- `max_tool_calls`: maximum normalized tool-call count.
- `tools`: ordered array of expected `{name, schema?}` calls; the exact count,
  names and optional JSON argument schemas must match.
- `custom`: array of executable basenames in `modelcheck/evaluators/custom/`.
  Each trusted local script receives `{case,response}` JSON on stdin and must
  return `{pass:boolean,reason?:string}` JSON on stdout with exit 0. No shell is
  used. Timeout equals `runtime.timeout_ms`; output is capped at 1 MiB. Common
  credential environment variables are removed. Script traversal and symlink
  escape are refused. Script bytes enter the suite hash. Scripts are user code
  with local privileges; inspect them before enabling. This is not a sandbox and
  model output is never executed as a script. Custom evaluators must themselves
  be deterministic and must not call a model judge or a provider API.

Task success means all case assertions pass. Schema validity, instruction
following and tool accuracy each aggregate only cases with that assertion family.
Custom assertions contribute to task success. Every metric has `value` and `n`;
unmeasured values are null with a reason. No cross-capability composite is added.

## Evidence, lockfile and verdicts

Runs write private local `.modelcheck/runs/<unique-id>.jsonl` files. A run header
records the normalized configuration, hashes, mode, producing `modelcheck_version`
and dated price row, followed by ordered case records (inputs, expectations,
normalized/raw response, attempts,
latency, assertions, estimated charge or null), and a terminal summary. Partial
evidence is updated during execution; a killed run lacks a terminal summary and
cannot be used as a complete baseline. Known credential values are redacted
before serialization. Keep run evidence out of commits and backups that expose
private application data. Prompts go to the selected provider during live runs.

`modelcheck.lock` is versioned YAML containing baseline time/provider/model,
config/suite/application hashes, metric values and denominators, case count,
and an evidence path plus SHA-256 digest. Baseline locks do not include raw
prompts or outputs. Verify validates the lock shape, evidence hash and complete
summary before issuing a request. Suite, schema or evaluator changes require a
new baseline. Model/runtime changes are allowed and explicitly reported through
the changed config hash. Verify never rewrites the lock.

Quality drops are absolute fractions (0.03 is three percentage points). Cost and
latency increases are relative fractions. Only values **strictly above** a
threshold breach it. Worst severity wins. FAIL exits 1; WARN exits 0, or 2 with
`--strict` / `--fail-on-warn`; PASS exits 0. Configuration, missing baseline,
request and evaluator failures produce invalid FAIL outcomes. Individual failed
cases remain visible even when the aggregate gate passes.

Latency includes attempts/backoff; p95 uses nearest rank over at least 20 scored
cases. Cost is **estimated charge in USD** from provider token usage and the
pinned dated price row included with the run. Unknown prices, missing usage or
unknown retry billing leave cost unavailable. Losing a baseline-measured metric
fails the gate. A metric unavailable in both runs is displayed without inventing
a delta; missing cost/p95 weakens migration evidence. Relative increases from a
zero baseline are undefined and fail conservatively.

Compare executes current and candidate configurations against the identical
suite. `--current provider:model` overrides the configured current target;
`--candidate provider:model` (or a single positional target) selects the candidate.
Changing providers uses that provider's default endpoint/key environment variable.
HOLD applies to FAIL or unequal task coverage. WARN or uncertain cost/p95 leads
to STAGED MIGRATION. MIGRATE requires comparable coverage, no warning and a
quality/cost/latency improvement; a tie is HOLD. These are deterministic policy
recommendations, not claims of statistical significance.

The source's `94% → 93% = WARN` example conflicts with the default warning drop.
The implementation follows the explicit threshold table. The acceptance test
sets `task_success.warn_drop: 0.005` to demonstrate the requested WARN example.
The additional tool-accuracy threshold uses the task-success defaults; this
choice fills a missing tool threshold in the source and is visible above.

## Automation and offline operation

Project commands accept `--format human|json`, `--baseline PATH`, `--output PATH`,
`--config PATH`. Human progress goes to stderr; JSON verdicts go to stdout as one
object. Output paths name new evidence files and must not already exist. Compare
stores its current run at `PATH.current.jsonl` when an output path is supplied.
Verify and compare also retain `RUN.jsonl.verdict.json` containing the policy,
hashes, metric deltas, failed IDs and recommendation; JSON stdout includes its path.
`--json` aliases `--format json`. `--spend-limit USD` checks the preflight
estimate (including possible retries) and refuses unpriced targets. This is an
estimate threshold, not a provider-enforced billing cap; token assumptions can
underestimate actual usage. Estimates and the pinned price source are displayed
before live requests.

`--offline --responses PATH` reads synthetic or captured normalized responses
without constructing a provider adapter. Exactly one response per case is
required, with no duplicate or missing IDs. Example fixture line:

```json
{"id":"answer-001","response":{"content":"{\"answer\":\"confirmed\"}","tool_calls":null,"model":"synthetic-fixture","usage":{"input_tokens":10,"output_tokens":10},"latency_ms":100,"raw":{"synthetic":true}},"latency_ms":100}
```

Offline compare also requires `--current-responses PATH`. Offline locks cannot
be used to validate live runs. Fixture results establish software behavior only;
they are not measured model performance. The default test suite uses synthetic
fixtures only and includes the 94% baseline / 82% FAIL / 93% WARN / 25% cheaper
MIGRATE scenarios as well as invalid evidence and configuration paths.

Example CI invocation (use a protected environment variable for the key):

```sh
modelcheck verify --format json --strict
```

Retain `.modelcheck/runs/` as a private CI artifact together with the JSON verdict.
Restore the exact baseline evidence referenced by the lock in a fresh CI checkout;
the CLI refuses a lock without its evidence instead of trusting unverifiable
metrics. No GitHub Action or hosted service is installed by this CLI.

## Release acceptance

Automated completion requires a packaged CLI cold-install test, init/baseline/
verify/compare fixture walkthrough, all unit/integration checks, lint and types.
A real provider smoke test, measured public migration experiment and interviews
remain separate launch validation. No fixture is presented as that evidence.
