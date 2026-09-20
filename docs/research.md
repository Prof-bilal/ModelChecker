# ModelCheck Research Log

**Status:** living evidence base · **Created:** 2026-09-18
**Purpose:** the single canonical home for *evidence*. Product intent lives in [PRD.md](../PRD.md); decisions live in [decisions.md](./decisions.md).

**Canonical-home rule:** if a fact appears in two documents, this file owns the evidence and the other file links here.

## 0. Reading rules

Three labels are used throughout, and they are never mixed:

- **Observed** — retrieved from a primary source in this session, or present as a
  file in this repository. Point-in-time.
- **Interpretation** — our reasoning *about* observed evidence. Could be wrong.
- **Hypothesis** — an untested belief. Requires validation before it may
  influence the [MVP](./MVP.md) scope.

> **Process rule:** no statistic in this repository may exist without an entry
> here. If you cannot cite a row, you cannot use the number.

## 1. Method and limits

**Method.** (a) Direct inspection of this repository's files and git history;
(b) GitHub REST API for adoption counts; (c) retrieval of first-party
documentation and academic abstracts; (d) the Hacker News Algolia API for
discussion volume.

**Limits — these bound every claim below.**

- No ModelCheck user interviews were conducted. There is **no demand-side user
  research in this file.** Everything about "what developers want" is
  interpretation or hypothesis.
- No competitor pricing page, signup flow, or paid feature was verified in this
  session. **No pricing is stated anywhere in this repository.** See §5.
- No competitor product was used end-to-end. Feature claims come from
  documentation and repository metadata, which are vendor statements, not
  independent verification.
- **A dated measurement history exists, and is thin.** As of 2026-09-20 the CLI has run
  one real 30-case capability run against `openrouter/poolside/laguna-s-2.1:free`
  (recorded in [TEST-REPORT.md](../TEST-REPORT.md)); it produced outcomes on 20 of 30 cases
  and is **not** a validation of the product. No repository trial has ever been run by
  anyone. Any "zero measurements" phrasing elsewhere in the older documents is now stale.
- Search-engine articles were not used as authority. Vendor marketing pages are
  labelled as vendor claims when cited.

## 2. Evidence register

Confidence is our judgment, not a measured quantity.

| ID | Claim | Evidence | Source | Date | Implication for ModelCheck | Confidence |
|---|---|---|---|---|---|---|
| E1 | The dominant public ranking method is publicly contested as a proxy for model quality. | "The Leaderboard Illusion" (arXiv:2504.20879) reached 184 points / 51 comments on HN; Simon Willison published an explainer the same week. | `https://arxiv.org/abs/2504.20879`; HN story 43842380; HN story 43852409 | 2025-04-30 | Generic "which model is best" claims have lost credibility with technical readers. A workload-specific, provenance-linked result is a credible alternative framing. | High |
| E2 | New models and model revisions appear very frequently. | Artificial Analysis leaderboard header displays "26 of 652 models"; changelog tracks index revisions (v4.3). | `.codeatlas` evidence `01-artificial-analysis.md`; `https://artificialanalysis.ai/leaderboards/models` | 2026-09-17 | The trigger event ("a model changed") recurs often, which supports repeat usage *if* a saved baseline exists. | Medium — vendor's own count, not independently audited |
| E3 | The developer market has already standardized on open-source evaluation frameworks. | promptfoo 25,254★, MIT, TypeScript, created 2023-04-28, 631 open issues, topics include `ci-cd`, `llm-evaluation`; lm-evaluation-harness 14,016★ MIT; Inspect (`inspect_ai`) 2,805★ MIT, UK AI Safety Institute. | GitHub REST API | 2026-09-18 | Entering as "another evaluation framework" is entering a crowded, free, mature category. | High (counts are API-reported) |
| E4 | A vendor-owned evaluation framework can stagnate while the category grows. | `openai/evals` has 19,476★ but `pushed_at` = 2026-04-14, while promptfoo and langfuse both pushed 2026-09-18. | GitHub REST API | 2026-09-18 | Neutrality and sustained maintenance are differentiators; developers notice abandoned vendor tools. | Medium — single-repository signal |
| E5 | "Compare models against my own tests, in CI" is already an occupied, productized position. | promptfoo's own description: "Test your prompts, agents, and RAGs… Compare performance of GPT, Claude, Gemini, DeepSeek… declarative configs with command line and CI/CD integration. Used by OpenAI and Anthropic." (vendor claim) | `https://api.github.com/repos/promptfoo/promptfoo` | 2026-09-18 | **Not** a wedge. Competition here is free, well-adopted, and trusted by the frontier labs themselves. | High |
| E6 | Observability platforms bundle evaluation and already sit on the user's production data path. | langfuse 34,768★ ("Open source agent evals & observability"); Arize Phoenix 11,531★ ("AI Observability & Evaluation"); repository evidence files cover LangSmith experiment/compare views and Braintrust. | GitHub REST API; `.codeatlas` evidence `03-langsmith.md`, `07-braintrust.md`, `08-langfuse.md` | 2026-09-18 | Do not compete on traces, dashboards, or production monitoring. The unclaimed moment is *before* production: at release time. | High |
| E7 | Existing model-comparison surfaces are aggregate or third-party-benchmark-based, not workload-specific. | Artificial Analysis = index columns + Pareto views; Chatbot Arena = pairwise human preference, plus (per the evidence file) "no capability breakdown", "no latency/cost/reliability metrics"; Opper `/compare` = up to four models scored with *its own* benchmarks. | `.codeatlas` evidence `01-artificial-analysis.md`, `06-chatbot-arena.md`, `17-inspect-oppper.md` | 2026-09-17 | The gap is not "more benchmarks". It is "a measurement of *my* task, with the raw evidence attached". | Medium-High |
| E8 | Trust, provenance and disclosure are active concerns in evaluation reporting. | "Evaluation Cards" (arXiv:2606.09809) proposes an interpretive layer with provenance, comparability and completeness signals; Artificial Analysis surfaces "95% confidence interval" and "point-in-time snapshots"; Opper exposes source and verification freshness. | `.codeatlas` evidence `13-eval-cards.md`, `01-artificial-analysis.md`, `17-inspect-oppper.md` | 2026-09-17 | Provenance-first reporting aligns with the field's direction, and is cheap to implement correctly. | Medium |
| E9 | Practitioners do author private evaluation suites. | Inspect formalizes a Task as "dataset + solver + scorer" with log artefacts and resumption; this repo's evidence file records promptfoo's declarative YAML configs and local viewing; lm-evaluation-harness is a task-authoring harness. | `.codeatlas` evidence `17-inspect-oppper.md`, `10-vercel.md`; GitHub API | 2026-09-18 | Private suites are normal, but today they are authored in Python/YAML by specialists. The underserved user is the one who will never write one. | Medium |
| E10 | Provider-side version resolution (an alias moving under a pinned name) is a recognised hazard. | This repository's own design contract requires recording "resolved version or unresolved alias" for every run and separates "requested/resolved model ID" in the methodology manifest. | `../design.md` §6, §10 | 2026-09-17 | The project already assumes this problem. **It is a design assumption, not yet evidence.** | Low — see H3 |
| E11 | The prior in-repo research concluded the concept is *not* proven unique. | "Research does **not** prove ModelCheck's concept unique, or that it can evaluate every model within minutes. These are positioning and performance hypotheses to validate." | `../design.md` §2 | 2026-09-17 | The project's own contract already forbids treating uniqueness as established. Our verdict must be consistent with it. | High — direct quote |
| E12 | The industry's most-used coding benchmark was retired by its own publisher for invalid tests and contamination. | OpenAI stopped reporting SWE-bench Verified (2026-02-23): in an audit of a 27.6% subset, **≥ 59.4% of problems had flawed tests that reject functionally correct submissions**; all frontier models tested could reproduce the human gold patch verbatim or its specifics; the recommendation is SWE-bench Pro and privately authored benchmarks. The HN submission reached **343 points / 181 comments**. | `https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/`; HN Algolia API (story, 2026-04-26) | 2026-02-23 (page) / 2026-04-26 (HN) | "Your tests on your snapshot" is the only ground truth a team can audit. A verifier that cannot detect the fix must refuse to score ([trials §6.1](./trials.md#61-the-gate-normative)). | High — primary source with method |
| E13 | Memorization inflates coding-benchmark scores. | *The SWE-Bench Illusion*: models identify the buggy file from the issue description alone with **up to 76%** accuracy on SWE-bench Verified versus **≤ 53%** on tasks from repositories outside it; verbatim function reproduction is likewise higher on SWE-bench. | `https://arxiv.org/html/2506.12286v2` (arXiv:2506.12286v2) | 2025-06-27 | Tasks derived from a repository's own history must strip the answer (no `.git`, no gold diff, no added tests) — leakage guards are mandatory ([trials §7](./trials.md#7-leakage-guards-for-tasks-derived-from-history)). | High — preprint, peer-reviewable, two institutions |
| E14 | Practitioners report their internal repo-based evals correlate loosely with public coding benchmarks. | Databricks, "Managing AI Coding Costs at Scale" (HN **317 points / 268 comments**): cost levers, harness/model flexibility, routing, budgets. Author's comment on the thread: *"We built evals on our own codebase … We found our own evals correlated loosely with public generic SWE benchmarks. In large user populations … the ultimate answer will come from experimentation instead of offline evals."* | `https://www.databricks.com/blog/managing-ai-coding-costs-scale`; HN Algolia comment 2026-08-07 | 2026-08-07 | A published score is not a predictor of a team's workload; the workload itself must be measured. | Medium — vendor post plus one author comment; not verified by us |
| E15 | A public practitioner pipeline turns merged PRs into private benchmarks, and it is statistically modest and self-described as non-conclusive. | BYOB (byobench.ai, Sep 2026; HN 11 points / 2 comments): a merged PR passing five trust gates yields ticket + pre-merge tree + gold diff; the agent sees the ticket, never the patch; hidden-test pass rates are called *"an incomplete measure of code quality"*; grading uses ten specialized agents plus three grading agents; quality is measured alongside cost and time; results carry error bars ("4 PRs · 12 runs", "±0.14 SE"); *"No single setup won everywhere"*; *"Treat this as an exploration of an approach, not a leaderboard."* Reported ~5×–100× cost reductions at comparable quality, and ~7× lower cost on 15 additional PRs. | `https://byobench.ai/buildyourownbenchmark/`; HN Algolia API | 2026-09-10 | The method is third-party validated; the *statistics* are not. Small task sets produce wide error bars, so ModelCheck must print the minimum detectable difference before spending ([trials §9.3](./trials.md#93-power-stated-before-spending)). | Medium-High — public method and data; self-published |
| E16 | One model scores materially differently under different harnesses. | HN comment (2026-08-16) citing an Artificial Analysis comparison: Claude Opus 4.7 pass@1 of **50 / 45 / 40** under OpenCode / Cursor / Claude Code respectively. | HN Algolia comment (story: "Testing Moonshot AI's Kimi K3 Inside Claude Code") | 2026-08-16 | The measurement unit is the **setup** (model + harness + context + parameters + route), never the model alone ([trials §1](./trials.md#1-what-a-trial-is--and-what-it-is-not)). | Low-Medium — second-hand comment; not verified in this session |
| E17 | Repository-aware coding-agent evaluation is already being built in the open (six projects, all early). | GitHub REST API (2026-09-20): `mupt-ai/self-bench` 28★ MIT, TS, pushed 2026-09-20 — private benchmarks from local coding sessions and merged PRs, hidden tests + reference solution, fail-without/pass-with validation, Harbor export, Docker/Modal/Vercel Sandbox/E2B/Daytona, exports *"sensitive and unencrypted"*; `sjarmak/codeprobe` 10★ Apache-2.0 on PyPI — merged PRs → evals, measures the whole setup incl. cost; `s1liconcow/repogauge` 3★ — private eval dataset for token cost; `tugrakaymakcioglu/RepoArena` 1★ alpha — "SWE-bench for your private repo" in Docker; `RobertKodes/repoeval` 0★ — tests (70%) + patch similarity (30%) and a "leaderboard"; plus a YC-backed founder comment (2026-07-22) building "a bench that you can't benchmaxx". | GitHub REST API; repository READMEs; HN Algolia API | 2026-09-20 | The *idea* is not novel and is not defensible by itself. Differentiation must come from evidence discipline: verified verifiers, refusal to score, honest statistics, context auditability, local-first privacy. | High for metadata; READMEs are vendor claims |
| E18 | Public engagement with those repository-eval projects is very low. | HN: "Show HN: Self-bench – build SWE-bench style evals from private repos" (2026-08-14) = **3 points, 0 comments**; "Show HN: RepoGauge" (2026-04-17) = **1 point, 0 comments**; RepoArena = 1★; repoeval = 0★. | HN Algolia API; GitHub REST API | 2026-09-20 | **Counter-evidence to the demand thesis.** Many builders, little audience. The problem may be real while the product is not: validate the loop before building the platform. | High for the counts; low for any conclusion drawn from them |
| E19 | Model performance degrades non-uniformly as input length grows, so "more context" is not automatically better. | Chroma technical report *Context Rot*: 18 models (incl. GPT-4.1, Claude 4, Gemini 2.5, Qwen3) evaluated on extended needle-in-a-haystack tasks, LongMemEval and a repeated-words task; performance becomes increasingly unreliable as input length grows, in non-uniform ways; standard NIAH is insufficient as a long-context benchmark. | `https://research.trychroma.com/context-rot` | 2025-07-14 | The context bundle must be recorded and comparable, and a context-sensitivity trial is a legitimate, evidence-backed experiment ([trials §9.4](./trials.md#94-context-sensitivity-v1)). | Medium-High — vendor technical report; single source |
| E20 | Model identity, pricing and usage accounting are exposed by the gateway and are usable as measurement inputs. | OpenRouter `/api/v1/models` returned **446 models** with `id`, `canonical_slug` (dated, e.g. `…-20260918`), `created`, `context_length`, `pricing{prompt,completion}` (per-token strings), `top_provider{context_length,max_completion_tokens,is_moderated}`, `supported_parameters`, `default_parameters`, `knowledge_cutoff`, `expiration_date`, `links`; **21** `:free` variants. Usage accounting is always on (the `usage.include` / `stream_options.include_usage` flags are deprecated): `prompt_tokens`, `completion_tokens`, `reasoning_tokens`, `cached_tokens`, `cache_write_tokens`, `cost`, `cost_details.upstream_inference_cost`. | Live API call and OpenRouter documentation | 2026-09-20 | Cost and token counts are provider-reported, not estimated; alias identity has a dated canonical slug to record. | High — primary docs plus an observed API response |
| E21 | The request route can be controlled and must therefore be recorded, because route is part of the measurement identity. | OpenRouter provider-routing controls: `order`, `allow_fallbacks`, percentile-based latency/throughput sorting (`:nitro`, `:floor`), performance thresholds, `max_price`, `only`/`ignore`, quantization levels, required-parameter support (`require_parameters`), and **`zdr: true`** for per-request zero-data-retention enforcement plus data-policy filtering. Provider logging/training policies vary per provider, with separate account settings for paid and free models; in-region routing is enterprise-only. | `https://openrouter.ai/docs/guides/routing/provider-selection`; `https://openrouter.ai/docs/features/privacy-and-logging` | 2026-09-20 | A trial records the route (provider, quantization, ZDR flag) and can pin it; a change of route invalidates comparison ([trials §10](./trials.md#10-versioning-lifecycle-and-reuse)). | High — primary documentation |
| E22 | The gateway itself now publishes provenance-linked benchmarks, so provenance alone is no longer differentiating. | OpenRouter `/benchmarks`: *"Independent, reproducible measurements of the knobs you can actually set on an OpenRouter request: models, providers, search engines, and tool budgets. Every score links to the configuration, costs, and telemetry behind it."* 11 benchmarks, **2,453,260 task evaluations**, last run 2026-09-20, with Quality / Value / Speed columns and a Benchmarks API (e.g. τ²-Bench Airline, GPQA Diamond, search suites). | `https://openrouter.ai/benchmarks` | 2026-09-20 | The unclaimed axis is *the user's repository, task and tests* — not provenance, cost or speed reporting in general. | High — vendor page, observed |
| E23 | LLM-judge bias is measured, not hypothetical, so judged evidence must be a separate, labelled tier. | Position bias: 15 judges, MTBench/DevBench, ~40 solution-generating models, >150,000 evaluation instances; bias is not random, varies by judge and task, and is strongly affected by the quality gap (AACL-IJCNLP 2025). Self-preference: GPT-4 shows significant self-preference, tracking lower perplexity / greater familiarity (NeurIPS 2024 Safe GenAI workshop). Survey of judging opportunities and challenges (EMNLP 2025). | `https://arxiv.org/abs/2406.07791`; `https://arxiv.org/abs/2410.21819`; `https://arxiv.org/abs/2411.16594` | 2024-06-12 / 2024-10-29 / 2024-11-25 (v7 2025-09-29) | Judge-derived numbers live in their own tier, with judge, prompt and rubric versions recorded, and never merge into a deterministic aggregate ([trials §6](./trials.md#6-checks-and-the-verifier-validity-gate)). | Medium-High — peer-reviewed/workshop papers |
| E24 | Small-n and single-run agent evaluations are unreliable, and evaluations are experiments that require power planning. | τ-bench introduces **pass^k** and reports one leading function-calling agent below 50% success and **pass^8 < 25%** in retail. *AI Agents That Matter*: accuracy-only evaluation yields needlessly complex and costly agents; recommends joint cost-accuracy optimisation, adequate holdouts, and standardised reporting. *Adding Error Bars to Evals*: evaluations are experiments; provides analysis and planning formulas for comparing models. A public critique of a benchmark that ran n = 1 per model per prompt: *"it is not a statistical benchmark."* | `https://arxiv.org/abs/2406.12045`; `https://arxiv.org/abs/2407.01502`; `https://arxiv.org/abs/2411.00640`; HN Algolia comment 2026-06-12 | 2024-06-17 / 2024-07-01 / 2024-11-01 | Repeats, paired comparison, pass^k, a pre-run minimum detectable difference, and `no measurable difference` / `inconclusive` as first-class verdicts ([trials §9](./trials.md#9-statistics-for-trials)). | High — published papers; Medium for the HN critique |
| E25 | Secrets scanning and code-execution isolation are commodity infrastructure; ModelCheck should integrate, not invent. | GitHub REST API (2026-09-20): gitleaks 29,397★ MIT; trufflehog 27,999★ AGPL-3.0; detect-secrets 4,635★ Apache-2.0; E2B 13,889★; Daytona 71,742★ (API-reported). `mupt-ai/self-bench` documents sandbox backends Docker, Modal, Vercel Sandbox, E2B and Daytona, and warns its task exports are *"sensitive and unencrypted"*. | GitHub REST API; `https://github.com/mupt-ai/self-bench` | 2026-09-20 | Do not write a scanner or a sandbox runtime; choose an explicit isolation policy instead ([SECURITY §11](../SECURITY.md#11-repository-data-and-context-bundles-new-2026-09-20)). | High for counts; README is a vendor claim |

## 3. Interpretation of the evidence

**I1 — The category is crowded at the *framework* layer and at the *ranking* layer, and empty at the *decision* layer.** E3/E5/E6 show that running evaluations is solved and often free. E7 shows the surfaces that exist answer "which model scores best in general" or "how did my production traffic behave". Neither answers the question an engineer is actually asked: *should we move our feature to this new model?*

**I2 — "We publish a capability suite" is the weakest possible framing.** A fixed suite authored by ModelCheck is, by definition, a benchmark — the exact thing the brief says the product must not become. Under I1 a suite has no defensibility (E3, E5) and re-introduces the credibility problem it claims to solve (E1).

**I3 — The credible differentiator is the artefact, not the suite.** Every competitor reports *scores*. Few let a reader follow conclusion → measurement → raw model output → scoring rule → environment. E8 says the field values this. It is also the cheapest thing to build well, because it is discipline rather than scale.

**I4 — Money is downstream of the wedge.** Free, adopted tooling owns the "curiosity" moment (E3, E5). Budget appears when a decision must be *justified* or a regression must be *prevented* (E6 shows where budget already sits). Therefore the wedge must be cheap enough to be free, and must create a durable object — a pinned baseline — that later becomes a paid workflow.

**I5 — Openness is the acquisition mechanism in this market.** The most adopted tools in E3/E6 are open source with permissive licences. A closed evaluation tool asks a developer to trust a vendor's numbers about *other* vendors' models — a trust problem the category already has (E1).

## 4. Hypotheses (unvalidated — must not drive scope)

| ID | Hypothesis | Why we believe it | Cheapest test | Status |
|---|---|---|---|---|
| H1 | Engineers face a recurring, time-boxed "should we switch models?" decision within days of a release. | E2 (release frequency) + E1 (rankings distrusted). | 20 interviews: ask each to describe their last model-change decision and its deadline. | Untested |
| H2 | Those engineers currently answer the question with vibes, a throwaway script, or a few manual prompts. | E9 (private suite authoring is expert-only) implies non-experts do something worse. | Ask for the artefact they produced last time. If they cannot produce one, H2 holds. | Untested |
| H3 | Providers silently re-point model aliases, so past measurements stop describing present behaviour. | E10 is a design assumption only. | Log resolved model identifiers across repeated calls to a pinned alias over several days; check for change. | Untested — weak evidence |
| H4 | A saved baseline plus a recurring trigger produces repeat usage without prompting. | I4. This is the retention thesis; if false, Stage 3+ is dead. | Instrument CLI usage: of users with a saved baseline, how many run again within 30 days unprompted? | Untested |
| H5 | Deterministic-only coverage (structured output + tool calling) covers enough of the ICP's workload to be useful. | Chosen to make the trust claim defensible ([decisions D3](./decisions.md)). | Show a real report to 10 ICP engineers; ask whether it answers their question. | Untested — **highest-risk assumption in the MVP** |
| H6 | Teams will pay for regression prevention once a baseline exists. | E6 (budget already sits in production quality tooling) + I4. | Price-sensitivity interviews *after* usage, never before. | Untested |
| H7 | An engineer who owns a repository and is about to adopt a coding model or agent will run a repository trial **once**, and will re-run it when the model, harness or version changes. | E12/E13 (public coding benchmarks are invalid or memorized), E14 (internal evals do not track public ones), E16 (harness dominates), E17 (six independent projects are being built). **Counter-evidence:** E18 (very low engagement), E15 (the best public pipeline reports n = 4 PRs with ±0.14 SE). | Concierge test: 5 hand-run trials on 5 real repositories. Success = ≥ 3 of 5 report a decision made differently; failure = they cannot produce a runnable test command, or the evidence does not move them. | Untested — **the assumption that must be validated first** |
| H8 | A verdict that is only a judge score will not change a decision; verifier-validated tests plus scope evidence will. | E23 (judge bias is measured), E15 (practitioners still measure tests + cost + time despite using judges), E12 (flawed tests are the named failure mode). | In the same 5 trials, ask which artefact they would show a colleague: the check table or a judged score. | Untested |
| H9 | Developers will supply a test command and an explicit file list; automatic discovery is not required for a first yes. | E15/E17 (every existing pipeline requires a verifier command or discovers one imperfectly; RepoArena documents language-specific profiles as a limitation). | Ask each of the 5 participants to produce the command unprompted; record how long it took. | Untested |

## 5. Competitor research

**Pricing is deliberately absent.** No competitor pricing page was verified in this session, so no price is quoted anywhere in this repository. Populating that column is a required Stage 0 task in [ROADMAP.md](../ROADMAP.md).

| Product | Target user | Main job | Strength | Weakness | Pricing | OSS | Our opportunity |
|---|---|---|---|---|---|---|---|
| **promptfoo** | Developers + security teams shipping prompts/agents | Test prompts against your own cases; compare providers; run in CI | 25,254★; MIT; declarative config; CLI + CI native; vendor claim of OpenAI/Anthropic use | Positioning now spans red-teaming/pentesting; config-first assumes a user who will author YAML | Not verified | Yes (MIT) | Does not answer "how did this model *change* since my last run, with provenance?" for a non-authoring user |
| **lm-evaluation-harness** | Model researchers | Academic few-shot task evaluation | 14,016★; MIT; the de-facto research harness | Research framing; no product artefact; not aimed at shipping engineers | Free | Yes (MIT) | Different user; borrow methodology, do not compete |
| **Inspect (`inspect_ai`)** | Safety/evals engineers, government | Rigorous Task = dataset + solver + scorer, with logs | 2,805★; MIT; UK AISI backing; resumption + log viewer | Python-first; expert authoring; no hosted comparison artefact | Free | Yes (MIT) | A source of vocabulary (dataset/solver/scorer, retries) to borrow |
| **openai/evals** | OpenAI-adjacent developers | Framework + benchmark registry | 19,476★ | `pushed_at` 2026-04-14 — stale versus peers pushing 2026-09-18 (E4) | Free | Yes | Evidence that vendor-owned eval tooling stops being maintained |
| **LangSmith** | Teams running LLM apps in production | Traces, datasets, experiments, baseline compare | Mature comparison: baseline selection, regression/improvement counts, diff view | Requires an existing dataset workspace and production traces; platform-scale | Not verified | No | Owns "after production"; we want "before the decision", with no dataset prerequisite |
| **Braintrust** | AI engineering teams | Evaluate + observe; versioned datasets; configurable scorers | Side-by-side experiments; LLM/code/human scorers | Enterprise breadth; compliance signals are not measurement validity | Not verified | No | Do not compete on breadth or compliance marketing |
| **Langfuse** | Teams needing OSS observability | Trace, evaluate, improve; self-hostable | 34,768★; open-core; typed scores | Entry point is traces; requires instrumenting the app first | Not verified | Yes (open-core) | Owns the production loop; we own the pre-adoption moment |
| **Arize Phoenix** | ML/AI engineers | Observability + evaluation | 11,531★; OSS | Same as Langfuse: instrument-first, trace-shaped | Not verified | Yes | Same |
| **Artificial Analysis** | Buyers, analysts, press | Cross-model index + operational metrics | 652 models; explicit CIs; Pareto cost/speed views; versioned methodology | Aggregate, not your workload; composite index | Not verified | No | The credibility standard to imitate, applied to *one* user's task |
| **Chatbot Arena / LMArena** | General public, press | Human-preference ranking | Vote volume; blind pairwise; brand | Per its own evidence file: no capability breakdown, no cost/latency; ranking contested (E1) | Free | Partly | Its credibility problem is our opening |
| **OpenRouter** | Developers consuming many models | Route/reprice calls to 500+ models | One key, one bill, real-time price/latency, fallbacks | A routing layer, not a measurement authority; quality signal is popularity | Not verified | No | A distribution partner, not a competitor |
| **Opper `/compare`** | Developers choosing a model | Side-by-side up to 4 models, URL-stateful | Shareable comparison state; route/privacy disclosure; freshness shown | Uses third-party benchmark scores; not your workload | Not verified | No | Closest UX precedent for a shareable comparison artefact |

### 5.1 Already commodity — do not rebuild

Running a suite; calling N providers behind one interface; a results table; a
heatmap; CSV export; a judge wrapper; a CLI skeleton. All of this exists, free,
at high quality — see E3/E5/E6 and the table above.

### 5.2 Genuinely underserved

1. **Zero-setup measurement of a *named capability* on a workload**, for the
   engineer who will never author a YAML or Python evaluation.
2. **A pinned baseline that makes the *next* run a delta**, so the output is a
   decision ("+6 points on tool-call arguments, −40% estimated cost") rather
   than a score.
3. **Provenance down to the raw output**, published as a portable artefact that
   outlives the tool.
4. **A neutral third party** — every credible alternative is a vendor (OpenAI), a
   research institute, or a platform selling into the same teams (E4, I5).

### 5.3 Repository-aware evaluation entrants (observed 2026-09-20)

The Lane A idea — evaluate a model on *your* repository — is **actively being built and
poorly differentiated today**. Six projects, all early, none with meaningful traction
([E17](#2-evidence-register), [E18](#2-evidence-register)):

| Project | Stars | Claim | What it does not do |
|---|---|---|---|
| `mupt-ai/self-bench` | 28 | Builds private benchmarks from local coding sessions and merged PRs; hidden tests + reference solution; fail-without/pass-with validation; multiple sandbox backends | No evidence-first report; no honest-statistics verdict; exports are unencrypted snapshots |
| `sjarmak/codeprobe` | 10 | Merged PRs → evals; measures model, tools, retrieval, cost, harness | Harness-first framing; no verifier-validity gate as a first-class refusal |
| `s1liconcow/repogauge` | 3 | Private eval dataset to optimise token cost | Cost-only; no correctness evidence |
| `tugrakaymakcioglu/RepoArena` | 1 | "SWE-bench for your private repo" in isolated Docker | Alpha; GitHub-only metadata; needs separable source/test patches; prints an agent leaderboard |
| `RobertKodes/repoeval` | 0 | Repo history → benchmark; tests 70% + patch similarity 30% | Patch similarity is not correctness; prints a leaderboard from small n |
| (unreleased) | — | A YC-backed founder's "bench that you can't benchmaxx" | — |

**Interpretation.** The concept is not the moat. The defensible differences are the ones
this repository already enforces elsewhere: a claim that links to its measurement (P1),
refusal to score when the verifier is invalid, `not measured` as a first-class answer, and
local-first data handling. Everything else in the table above is copyable in a week.

### 5.4 Public leaderboards and benchmarks (observed 2026-09-20)

Sources for the `/docs/compare-platforms` table. Each row below is a first-party
page or repository README, retrieved 2026-09-20; descriptions are **observed**,
not measured. Nothing here ranks one platform above another.

| Project | What it is | Observed facts | Source |
|---|---|---|---|
| OpenRouter Benchmarks | Gateway-published benchmark rankings | 11 benchmarks; 2,453,260 task evaluations; last run 2026-09-20; Quality / Value / Speed columns; provenance links per score | `https://openrouter.ai/benchmarks` (E22) |
| LMArena (Chatbot Arena) | Community preference ranking | Self-describes as "The Official AI Ranking & LLM Leaderboard"; ranking derived from pairwise human votes on anonymous chats; battle mode | `https://lmarena.ai/` |
| Artificial Analysis | Third-party model index | Intelligence Index v4.3.2 aggregates 10 evaluations; "26 of 653 models"; capability indexes per industry (finance, legal, healthcare…); cost, speed, latency, context columns | `https://artificialanalysis.ai/models` |
| SWE-bench | Repository-issue resolution benchmark | "2,294 instances"; "real GitHub issues from 12 Python repositories"; verification is by the repository's own tests; family variants (Verified 500, Lite 300, Multilingual, Multimodal) | `https://www.swebench.com/` |
| Aider leaderboards | Code-editing benchmark | 225 Exercism exercises, six languages; per-run disclosure of edit format, pass rates, cost, seconds per case, token counts, timeouts | `https://aider.chat/docs/leaderboards/` |
| LiveBench | Contamination-controlled benchmark | ICLR 2025 Spotlight; "designed to limit potential contamination by releasing new questions monthly"; "verifiable, objective ground-truth answers… without the use of an LLM judge"; 18 tasks across 6 categories | `https://github.com/LiveBench/LiveBench` |
| HELM | Stanford CRFM evaluation framework | "holistic, reproducible and transparent evaluation"; Apache-2.0; leaderboards per domain (Capabilities, Safety, VHELM, MedHELM); **entered maintenance mode on June 1, 2026** | `https://github.com/stanford-crfm/helm` |

## 6. User-pain evidence — honest assessment

**We have weak direct evidence of user pain.** This is the most important
limitation of this document. E1 and E2 establish that the *inputs* to the problem
(rankings, release volume) are prominent and contested. They do **not** establish
that engineers feel enough pain to adopt or pay. No forum thread, interview, or
support ticket in this session directly recorded "I could not tell whether the
new model helped my workload".

Per the reading rules in §0, this gap is recorded as hypothesis
[H1/H2](#4-hypotheses-unvalidated--must-not-drive-scope), and closing it is the
primary objective of Stage 0 in [ROADMAP.md](../ROADMAP.md). **No demand thesis in
this repository should be treated as evidenced until those interviews exist.**

### 6.1 Update 2026-09-20 — demand-side signals exist, and they cut both ways

The 2026-09-18 assessment above stands for *Lane B* (capability suites). For *Lane A*
(repository trials) there is now real, if indirect, demand evidence — and real
counter-evidence.

**Observed, supporting H7**

- The publisher of the industry's standard coding benchmark retired it for **invalid tests
  and contamination**, in a post that reached 343 points and 181 comments, whose top
  response tells developers to build a harness from their **own private repositories and
  personal projects** ([E12](#2-evidence-register)).
- Two independent production write-ups describe the same internal pipeline — merged PRs as
  tasks, pre-change tree, ticket-as-prompt, tests plus cost plus time ([E14](#2-evidence-register), [E15](#2-evidence-register)).
- Six open-source projects independently attack the same problem in 2026 ([E17](#2-evidence-register)) — revealed preference that the problem is felt.

**Observed, against H7**

- **Engagement is negligible**: the most complete entrant's Show HN drew 3 points and 0
  comments; another drew 1 point; the repositories have 0–28 stars ([E18](#2-evidence-register)).
- The best public pipeline reports **n = 4 PRs with ±0.14 standard error** and explicitly
  calls itself *"an exploration of an approach, not a leaderboard"* ([E15](#2-evidence-register)).
  Small task sets cannot produce confident decisions, which may be why these tools do not
  spread.
- The harness confound ([E16](#2-evidence-register)) means a repo trial may measure the
  *harness* more than the model — a result that does not answer the question the user asked.

**Interpretation.** The problem is real; the product is not yet proven. The most likely
explanation for low engagement is that existing tools deliver a *leaderboard* (which
nobody needs for 4 tasks) instead of a *decision with evidence and honest error bars*.
That is a product hypothesis, not a fact, and H7 is the assumption that the first
experiment must test.

## 7. Explicitly not verified

- Any competitor's **pricing, plan limits, or free-tier boundaries**.
- Any competitor's **paid feature set** (only public docs/README claims).
- That promptfoo is in fact "used by OpenAI and Anthropic" beyond the vendor's
  own repository description.
- The Artificial Analysis model count, which is a vendor-published figure.
- Whether provider aliases silently drift (H3) — no observation was recorded.
- **Any competitor's product end-to-end.** Every entry in
  [§5.3](#53-repository-aware-evaluation-entrants-observed-2026-09-20) is described from its
  README or repository metadata; none was installed or run, and none of their claims is
  independently verified here.
- **OpenRouter's internal latency/throughput percentiles** as a measurement of ours. They
  are provider telemetry used for routing; ModelCheck measures its own wall-clock latency
  and does not present gateway metrics as its own.
- **Whether a route or alias changed what was served** in any past run (H3 remains open).
- **The single capability run recorded in [TEST-REPORT.md](../TEST-REPORT.md)** as evidence
  of product fit: it is one model, one suite version, one route, one day, and it was
  performed for verification, not validation.