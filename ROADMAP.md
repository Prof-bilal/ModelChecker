# ModelCheck — Roadmap

**Version:** 0.3 · **Date:** 2026-09-20
**This file owns:** future direction. It is **not** scope.
**Precedence:** [MVP.md](./MVP.md) always wins. Nothing here may be started before its stage is entered, and no stage is entered without the evidence named in its gate.

> **Lane split (2026-09-20).** The stage map below describes **Lane B — capability suites**, which is shipped. **Lane A — repository trials** now runs as a parallel build line with its own gates in [docs/trials.md](./docs/trials.md) and its own sequencing in [docs/web-app.md](./docs/web-app.md); the split is decision [D21](./docs/decisions.md#d21--two-lanes-repository-trials-active-and-capability-suites-shipped). Lane A's first gate is the five-repository concierge test ([H7](./docs/research.md#4-hypotheses-unvalidated--must-not-drive-scope)); Stage 1's gate is unchanged.

> **No dates.** Estimates of when something will ship have no evidence behind them.
> Stages advance on **gates**, not calendars.

---

## 1. Stage map

```text
Stage 0  Validation        — talk to humans; no product code
Stage 1  MVP               — the local CLI (MVP.md)
Stage 2  Repeat usage      — make the second run happen; share links
Stage 3  Custom evaluation — user suites, judge-based scoring, coding
Stage 4  Team / production — accounts, history, billing
Stage 5  CI/CD             — GitHub Action, thresholds, badges
Stage 6  Monitoring        — scheduled runs, drift detection, alerting
```

Each stage exists because the previous gate produced evidence. Skipping a stage is
how this becomes a platform nobody asked for.

---

## 2. Stage 0 — Validation

**Goal:** replace the untested demand hypotheses with evidence, before writing
product code.

**Gate to enter:** none. This is the current stage.

**Gate to leave:** the experiment in §2.1 concludes, and no kill criterion in
[MVP §8](./MVP.md#8-kill-criteria) has fired.

### 2.1 The validation experiment

Designed as a **concierge test**: do the work by hand before automating it.

| Element | Design |
|---|---|
| **Hypothesis** | Engineers who own an LLM feature face a recurring, unresolvable "did this model change help my workload?" decision, and will engage with a report that answers it for their capability. |
| **Tested against** | [H1, H2, H4, H5](./docs/research.md#4-hypotheses-unvalidated--must-not-drive-scope) |
| **Target users** | 20 people matching [ICP #1](./PRD.md#21-icp-1-definition), sourced from: engineering-heavy Slack/Discord communities for AI products, GitHub maintainers of tools that call model APIs, and direct outreach to small AI startups |
| **Method** | 20 interviews of 20–30 minutes. Then, for the 10 who describe a concrete recent decision: produce a **hand-made report** for their capability using the [V1 suite](./docs/benchmarks.md) against their current model and a plausible candidate, and send it |
| **Landing-page message (to test)** | "A model changed. Find out what it did to your workload — with the evidence attached." |
| **Demo** | The hand-made report, plus a 3-minute screen recording of a real run. No sign-up wall |
| **CTA** | Two options to test: (a) "Send me the next one when a model I use changes" (email), (b) "Run it myself" (install instructions). (b) is the stronger signal |
| **Measure** | (1) Can each interviewee describe a model-change decision from the last 6 months? (2) Of the 10 given a report, how many shared it with a colleague unprompted? (3) How many asked for another? (4) How many attempted a run themselves? (5) Do any currently get an acceptable answer from promptfoo/Langfuse, and how long did that take? |
| **Success thresholds (proposed, not market facts)** | ≥ 12 of 20 describe a concrete recent decision; ≥ 4 of 10 share the report unprompted; ≥ 5 of 20 attempt a run; ≤ 5 of 20 already satisfied by a free tool in under 15 minutes |
| **Failure thresholds (proposed)** | < 8 of 20 describe a concrete decision (**fires K5**); or ≥ 5 of 20 satisfied by a free tool (**fires K4**); or 0 of 10 share the report |
| **Cost** | Interviewee time. Provider spend for ~10 hand-made runs at 30 cases each — a bounded, known amount before starting |

**Why concierge instead of building first:** the report is the artefact under test,
and producing it by hand is possible today. Building the CLI first tests our
engineering, not the market's demand.

### 2.2 Stage 0 deliverables

- [ ] A competitor-pricing survey filling the blank column in
  [docs/research.md §5](./docs/research.md#5-competitor-research)
- [ ] 20 interview records, with the "concrete decision" question answered explicitly
- [ ] ≥ 10 hand-made reports, retained as fixtures for later regression work
- [ ] A decision: proceed to Stage 1, re-scope, or kill
- [ ] Resolution of the open questions in [PRD §12](./PRD.md#12-open-questions)

---

## 3. Stage 1 — MVP

**Goal:** the smallest tool that can produce a trustworthy artefact unaided.

**Scope:** exactly [MVP.md](./MVP.md). Nothing from Stage 2+.

**Build order (each step ends in something runnable):**

1. Suite loader + validation + a 3-case fixture suite
2. One adapter (OpenAI-compatible), mock adapter, and the runner with concurrency,
   timeout and retry classification
3. The two scorers
4. Aggregation with the denominator invariants
5. `report.json` + the report schema + golden-report test
6. `report.html`, reusing the existing token system
7. `compare`
8. `list`, then the README that makes §4.6's budget achievable

**Gate to leave:** all nine acceptance criteria in [MVP §7](./MVP.md#7-acceptance-criteria)
pass, demonstrated in a recorded walkthrough, and ≥ 10 distinct users have completed
a first run.

**Explicitly not in this stage:** sharing, accounts, CI, coding, judges, dashboards,
telemetry.

---

## 4. Stage 2 — Repeat usage

**Goal:** make the second run happen without prompting. This is the retention thesis
([H4](./docs/research.md#4-hypotheses-unvalidated--must-not-drive-scope)), and the
whole business depends on it.

**Gate to enter:** ≥ 10 users have completed a first run at Stage 1.

**Build:**
- `--label` for baseline/candidate naming (already SHOULD in MVP)
- Local run history that `list` and `compare` read cheaply
- `modelcheck wipe` and a documented retention statement ([SECURITY §7](./SECURITY.md#7-retention-and-deletion))
- **Hosted share link** — the first server, and the first distribution loop
- Redaction preview before any upload
- The [SECURITY §8](./SECURITY.md#8-what-changes-when-a-server-exists-stage-2-re-review-gate) gate completed **first**

**Gate to leave:** ≥ 40% of users with a saved baseline run again within 30 days,
unprompted. **If this fails, [K1](./MVP.md#8-kill-criteria) fires and Stages 3–6 are
cancelled.**

---

## 5. Stage 3 — Custom evaluation

**Goal:** let a user bring their own workload, which is where the product's name
finally becomes true.

**Gate to enter:** Stage 2's retention gate passed.

**Build, in this order:**
1. **User-authored suites** from a documented file format, with validate-and-preview
2. **Coding capability** — *only* behind a real sandbox, per [SECURITY §5](./SECURITY.md#5-code-execution-future--coding-capability). A security project, not a feature
3. **Model-judged scoring** as a separate rule family with the labels required by
   [EVALUATIONS §11](./EVALUATIONS.md#11-model-judged-scoring-designed-not-built)
4. Additional capabilities (reasoning, instruction following, long context) — only
   now, because only now can they be scored honestly

**Gate to leave:** ≥ 3 users run a custom suite more than once.

---

## 6. Stage 4 — Team and production use

**Goal:** the first paid product.

**Gate to enter:** someone has asked to pay, in writing, for something Stages 2–3 do
not provide.

**Build:** accounts, shared team suites, run history, seats, billing.

**Before building:** complete the pricing survey from Stage 0. **No price may be set
without it** ([PRD Q5](./PRD.md#12-open-questions)). This is the stage at which the
product stops being a CLI and becomes a service, and the stage at which
[SECURITY §8](./SECURITY.md#8-what-changes-when-a-server-exists-stage-2-re-review-gate)
becomes a permanent obligation rather than a one-time gate.

---

## 7. Stage 5 — CI/CD

**Goal:** model quality becomes an engineering workflow with a regression gate.

**Gate to enter:** Stage 4 exists, and at least one team runs comparisons on a
schedule.

**Build:** a GitHub Action wrapping the CLI; a threshold policy file in the
consumer's repository; a PR comment rendered from `report.json`; a badge from the
same JSON. All of it already works because the artefact is portable and the exit
codes are defined ([CODESTYLE §2.6](./CODESTYLE.md#26-exit-codes)).

**Design constraint:** CI failure is **opt-in policy**, never a default. A run that
completes is a success (`../design.md` §12).

---

## 8. Stage 6 — Monitoring

**Goal:** catch drift before a user notices it in production.

**Gate to enter:** CI adoption exists, and someone reports a regression they found
only after deploying.

**Build:** scheduled runs against stored baselines, drift detection, alerting.

This is the "Layer 3" of the original brief — and it is **last on purpose**. It needs
a baseline, a schedule, a team, and a reason to be told. The original concept put
monitoring in the long-term vision; honest sequencing puts it after the wedge has
proven retention.

---

## 9. Business model (unvalidated)

**No price is stated anywhere in this repository**, because no competitor pricing was
verified and no user has been asked ([PRD Q5](./PRD.md#12-open-questions)).

Shape, to be validated in Stage 4:

| Tier | Presumed content | Confidence |
|---|---|---|
| Free / open source | The CLI, the default suite, local runs, portable artefacts | **High** — a closed evaluation tool asks developers to trust a vendor's numbers about other vendors' models, and the adopted tools in this market are open source ([E3, E6](./docs/research.md#2-evidence-register); [I5](./docs/research.md#3-interpretation-of-the-evidence)) |
| Paid — individual | Hosted runs, saved history, share links, unlimited private suites | Unknown |
| Paid — team | Shared suites, CI integration, retention, seats | Unknown |
| Enterprise | Self-hosted execution, SSO, audit, large-scale runs | Unknown — no evidence a buyer exists |

**What we believe, weakly:** per [research I4](./docs/research.md#3-interpretation-of-the-evidence),
budget exists where a decision must be *justified* or a regression *prevented* — not
where a developer is merely curious. That argues for a free wedge and a paid
regression layer. **That is an argument, not evidence**, and Stages 0 and 4 exist to
test it.

**Explicitly rejected as a model:** charging for access to benchmark scores, or
selling evaluation data. Both trade the trust asset for a one-time payment.

## 10. Distribution

The distribution loop must be built into the artefact, because there is no ad budget
and no brand.

| Mechanism | Stage | Why it could work | Evidence status |
|---|---|---|---|
| **The report artefact itself** | 1 | A portable report is inherently forwardable, and provenance is a reason to send it to someone | Untested |
| **Open-source CLI** | 1 | The most-adopted tools in this market are permissively licensed ([E3](./docs/research.md#2-evidence-register)) | Medium |
| **Share links** | 2 | Turns a private artefact into a public one; the closest precedent is a URL-stateful comparison page ([E7](./docs/research.md#2-evidence-register)) | Untested |
| **Release-day reports** | 2 | The trigger is public and recurring ([E2](./docs/research.md#2-evidence-register)). It is the one content type this product can produce credibly — **but it risks becoming a leaderboard**, which [PRODUCT §7](./PRODUCT.md#7-what-modelcheck-must-not-become) forbids | Untested |
| **GitHub Action + badge** | 5 | Badges travel through repositories, which is where the ICP lives | Untested |
| **Integrations** | 5+ | Model routers and observability tools are complements, not competitors ([E6](./docs/research.md#2-evidence-register)) | Untested |
| **Communities** (Hacker News, relevant subreddits, AI-engineering Discords) | 1+ | Where the discussion in [E1](./docs/research.md#2-evidence-register) already happens | Medium for reach, low for conversion |

**The one loop to actually test at Stage 2:** report → someone else reads it → they
run one → they share one. If that loop does not turn, nothing else on this list
compensates, and the honest response is to shrink the ambition rather than buy
distribution.

## 11. Moat — a skeptical assessment

**The question:** what stops a competent developer from copying this in two weeks?

**Answer: nothing about the tool.** The suite, the adapters, the report layout and the
scorers are all copyable in under two weeks by anyone who reads this repository.
Claiming otherwise would be exactly the fake moat the brief warns about.

| Candidate moat | Real or fake | Assessment |
|---|---|---|
| The suite (30 cases) | **Fake** | Public, small, trivially reproducible. A starting point, not an asset |
| Report UI and design tokens | **Fake** | Already visible in `components/` |
| Provider adapters | **Fake** | Two adapters is an afternoon |
| Deterministic scorers | **Fake** | Well-understood rules |
| **Pinned baseline history tied to a user's workload** | **Real, but per-user** | Switching means abandoning the comparisons that make each new run meaningful. Compounds slowly, and only if retention ([K1](./MVP.md#8-kill-criteria)) holds |
| **Accumulated release-day history** | **Real** | A record of what each model change did to each capability, built up across releases, is genuinely hard to backfill ([E2](./docs/research.md#2-evidence-register)) |
| **CI/CD adoption inside a team's repository** | **Real — the strongest** | Workflow lock-in with a visible cost to removal. Nothing else here changes behaviour inside a customer's engineering process |
| **Reputation as a neutral third party** | **Real, but slow** | Vendors cannot credibly occupy it ([E4](./docs/research.md#2-evidence-register)). Earned by being right and transparent, not by claiming it |
| Community and contributors | Real, late | Only once the OSS release earns it |
| Proprietary evaluators | **Fake** | Any good evaluator is publishable, and publishing it *is* the trust argument |

**Honest conclusion:** this product has **no early moat**. It has a wedge, an
artefact, and a plausible compounding asset that only starts compounding after
retention is proven. The defensible parts — **workflow position and accumulated
history** — are both downstream of the Stage 2 retention gate. That is a reason to
validate cheaply, not a reason to believe the idea is safe.

**Lane A note (2026-09-20).** For repository trials the moat question has a
different answer: the concept is already being built by at least six independent
projects ([E17](./docs/research.md#2-evidence-register)) with negligible engagement
([E18](./docs/research.md#2-evidence-register)), so *the concept is not the moat*
there either. The defensible differences are the trust behaviours —
verifier-validity refusal, honest small-n verdicts ([D25](./docs/decisions.md#d25--no-measurable-difference-and-inconclusive-are-verdicts)),
setup identity ([D22](./docs/decisions.md#d22--the-measurement-unit-is-the-setup-not-the-model)) —
which are cheap to copy but expensive to copy *credibly*.
