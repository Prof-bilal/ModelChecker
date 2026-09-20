# ModelCheck — Security & Privacy

**Version:** 0.3 · **Date:** 2026-09-20
**This file owns:** threat model, secrets handling, data handling, and the MVP/future security split.
**Architecture context:** [ARCHITECTURE.md](./ARCHITECTURE.md). Scope: [MVP.md](./MVP.md).

> **Lane A (2026-09-20).** Repository trials add a new asset class — the user's repository contents — and a new execution risk: running model-generated code. The normative treatment is [SECURITY §11](#11-repository-data-and-context-bundles-new-2026-09-20); the isolation decision is [D24](./docs/decisions.md#d24--execution-requires-isolation-or-it-does-not-happen) and the no-persist-by-default decision is [D26](./docs/decisions.md#d26--context-contents-are-not-persisted-by-default). Nothing in Lane A re-introduces a server; [D1](./docs/decisions.md) still holds.

> **The MVP has no server.** That single architectural fact removes most of the
> attack surface this document would otherwise have to mitigate — but only while
> [D1](./docs/decisions.md) holds. Every Stage 2+ item below re-introduces risk and
> must be re-reviewed before it ships.

---

## 1. Threat model

### 1.1 Assets

| Asset | Sensitivity | Where it lives in the MVP |
|---|---|---|
| Provider API key | High — direct financial and account risk | Process environment only; never on disk |
| Suite case content | Low — authored in-repo, public | Repository |
| Raw model outputs | **Variable, potentially high** — once users bring their own prompts, these contain their real data | `RUNS_DIR/raw/`, local |
| `report.json` / `report.html` | Derived from the above | `RUNS_DIR/`, local |
| Price table | Low | Repository |

### 1.2 Adversaries and misuse

| # | Threat | MVP relevance | MVP mitigation |
|---|---|---|---|
| T1 | A third party reads the key from disk, logs, or CI output | Real | Key is never written, never logged, never placed in artefacts; a redaction test enforces it |
| T2 | Key leaks via shell history or `ps` | Real and common | Keys are refused as CLI arguments; environment variables only; documented |
| T3 | Malicious/generated content injected into the HTML report (XSS) | Real, because model output is untrusted | All model output is escaped and rendered as inert text. No `dangerouslySetInnerHTML`, no inline script, no remote image loading, no `eval` |
| T4 | Prompt injection causes the model to output something harmful | Low in the MVP, because nothing is executed | Output is data, never instructions. The report renderer treats it as text |
| T5 | A user-supplied `base_url` is used to make the tool send credentials somewhere hostile | Low — the user is the operator | Documented as an explicit risk; the tool never *infers* a base URL and never attaches credentials to cross-origin redirect targets |
| T6 | Malicious suite file in the repo executes code | Low | Suite files are JSON data only. There is no code path from suite content to execution |
| T7 | Generated code executed to score a coding case | **Not applicable in v1 — coding is excluded** | Would require a sandbox; see §5 |
| T8 | Prompt/output content leaks through a crash report or telemetry | Real | No telemetry is collected. Errors contain the message and class, not the payload |
| T9 | Costs racked up by an unattended run | Real | Estimate printed before scheduling; spend guard; bounded concurrency and retries |
| T10 | A shared machine's other users read `RUNS_DIR` | Real | Documented; `RUNS_DIR` is user-scoped, and file permissions are user-only by default. Full-disk encryption is the user's responsibility and the README says so |

### 1.3 Explicitly out of scope for the MVP

Denial of service, account takeover, multi-tenant isolation, insider threat,
supply-chain attack on dependencies, and regulatory compliance programmes. There
is no account, no server, and no tenancy, so these are not yet meaningful. Claiming
them would be compliance theatre.

## 2. Secrets handling

**Rules (normative, enforce in code review).**

1. Credentials are read **only** from environment variables
   (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or the variable named by
   `api_key_env` for a custom endpoint). Never from argv, never from a config
   file, never from a prompt.
2. The tool **refuses** a `--api-key` style flag. If a user passes one, the error
   explains why and names the environment variable instead.
3. Credentials are **never** written to `report.json`, `report.html`, `run.log`,
   `index.json`, or any error message. A redaction helper handles any string that
   may transit through an error path, keyed off the known credential values.
4. Credentials are **never** included in a request to a host other than the
   configured provider endpoint, and never in a redirect to a different origin.
5. Credentials are held in memory for the process lifetime only. No keychain, no
   vault, no cache, no temporary file. ([D1](./docs/decisions.md) — a key vault is
   explicitly a non-goal.)
6. A redaction test runs in the default test suite: a full run is executed against
   a mock provider with a sentinel credential value, and every artefact is asserted
   not to contain it ([TESTING.md](./TESTING.md)).

**User guidance (README, mandatory wording):** *prefer a key scoped to evaluation
use, rotate it if you ever see it in your shell history, and never run this with a
production key that has write privileges it does not need.*

## 3. Data handling and privacy

### 3.1 The MVP position, stated plainly

| Question | MVP answer |
|---|---|
| Does ModelCheck see my key? | No. There is no ModelCheck server in the MVP. The key goes from your machine to your provider |
| Does ModelCheck see my prompts? | Only the suite's own cases, on your machine. When custom suites arrive in Stage 3, they are read from your disk and never uploaded |
| Where are results stored? | `RUNS_DIR` on your machine, defaulting to `~/.modelcheck/` |
| Is anything uploaded? | No. There is no upload code path in the MVP |
| Does the provider see the suite? | **Yes.** The cases are sent to the provider as normal API requests, subject to that provider's data policy. This must be stated in the README, because it is the one place user data leaves the machine |
| Are results sent to analytics? | No telemetry exists |

**The honest caveat, which must be documented:** running an evaluation sends the
suite's prompts to the chosen provider. A user evaluating a private workload in
Stage 3 will therefore disclose that workload to whichever provider they select.
Pretending otherwise would be dishonest, and this is precisely the kind of claim
[U3](./docs/decisions.md#u3--designmd-asserts-hosted-privacy-behaviour-that-no-implementation-can-support)
already caught in the existing landing page.

### 3.2 Local storage

- `RUNS_DIR` is user-scoped and overridable by env var.
- `raw/` is stored **unredacted by design**, because a redacted raw response is no
  longer raw and the provenance promise would be broken. The mitigation is
  locality: the data never leaves the machine.
- The README must tell users that `RUNS_DIR` may contain sensitive prompts and
  outputs, and that they should exclude it from backups and commits.
- A `modelcheck wipe` command is **SHOULD, not MUST**: Stage 2 at the latest.

## 4. Network and SSRF

The MVP makes outbound requests, so the classic risk is that a user-supplied
`base_url` becomes a request-forgery primitive.

| Risk | Position |
|---|---|
| `base_url` pointing at `localhost` or a private range | **Allowed intentionally** — this is how local model servers are supported. The user is the operator, and the tool sends only the user's own request |
| `base_url` pointing at a cloud metadata endpoint (e.g. `169.254.169.254`) | **Refused.** No legitimate provider endpoint lives there, and this is the classic credential-exfiltration target |
| Non-HTTPS endpoints | Permitted only for loopback addresses. A remote plaintext endpoint requires an explicit override flag and produces a warning |
| Redirects | Followed only to the same origin. A cross-origin redirect fails the request rather than forwarding credentials |
| Credentials attached to a redirect target | **Never** |
| Response size | Bounded, so a hostile endpoint cannot exhaust memory |

## 5. Code execution (future — coding capability)

Scoring generated code by running it is the single largest security step the
product could take, and it is **excluded from v1** ([MVP §6](./MVP.md#6-explicitly-excluded-from-the-mvp)).

If it is ever built, the minimum bar — none of which may be skipped — is:

1. A separate, isolated execution service. Not a `child_process` call in the CLI.
2. One container per run, with no network, a read-only base image, a non-root user,
   and hard CPU, memory, process-count and wall-clock limits.
3. No host filesystem mounts. No access to the user's repository, credentials or home.
4. Resource exhaustion handled as a scored outcome (`timeout`, `resource_error`),
   never as a crash.
5. A stated position on what happens if generated code attempts to exfiltrate data:
   with no network, the answer must be "it cannot", not "we hope not".
6. A dedicated security review before the first external user runs it.

**This is why coding is a Stage-3 item and not a quick addition**, despite being
the most requested capability.

## 6. Logging

| Rule | Detail |
|---|---|
| Credential-free | Enforced by the redaction test (§2.6) |
| Prompt/content-free by default | `run.log` records case ids, outcomes, timing, attempt counts and error *classes*. It does not duplicate payloads, which already live in `raw/` |
| Raw payloads | Stored only in `raw/`, where their presence is expected and documented |
| Destructive output | Request/response bodies never printed to stdout in full; `--json` emits the report, not the payloads |
| Error messages | Name the object, the reason and the next step (`../design.md` §15): "Provider rejected the API key (401). Check the key or use a different one." |

## 7. Retention and deletion

| Item | MVP rule |
|---|---|
| Default retention | Indefinite, locally, under the user's control |
| Deletion | The user deletes the directory. There is no server-side copy, so there is nothing else to delete |
| `modelcheck wipe` | SHOULD (Stage 2) |
| Expiry | Not applicable while storage is local and unbounded is the user's choice |
| Retention claims in marketing | **Forbidden** until a hosted service exists. The current landing page's privacy copy must be corrected at Stage 2 ([U3](./docs/decisions.md#u3--designmd-asserts-hosted-privacy-behaviour-that-no-implementation-can-support)) |

## 8. What changes when a server exists (Stage 2 re-review gate)

**No Stage 2 feature may ship until this section has been completed and reviewed.**
Introducing a server converts the MVP's "no server, no problem" position into a
real data-processing obligation.

| New obligation | Required before launch |
|---|---|
| Key handling in transit and at rest | Short-lived, per-job credentials; encrypted; deleted at job termination, not at "some point"; no key in any log line, ever |
| Tenant isolation | A user can never read another user's run, report, or share link |
| Share links | Immutable snapshot, unguessable id, explicit revocation, redaction preview before upload, and no credential or endpoint secret in the shared artefact |
| Retention policy | Written, published, enforced by code, and stated in the product — not just a policy page |
| Deletion | A real delete path, including cached copies and derived aggregates |
| Abuse controls | Rate limits, spend limits, and a bound on concurrent jobs per user |
| Incident response | Who is told, how fast, and how a leak is detected |

Until every row above is satisfied, the product's privacy story is the CLI's, and
the website must say only what the CLI actually does.

## 9. Is privacy a real differentiator?

**Assessment: yes for the wedge, no as a standalone business.**

- **For the wedge — yes.** The adoption blocker for an evaluation tool is
  "I am not uploading my prompts to another startup". A tool that never receives
  the key or the data removes that objection entirely, and it is the honest
  byproduct of the local-first [D1](./docs/decisions.md) decision. This is a
  *reason to try*, and reasons to try are what a wedge needs.
- **As a standalone business — no.** "Privacy" is not a budget line for a
  5–50 person startup, and competitors can adopt the same posture (Langfuse is
  self-hostable — [E6](./docs/research.md#2-evidence-register)). It is a
  positioning advantage, not a moat.
- **Never claim what is not true.** The suite's prompts do go to the model
  provider. Any privacy claim that ignores this is the exact failure mode [U3](./docs/decisions.md#u3--designmd-asserts-hosted-privacy-behaviour-that-no-implementation-can-support)
  documents.

## 10. MVP vs future hardening — the split

| Control | MVP | Stage 2+ |
|---|---|---|
| Credential storage | Env var, memory only | Short-lived encrypted job credentials, deleted at termination |
| Redaction | Enforced by test | Enforced by test, plus server-side scrubbing on ingest |
| Report rendering | Escaped, inert text | Same, plus sanitisation of any uploaded artefact |
| Network egress | Provider endpoint only | Allow-listed egress from the worker |
| Code execution | None | Sandboxed container service (§5) |
| Tenancy | Not applicable | Isolation verified by test |
| Retention | Local, user-controlled | Published policy, code-enforced |
| Capacity limits | Concurrency, retries, spend guard | Per-user quotas and rate limits |
| Audit | `run.log` | Per-job audit record |
| Compliance programmes | **None claimed** | Only after a real obligation exists |
| SSO / SCIM / RBAC | Not applicable | Stage 4, only if a buyer requires it |

**Rule:** no compliance badge, no security claim, and no privacy promise may appear
in the product or its marketing until an artefact exists that makes it true.
## 11. Repository data and context bundles (Lane A, new 2026-09-20)

Normative for repository trials. Specified in [docs/trials.md](./docs/trials.md)
(secrets scanning, leakage guards, manifest); decided in [D24](./docs/decisions.md#d24--execution-requires-isolation-or-it-does-not-happen),
[D26](./docs/decisions.md#d26--context-contents-are-not-persisted-by-default) and
[D27](./docs/decisions.md#d27--judge-output-is-a-separate-tier-with-bias-controls).

### 11.1 New assets

| Asset | Sensitivity | Where it lives |
|---|---|---|
| Context bundle (source files, task files, snapshot tree) | **High** — the user's real source code | Temp dir during the run; **deleted** unless `--persist-context` |
| Bundle manifest + hashes | Low — metadata only | Run directory, always retained |
| Model-produced patch / diff | Variable — derived from user code and prompts | Run directory as part of the trial record |
| Test-command execution log | Variable — may echo file paths | Run directory, redaction applies |

### 11.2 Rules (all mandatory)

1. **Secrets are scanned before the bundle is built.** A bundled file that trips the
   scanner ([E25](./docs/research.md#2-evidence-register) — gitleaks, trufflehog,
   detect-secrets are commodity tooling) is redacted, excluded, or fails the trial —
   never sent to the provider. The scanner result is recorded in the manifest.
2. **No `.git`, no gold patch, no hidden tests** ever enter the context bundle for
   history-derived tasks ([E13](./docs/research.md#2-evidence-register) — memorisation
   makes contaminated tasks worthless). Violations are `case_invalid`, not warnings.
3. **Contents are not persisted by default** ([D26](./docs/decisions.md#d26--context-contents-are-not-persisted-by-default)):
   manifests and hashes are retained, file contents require an explicit opt-in flag
   recorded in the report.
4. **Execution requires a container** ([D24](./docs/decisions.md#d24--execution-requires-isolation-or-it-does-not-happen)).
   Host execution is an explicit, labelled opt-in (`isolation: none`); absent both,
   the trial is `not_executed` and may not be presented as a correctness result.
5. **Network egress from the container is restricted** to the provider endpoint used
   for the model request, consistent with §4's allow-list principle.
6. **Provider routing must honour zero data retention where offered**
   ([E21](./docs/research.md#2-evidence-register) — `zdr: true`); the route used is part
   of the trial identity and is disclosed in the report.

### 11.3 Residual risk, stated plainly

A model request still sends the user's code (or a derived bundle) to a third-party
provider. This is the same truth §9 records for prompts, and no Lane A wording may
claim otherwise ([U3](./docs/decisions.md#u3--designmd-asserts-hosted-privacy-behaviour-that-no-implementation-can-support)).
