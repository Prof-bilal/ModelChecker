# ModelCheck Decision Log

**Status:** living · **Created:** 2026-09-18
**Purpose:** record decisions that constrain future work, and flag contradictions we have *not* resolved.

**Rules:** meaningful decisions only — trivial choices are not logged. Contradictions are **never silently resolved**; they are either resolved here with cited evidence, or listed in [§3](#3-unresolved-contradictions-must-not-be-silently-fixed) as open.

Format: Decision · Date · Context · Options · Decision · Reason · Tradeoffs · Revisit when.

---

## D1 — MVP is a local CLI, not a hosted web run flow

- **Date:** 2026-09-18
- **Context:** `../design.md` §7 chose a report-first **web** product with server workers executing runs (§9). That requires hosted key handling, job storage, accounts, quotas and billing before a single measurement exists.
- **Options:** (a) hosted web run flow as specified; (b) local CLI producing a portable report artefact; (c) both at once.
- **Decision:** (b). The MVP is a local-first command-line runner producing a versioned JSON report plus a static HTML report.
- **Reason:** it removes secrets storage, auth, scheduling and payment from the critical path; it fits the 3–7 day budget in [MVP.md](../MVP.md); and it produces the artefact that Stage 5 CI needs. The provider key never leaves the user's machine, converting a security liability into a selling point.
- **Tradeoffs:** no shareable hosted URL in v1, so the strongest distribution loop is deferred. Web onboarding is postponed, not rejected.
- **Revisit when:** ≥10 distinct users have run the CLI at least twice. Then build hosted execution and the share link.

## D2 — The product is a decision artefact, not a benchmark suite

- **Date:** 2026-09-18
- **Context:** [research I2](./research.md#3-interpretation-of-the-evidence) — a ModelCheck-authored fixed suite *is* a benchmark, and benchmarks are the commodity this product exists to replace. `../design.md` §1 already says "the product is a report, not a dashboard full of scores".
- **Options:** (a) publish ModelCheck's own capability suite as the front door; (b) treat any suite — including the user's — as a plug-in input, and make *the delta against a pinned baseline* the product.
- **Decision:** (b). V1 ships one small, versioned, opinionated default suite so a first run is possible on day one, but the unit of value is the **delta against a saved baseline for a named capability**, not the suite's score.
- **Reason:** it is the only framing that survives E3/E5 (free frameworks already run suites), and it produces a durable object the user owns.
- **Tradeoffs:** a delta needs two runs, so first-run value is lower than a single score. Mitigated by letting the first run *create* the baseline.
- **Revisit when:** users report they run the suite once and never compare.

## D3 — V1 scoring is deterministic only

- **Date:** 2026-09-18
- **Context:** LLM-as-a-judge is convenient, but its reliability is contested and it adds cost, latency and a second model dependency. `../design.md` §10 forbids presenting a rubric mean as accuracy.
- **Options:** (a) ship a judge for everything; (b) deterministic checks only in v1; (c) both from the start.
- **Decision:** (b). V1 capabilities are **structured output** (JSON Schema validation) and **tool calling** (chosen-tool and argument validation). Both are checkable without a model.
- **Reason:** a deterministic result is a fact, not a judgment, which makes the trust claim in [EVALUATIONS.md](../EVALUATIONS.md) honest and cheap to defend. It also keeps a 20-case suite affordable for a user paying their own provider bill.
- **Tradeoffs:** the suite excludes coding, reasoning quality and open-ended tasks — possibly the capabilities users care about most. Judge-based scoring is therefore the highest-priority Stage 3 item and must be labelled *model-judged* wherever it appears.
- **Revisit when:** a majority of interviewed users say the two deterministic capabilities do not describe their workload.

## D4 — Capability coverage is reported as pass/fail/not-tested, never as a zero

- **Date:** 2026-09-18
- **Context:** `../design.md` §10 requires "unsupported/unimplemented groups say **Not tested**, not zero."
- **Decision:** Adopted as a hard product invariant, enforced in the report renderer and fixed in the terminology of [EVALUATIONS.md](../EVALUATIONS.md).
- **Reason:** collapsing "not measured" into "0" is the single most common way an evaluation product becomes misleading.
- **Tradeoffs:** reports look emptier than a competitor's full-grid scorecard. That is intended.
- **Revisit when:** never — this is a principle, not a tactic.

## D5 — No invented numbers anywhere in this repository

- **Date:** 2026-09-18
- **Context:** ModelCheck has produced zero measurements, yet its landing page already displays capability percentages.
- **Decision:** the existing illustrative figures may be shown **only** with the existing "Illustrative—not measured model performance" note. No new figures may be added anywhere — docs, tests, fixtures — unless produced by a real run or clearly labelled synthetic inside a test fixture.
- **Reason:** the product's entire claim is trustworthiness; a fabricated number in its own documentation destroys that claim.
- **Tradeoffs:** none worth considering.
- **Revisit when:** never — this is a principle.

---

## 1. Repository-scoped decisions

## D6 — All product documentation lives inside the `web/` git repository

- **Date:** 2026-09-18
- **Context:** The workspace root `/home/abdullah/Music/ModelChecker` is **not** a git repository; only `/home/abdullah/Music/ModelChecker/web` is (`git log` → a single commit, `8e1df2e` "Initial commit from Create Next App"). `../design.md`, `../fetch.sh`, `../fetched/` and `../.codeatlas/evidence/` sit outside version control.
- **Options:** (a) document at the parent workspace; (b) document inside `web/`; (c) initialise a new repository at the parent.
- **Decision:** (b).
- **Reason:** coded agents and CI operate inside the git repository. Documentation outside version control cannot be reviewed, diffed, or relied upon.
- **Tradeoffs:** existing inputs at the parent are referenced rather than owned, and relative links from `web/` into the parent are fragile. Recorded as open contradiction [U1](#u1--designmd-and-the-source-evidence-live-outside-version-control).
- **Revisit when:** the CLI outgrows the Next.js app and a workspace split is warranted.

---

## 2. Decisions inherited from the existing design contract

Decided before this research pass and **retained**, with the evidence that supports them.

| ID | Inherited decision (`../design.md`) | Status | Supporting evidence |
|---|---|---|---|
| D7 | Report-first, not dashboard-first (§7 option B) | Retained | [research I3](./research.md#3-interpretation-of-the-evidence): the artefact is the differentiator. |
| D8 | Findings must link to measurements, which link to raw cases (§1) | Retained, **promoted** | Now a product principle in [PRODUCT.md](../PRODUCT.md). |
| D9 | Cost, latency and completion stay separate from answer quality (§1) | Retained | E7: competitors conflate these. |
| D10 | No universal intelligence score; no winner declaration (§1, §21) | Retained | E1: aggregate rankings are the contested object. |
| D11 | Numeric precision must match methodological support (§10) | Retained | Encoded as a reporting rule in [EVALUATIONS.md](../EVALUATIONS.md). |
| D12 | Confidence intervals shown only when their assumptions hold (§10) | Retained | Wilson intervals for binary case metrics only. |

---

## 3. Decisions taken while implementing (2026-09-18, owner walkthrough)

## D13 — Hero dot field spans the full hero and reacts to the pointer

- **Date:** 2026-09-18
- **Context:** the owner asked for a dark hero covered edge-to-edge in dots with a mouse-hover "animation style type thing" (see `components/Hero.tsx`, `components/DotField.tsx`). PRODUCT §4 and design.md §13 forbid decorative motion on instrument surfaces, but the hero is a marketing surface, not an instrument — its job is to set the tone before any measurement is shown.
- **Options:** (a) keep the static once-painted field; (b) an always-on animated wave/autonomous particle drift; (c) a pointer-driven field: fully static at rest, dots near the cursor brighten and grow, then ease back when it leaves.
- **Decision:** (c). `DotField.tsx` measures the whole hero `<section>`, runs no loop at rest, and only schedules animation frames while pointer energy is live. No autonomous motion ever runs. `prefers-reduced-motion` renders one static frame with no listeners.
- **Reason:** it honours the owner's explicit hover request while staying as close to the motion ban as a hover effect can get — the page is inert unless the visitor moves their pointer. Canvas keeps ~3k dots out of the DOM (contrast with the SVG-node cost cited in `DotField.tsx`).
- **Tradeoffs:** pointer tracking is still decorative motion, so instrument surfaces (report, run, compare) keep design.md §13 unchanged. Touch devices see the static field only; the `data-dotfield="painted"` CSS fallback keeps the dots present with no JS.
- **Revisit when:** anyone proposes the same treatment on an instrument surface, or a performance complaint lands against the hero canvas.

## D14 — The CLI bin targets compiled JavaScript

- **Date:** 2026-09-18
- **Context:** Phase 0 originally specified `bin.modelcheck` as `src/index.ts` while also requiring Node `>=20` and plain `npm link`. Node 20 cannot execute TypeScript source directly.
- **Options:** (a) point the bin at TypeScript and require a runtime loader; (b) raise the Node floor to a release with native type stripping; (c) compile with the existing TypeScript toolchain and point the bin at `dist/index.js`.
- **Decision:** (c). `prepare` builds the CLI before npm links or installs it, and the bin targets `dist/index.js`.
- **Reason:** it preserves Node 20 support, adds no runtime dependency, and makes the documented `npm link` verification work.
- **Tradeoffs:** contributors must build after source changes outside npm's install/link lifecycle; generated `dist/` output remains uncommitted.
- **Revisit when:** the minimum supported Node release can execute the project's TypeScript syntax without an experimental loader.

## D15 — Price-table snapshot format, lookup key, and estimation assumptions

- **Date:** 2026-09-19
- **Context:** Phase 1 requires a cost estimate printed before any request ([MVP §4.4](../MVP.md#44-execution-behaviour)), but no price had ever been verified in this repository — [research.md](./research.md) deliberately contains none and [ROADMAP](../ROADMAP.md) defers competitor pricing. AGENTS.md Hard Rule 1 forbids inventing a price. Keying, provider attribution and token assumptions were all unspecified.
- **Options:** (a) hardcode prices in code; (b) dated JSON table keyed by `provider/model` with a per-entry `source` URL, priced from primary provider pages only; token assumptions of ~1k input / ~500 output per request for estimation; unpriced models stay unpriced; (c) fetch live prices from a provider API at run time.
- **Decision:** (b). The table lives at `cli/src/config/prices.json` with `input_per_1k`, `output_per_1k`, `currency: "USD"`, `date`, `source` per entry. Rows are added only from the provider's own published pricing, with the URL in `source`. The `--model` flag carries the provider prefix (`openai/gpt-4o`); a bare id is looked up as an OpenAI model. Estimates assume ~1,000 input / ~500 output tokens per request and are labelled "Estimated charge (not actual cost)" per [EVALUATIONS.md §8.1](../EVALUATIONS.md#8-cost-and-latency-measurement).
- **Reason:** a committed, dated, sourced snapshot is reviewable and reproducible (EVALUATIONS §9), adds no dependency or network call, and keeps the unpriced invariant honest. Live price APIs would add a second network surface and a supply-chain dependency for a number that is only ever an estimate. Bare model ids (no `provider/` prefix) resolve via a `provider_prefixes` map in the table itself (e.g. `"claude-" → "anthropic"`), then fall back to `openai/<id>`; the mapping lives in the reviewable table rather than hardcoded, and an unrecognised id stays unpriced rather than being mispriced under the wrong provider.
- **Tradeoffs:** the table goes stale and must be updated by hand; the token assumptions are crude. Both are mitigated by printing the assumptions and the source next to every estimate. Seeded 2026-09-19 with gpt-4o and gpt-4o-mini (verified via developers.openai.com), the current Anthropic lineup — claude-fable-5-1, claude-opus-5, claude-sonnet-5, claude-haiku-4-5 (verified via platform.claude.com Models overview; API id strings confirmed against Model IDs and versioning) — and openrouter/unbiased-pareto (Pareto by Unbiased, verified via unbiased.ai/pricing and cross-checked against OpenRouter's endpoints API; the same model was served anonymously as the stealth id `stealth/union-alpha`, whose endpoints list is now empty). Expanded 2026-09-19 to a core-coding set per gateway: OpenCode Zen (opencode.ai/docs/zen), Command Code (commandcode.ai/docs/resources/pricing-limits), and OpenRouter (verified live via openrouter.ai/api/v1/models). Rows are **per gateway**, not per model: gateways price the same model differently (observed: GLM 5.3 Flash $0.15/$0.50 on Zen and Command Code vs $0.09/$0.30 on OpenRouter), so an estimate must reflect the gateway targeted. Gateway-exclusive features are not modelled (Command Code off-peak/peak DeepSeek rates recorded at off-peak with the peak in the source; promo discounts recorded at regular rates). Free gateway promotions are included as explicit zero-priced rows flagged `free_promo: true` (owner decision 2026-09-19) — the estimate output states the promotion can end without notice; a promo zero is not the same as a missing price, which remains `unpriced`. OpenRouter rows exclude the 5.5% credit-purchase fee, which is a billing surcharge, not a token rate. The table carries no claim of completeness (~120 of the 500+ models on OpenRouter alone); unlisted models stay unpriced until a sourced row exists. A stealth model's price is only ever provisional — the anonymous operator can reprice without notice.
- **Revisit when:** a run records real token counts (Phase 2+), which replaces the assumptions in post-run cost maths; or a provider's published pricing becomes machine-readable.

## D16 — Run flags name the execution target; keys arrive only via env var

- **Date:** 2026-09-19
- **Context:** Phase 1's run command needs to state *where* a run would execute before adapters exist (Phase 2), and users routing through aggregators such as OpenRouter need a non-default endpoint. Reading a key from argv is forbidden ([SECURITY.md](../SECURITY.md): argv is visible in `ps` and shell history).
- **Options:** (a) wait for Phase 2; (b) add `--base-url` and `--api-key-env` now: the endpoint URL and the *name* of the env var holding the key, with per-provider defaults (openai, anthropic, openrouter); (c) accept the key itself as a flag.
- **Decision:** (b). `--base-url` must be an HTTP(S) URL; `--api-key-env` must match an environment-variable name pattern. Both are validated before any suite load. The run output prints the resolved target base URL, the model id, and the key variable's *name* with only its set/unset status — never the value. Defaults come from the provider prefix of `--model` (D15 convention): `openai/…` → `https://api.openai.com/v1` + `OPENAI_API_KEY`, `anthropic/…` → `https://api.anthropic.com/v1` + `ANTHROPIC_API_KEY`, `openrouter/…` → `https://openrouter.ai/api/v1` + `OPENROUTER_API_KEY`.
- **Reason:** the flags are part of the documented run surface ([MVP §4.1](../MVP.md#41-commands)), cost nothing before execution exists, and make the endpoint+key contract visible and testable ahead of Phase 2. Rejecting an argv-shaped key (`--api-key-env sk-…`) with an explanatory error turns a security rule into user education at the exact moment of mistake.
- **Tradeoffs:** a provider prefix with no default (a future provider) errors at execution time rather than silently falling back; the set/unset probe reads `process.env` at plan time, before Phase 2's adapter would re-check it.
- **Revisit when:** Phase 2 adapters consume these values; a fourth provider needs a default endpoint.
## 4. Unresolved contradictions (must not be silently fixed)

### U1 — `design.md` and the source evidence live outside version control

`../design.md` is the most detailed product artefact in the project and git does not track it. Every document in `web/` that cites it uses a link escaping the repository.
**Owner:** unassigned. **Options:** move it to `web/docs/design.md`; or initialise a repository at the workspace root. **Blocked on:** a human decision about repository layout, deliberately not taken unilaterally during a research task.

### U2 — The landing page advertises a CLI package that does not exist

**Observed:** `components/InstallBar.tsx` renders `npm install -g modelcheck-cli` with a "Coming soon" badge, and `components/Hero.tsx` mounts it as a prominent hero element.
**Observed:** `https://registry.npmjs.org/modelcheck-cli` returns HTTP 404 (2026-09-18) and no CLI exists in this repository.
**Observed:** `../design.md` §8 states "CLI promotion waits until CLI exists", and §21 lists "no CLI in v1".

This is a three-way contradiction between the design contract, the npm registry, and shipped markup. It is also the class of unverifiable claim that [D5](#d5--no-invented-numbers-anywhere-in-this-repository) forbids.

**Recommended resolution (not applied):** remove `InstallBar` from `Hero.tsx`, or replace the command with a clearly non-executable "CLI — not yet built" statement plus a waitlist link.
**Owner:** unassigned. **Not fixed here** because this task is scoped to research and documentation; the change is a product decision, not a documentation edit.

### U3 — `design.md` asserts hosted privacy behaviour that no implementation can support

**Observed:** `../design.md` §9 proposes "server workers execute runs" with keys passing through ModelCheck; §21 excludes accounts and billing. `components/Faq.tsx` states "Your key is sent over TLS to execute the run".
**Observed:** no server, route handler, or database exists — `app/` contains only `layout.tsx`, `page.tsx`, `globals.css`, and the `/run` stub.

The site describes a hosted execution architecture that is neither built nor scheduled. Under [D1](#d1--mvp-is-a-local-cli-not-a-hosted-web-run-flow) the MVP makes the specific key-transmission claim moot (the key never leaves the machine), but the shipped copy stays inconsistent with shipped capability.
**Recommended resolution:** rewrite that FAQ answer for the local-CLI reality when D1 is implemented. **Owner:** unassigned.

### U4 — The landing page describes a materially broader product than the MVP

**Observed:** `components/Capabilities.tsx` renders eight capabilities and states "Eight capabilities, one versioned suite", including *Instruction following*, *Reasoning*, *Long context*, *Latency*, *Cost* and *Reliability*. `components/ComparisonExcerpt.tsx` shows a *Reasoning* row with percentages. `components/Hero.tsx` claims the tool runs "against any model with your provider API key".

**Observed:** [MVP.md §4.2](../MVP.md#42-capabilities-and-scoring-deterministic-only--d3) scopes v1 to **two** deterministic capabilities (`structured_output`, `tool_calling`), and §4.3 scopes v1 to **two** adapters. [benchmarks.md §4](./benchmarks.md#4-coverage-map) marks reasoning, instruction following, long context and coding as **not tested**.

**Observed:** `../design.md` §21 excludes several of these from v1, and §1 forbids presenting untested capabilities as anything other than not tested.

The marketing surface therefore overstates v1 by a factor of four in capability count and overstates adapter coverage with "any model". Under [D5](#d5--no-invented-numbers-anywhere-in-this-repository) and [PRODUCT §5](../PRODUCT.md#5-product-language), this is the exact claim shape the product forbids.

**Recommended resolution (not applied):** either narrow the capability list to what v1 measures plus an explicit "not yet measured" group, or clearly label the section as the roadmap rather than the shipped suite. **Owner:** unassigned. Deferred because it is a positioning decision, and because the honest fix depends on the outcome of Stage 0 validation.

---

## 5. Rejected options (recorded so they are not re-litigated)

| Rejected | Why |
|---|---|
| Become an LLM observability platform | Occupied by adopted, free, well-funded products (E6); requires production data we do not have. |
| Build a general-purpose evaluation framework (Python/YAML SDK) | Head-on against promptfoo (25,254★, MIT) and lm-evaluation-harness (14,016★) — E3, E5. |
| Publish a public cross-model leaderboard | It is the contested object in E1, and a permanent maintenance liability with no user-owned artefact. |
| Ship LLM-as-a-judge scoring in v1 | Cost, latency, contested reliability; conflicts with the trust claim (D3). |
| Model routing / AI gateway | Different product, different buyer, already commoditized by routing services. |
| CI/CD integration in v1 | Requires a suite and a baseline to exist first — Stage 5 in [ROADMAP.md](../ROADMAP.md), not a v1 feature. |
| Accounts, teams, billing in v1 | No user has run a single evaluation yet. Deferred to Stage 4. |
| A hosted dashboard of historical runs | [D7](#2-decisions-inherited-from-the-existing-design-contract) and `../design.md` §21 both exclude it; the report *is* the history. |
| Custom user-authored suites in v1 | Authoring is the expert task we are routing *around*; it is Stage 3. |