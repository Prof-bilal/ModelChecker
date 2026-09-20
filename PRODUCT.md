# ModelCheck — Product Definition

**Version:** 0.2 · **Date:** 2026-09-18 · **Status:** research-derived
**This file owns:** principles, positioning, voice, and the negative space. It owns no facts — evidence is in [docs/research.md](./docs/research.md), scope in [MVP.md](./MVP.md), intent in [PRD.md](./PRD.md).

## 1. Positioning

> **ModelCheck measures what a model change does to the capability you ship —
> and shows its evidence.**

**Added 2026-09-20 — the repository-aware framing (Lane A):**

> **ModelCheck runs one real task from your repository against an unfamiliar model and
> shows you the evidence — the tests it broke, the files it touched, and what it cost —
> before you trust it with your code.**

Both sentences describe one product: *a decision, with the evidence attached*. Lane B
measures a **named capability** on a fixed, versioned suite. Lane A measures **one real
task on your repository**. Lane A is the active build line ([MVP.md](./MVP.md)); Lane B is
shipped and keeps its contract ([docs/benchmarks.md](./docs/benchmarks.md)). The unit is
the same in both: a **delta against a pinned reference**, never a score on its own
([D2](./docs/decisions.md)).

**Primary user, Lane A:** the engineer who owns an existing repository and is about to
adopt a coding model or agent for it.
**Primary user, Lane B (unchanged):** the early engineer who owns a structured or
tool-using LLM feature ([PRD §2](./PRD.md#2-target-user)).

Not "a benchmark platform". Not "an eval framework". Not "an AI leaderboard". Not "a
repository leaderboard" either — see §7.

The comparison that matters is always **two runs against each other**, and the
default candidate is *the model you already run*. A single score is an
intermediate, not the product ([decisions D2](./docs/decisions.md)).

**One sentence for the landing page (proposed):**
*"A model changed. Find out what it did to your workload — with the evidence attached."*

**What we are the alternative to:** reading an index score and guessing.

## 2. Product principles

| # | Principle | Consequence if violated |
|---|---|---|
| P1 | **Every claim links to its measurement, which links to its cases.** | The report becomes an opinion — the thing we exist to replace. |
| P2 | **Deterministic results and model-judged results are never the same kind of number.** | We recreate the credibility problem of [E1](./docs/research.md#2-evidence-register). |
| P3 | **"Not tested" is a first-class answer. Never 0, never inferred.** | Users read absence as failure ([D4](./docs/decisions.md)). |
| P4 | **Quality, latency, cost and completion are four separate facts.** | A fast cheap wrong answer looks like a win. |
| P5 | **A result is a snapshot with an identity, not a claim about a model forever.** | Stale numbers get quoted as current truth. |
| P6 | **Precision must be earned by the method.** No third decimal on 20 cases. | Fake precision — what [D11](./docs/decisions.md) forbids. |
| P7 | **The user's key, prompts and outputs are theirs.** Local by default. | Privacy becomes the reason not to try it ([SECURITY.md](./SECURITY.md)). |
| P8 | **Nothing here is a black box.** Suites, scorers and limits are readable. | Trust is the whole product. |

## 3. Trust principles

Trust is the only durable asset, because the category's ranking layer has already
spent its credibility ([E1](./docs/research.md#2-evidence-register)). It is earned
by four cheap, mandatory mechanisms:

1. **Reproducibility over repeatability.** We promise the *procedure* is recorded,
   not that a model answers identically. Sampling and provider non-determinism make
   output-level reproduction a lie.
2. **Provenance over polish.** A raw output a user can read beats a smoothed score
   they must believe.
3. **Reduced claims.** "48 of 50 structured-output cases parsed" — never "96%
   capable". A denominator is always present.
4. **Disclosed weakness.** What was not tested appears in the body, not a footnote.

## 4. UX principles

Inherited from `../design.md` §15–§21 and retained.

- **The report is the demonstration.** Show the artefact before asking for credentials.
- **One screen, one job.** Connect → Configure → Review; never seven simultaneous decisions.
- **Never blame the user.** A 429 or an outage is a system state, not a mistake.
- **No decorative motion, no stat-tile walls, no trophy.** This is an instrument.
- **Density with escape hatches.** Detail is fine when the reader can isolate one
  question; every filter has a visible reset.
- **Color never carries meaning alone.** Pass/fail, delta direction and intervals all
  have text.

## 5. Product language

**Use:** measured, resolved, scored, settled, planned, not tested, estimated
charge, coverage, outcome, reference, rubric, baseline, candidate, delta.

**Never use:** intelligence, smartest, beats, crushes, best-in-class,
state-of-the-art, pass/fail without a denominator, "our benchmark" as an appeal to
authority, anything implying a universal ranking.

**Finding pattern:** *capability → result with denominator → optional comparison →
caveat → link to cases.*

> Correct: "Tool calling: 23 of 30 cases selected the correct function (77%); 6
> chose a valid function with invalid arguments; long context was not tested."
>
> Wrong: "Excellent tool-calling performance."

## 6. Core loop

```text
model changes → run against capability → delta vs baseline → decide
      ↑                                                        │
      └────── repeat event, with the baseline already saved ────┘
```

The loop only closes if the baseline **persists**. That is why the baseline — not
the suite — is the unit of value ([research I4](./docs/research.md#3-interpretation-of-the-evidence)).

## 7. What ModelCheck must NOT become

Each is a real, tempting failure mode. All are rejected in
[decisions §5](./docs/decisions.md#5-rejected-options-recorded-so-they-are-not-re-litigated).

| Anti-pattern | Why it is fatal here |
|---|---|
| **Another benchmark website** | The exact thing the brief says to avoid, and it is commodity ([E3](./docs/research.md#2-evidence-register)). |
| **An eval framework / SDK** | Head-on with promptfoo (25,254★) and lm-evaluation-harness (14,016★). |
| **An observability platform** | Needs production traffic we do not have ([E6](./docs/research.md#2-evidence-register)). |
| **A leaderboard** | The contested object of [E1](./docs/research.md#2-evidence-register); permanent upkeep, no user-owned output. |
| **A dashboard of scores** | `../design.md` §21 rejects it; the report *is* the interface. |
| **A model router / gateway** | Different buyer, different product, already commoditized. |
| **An "AI adoption advisor"** | A generative verdict is an opinion; P1 and `../design.md` §10 forbid it. |
| **A compliance-marketing product** | Trust must come from measurement validity, not badges. |
| **A platform before a tool** | Accounts, teams and billing before one measurement is theatre. |

## 8. The one-sentence test

If a proposed feature cannot be described as "makes *the delta between two runs*
more trustworthy, faster, or easier to act on", it is out of scope — however good
it is.