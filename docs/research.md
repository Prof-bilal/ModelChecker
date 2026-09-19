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
- No benchmark was run. ModelCheck has produced **zero** measurements.
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

## 7. Explicitly not verified

- Any competitor's **pricing, plan limits, or free-tier boundaries**.
- Any competitor's **paid feature set** (only public docs/README claims).
- That promptfoo is in fact "used by OpenAI and Anthropic" beyond the vendor's
  own repository description.
- The Artificial Analysis model count, which is a vendor-published figure.
- Whether provider aliases silently drift (H3) — no observation was recorded.
- Any claim about ModelCheck's own performance. None exists.