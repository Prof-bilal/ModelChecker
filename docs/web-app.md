# ModelCheck — Web App Information Architecture

**Version:** 0.1 · **Date:** 2026-09-20 · **Status:** **designed, not scheduled**
**This file owns:** the future web information architecture and screen flow. It is a plan,
not scope. Scope is [MVP.md](../MVP.md); the CLI is the product until a validation gate says
otherwise ([ROADMAP.md](../ROADMAP.md)); positioning is [PRODUCT.md](../PRODUCT.md).

> **Read this first.** The MVP is a local CLI and the *report* is the interface
> ([D1](./decisions.md), [PRODUCT §7](../PRODUCT.md#7-what-modelcheck-must-not-become)).
> Nothing in this document may be built before the Trial MVP has produced real trials and
> the retention gate has been met. The first web artefact is a **static `trial.html`**, not
> an application.

---

## 1. Principles

1. **One screen, one job.** The wizard below deliberately splits four decisions that most
   products collapse into a single form.
2. **Evidence outranks layout.** Every number expands to the check, hunk, exit code or raw
   response that produced it ([PRODUCT P1](../PRODUCT.md#2-product-principles)).
3. **No dashboard home.** The landing page leads to a *list of trials*, not a wall of
   tiles. A dashboard of scores is the anti-pattern this product exists to replace.
4. **Absence is visible.** `not tested`, `not executed`, `case invalid` and `inconclusive`
   render as text, never as `0`, never as an empty cell ([D4](./decisions.md)).
5. **Local-first.** Context assembly, snapshots and verification happen on the user's
   machine. Until the [SECURITY §8 gate](../SECURITY.md#8-what-changes-when-a-server-exists-stage-2-re-review-gate)
   is satisfied, the web app must not hold a provider key.

## 2. Screen flow

```text
/  landing  (exists — claims corrected per U2/U3/U4)
        │
        ▼
/trials                     list of trials: repo · task · models · verdict label · date
        │
        ├──► /trials/new    four steps, one decision each
        │        1  Project & snapshot   repo, commit, dirty state, environment
        │        2  Task & context       prompt, file selection, manifest,
        │                                redaction preview, size + token estimate
        │        3  Models & budget      candidate, baseline, repeats, spend cap,
        │                                provider pin, ZDR
        │        4  Review & run         exactly what will be sent, cost estimate,
        │                                and what this n can detect (MDE)
        │
        ▼
/trials/[id]                the verdict, evidence first
        A outcome matrix (model × repeat) with pass^k
        B comparison state: better · worse · no measurable difference · inconclusive
        C what changed: diff + scope findings, each linked to its hunk
        D cost · tokens · latency (streaming off; latency is ours, not the gateway's)
        E route identity: provider, canonical_slug, quantization, ZDR flag
        F limitations and what was NOT measured
        │
        ▼
/cases   (V2)               saved evaluation cases — the personal benchmark
```

## 3. Screens

| Route | Job | Primary action | Must show | Empty / error states |
|---|---|---|---|---|
| `/` | Explain the product and show one real artefact | Read a report excerpt | Honest capability list; no unbuilt feature presented as shipped | — |
| `/trials` | Find a previous trial | Open one, or start a new one | Repo, task, models, verdict label, date, cost | Empty: how to run the first trial; unreadable file: name the path |
| `/trials/new` step 1 | Fix the starting state | Confirm snapshot | Commit, tracked-file hash, dirty state, environment | Dirty tree: explain why it is refused and how to override |
| `/trials/new` step 2 | Decide what the model sees | Approve the manifest | File list with sizes and *why each is included*, exclusions with reasons, redactions, token estimate | > context budget: offer exclusion, never truncate silently |
| `/trials/new` step 3 | Fix the comparison | Confirm models and budget | Candidate, baseline, repeats, spend cap, provider pin, ZDR | Unpriced model: show `unpriced`, never `$0` |
| `/trials/new` step 4 | Consent to spend | Run | The exact requests, estimated charge, and the minimum detectable effect for this `tasks × repeats` | Over budget: refuse and explain |
| `/trials/[id]` | Decide | Read the evidence | A–F above, in that order | `not executed`, `case invalid`, `completed_with_gaps` all render as themselves |
| `/cases` (V2) | Reuse a task | Freeze a case | Version, verifier-validity state, last run | Invalid verifier: refuse to re-use until fixed |

## 4. Deliberately absent

No dashboard, no score tiles, no charts of scores, no "best model" badge, no model
marketplace, no live leaderboard, no team management, no billing, no notification centre,
no dark-pattern onboarding, no decorative motion on instrument surfaces
([PRODUCT §4](../PRODUCT.md#4-ux-principles)).

## 5. Sequencing

| Step | Artefact | Gate |
|---|---|---|
| 1 | `trial.html`, rendered from `trial.json` by the existing renderer | Trial MVP ships |
| 2 | A local viewer for a trial directory (read-only, no server) | ≥ 10 distinct users have run a trial |
| 3 | `/trials` + `/trials/[id]` served over an *uploaded or local* trial file | Retention gate ([ROADMAP.md](../ROADMAP.md)) |
| 4 | `/trials/new` (launching a local runner or a consented remote runner) | Only after the [SECURITY §8 gate](../SECURITY.md#8-what-changes-when-a-server-exists-stage-2-re-review-gate) |
