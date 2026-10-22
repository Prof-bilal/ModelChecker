# Changelog

## 0.2.0

ModelCheck adds local regression testing for user-authored application cases.

- `init` creates YAML configuration, JSONL examples and local directories.
- `baseline` records complete run evidence and a reviewable `modelcheck.lock`.
- `verify` compares the configured target to that baseline with PASS/WARN/FAIL
  verdicts. FAIL exits 1; WARN exits 0 or 2 with `--strict`/`--fail-on-warn`.
- `compare --candidate provider:model` runs current and candidate configurations
  and gives HOLD, STAGED MIGRATION or MIGRATE recommendations.
- Deterministic schema, content, exact-match and tool assertions support private
  workloads; explicit custom evaluators run as trusted local scripts.
- JSONL evidence, a JSON verdict sidecar, offline replay, pinned estimated cost,
  latency and per-metric denominators support inspection and CI integration.
- Provider deadlines cover response bodies and responses are limited to 8 MiB.
- Bare model IDs use the default OpenAI endpoint; latency includes retry time.
- `--version` reports the installed CLI version.

Existing `run`, `list`, `repo` and two-run `compare` remain available. Existing
capability reports and core suite version/scoring rules are unchanged. Node.js
20 or later remains required. CLI runtime dependencies now include `yaml` and
`ajv`; no hosted component is introduced.

### Upgrade notes

Existing users can keep their current commands. Opt into the new project workflow
with `modelcheck init`; initialization refuses to overwrite an existing project.
Locks reference private baseline evidence: restore that exact evidence in CI.
Offline and live runs cannot be compared. p95 needs at least 20 scored cases;
missing price/usage information remains unavailable. Custom scripts are not
sandboxed. Model judges and retrieval/agent execution are not included.

The new commands are validated with synthetic fixtures. A measured public model
migration experiment is a separate launch deliverable, not supplied by fixtures.
