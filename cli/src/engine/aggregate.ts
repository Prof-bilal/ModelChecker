/** Owns aggregation (PHASES.md Phase 4): per-capability outcome counts,
 * coverage, run status, latency percentiles and cost, satisfying the
 * denominator invariants in ARCHITECTURE.md §4 and TESTING.md §5.2. */

import type { CapabilityAggregate, CaseResult, ReportCost, ReportLatency, RunStatus } from "../types.js";

/** The two denominator invariants (ARCHITECTURE.md §4). Asserted by tests and
 * by the report writer — a report violating them is never written. */
export function assertInvariants(cap: CapabilityAggregate): void {
  const scored = cap.pass + cap.fail + cap.partial;
  if (scored !== cap.scored) {
    throw new Error(
      `Invariant broken for capability "${cap.capability}": scored (${cap.scored}) != pass + fail + partial (${scored}). Report not written.`,
    );
  }
  const settled = cap.scored + cap.request_errors + cap.scoring_errors + cap.timeouts;
  if (settled !== cap.settled) {
    throw new Error(
      `Invariant broken for capability "${cap.capability}": settled (${cap.settled}) != scored + request_errors + scoring_errors + timeouts (${settled}). Report not written.`,
    );
  }
  if (cap.planned < cap.settled) {
    throw new Error(
      `Invariant broken for capability "${cap.capability}": planned (${cap.planned}) < settled (${cap.settled}). Report not written.`,
    );
  }
}

function emptyAggregate(capability: string, planned: number): CapabilityAggregate {
  return {
    capability,
    planned,
    settled: 0,
    scored: 0,
    pass: 0,
    fail: 0,
    partial: 0,
    request_errors: 0,
    scoring_errors: 0,
    timeouts: 0,
    coverage: 0,
  };
}

/** Aggregates case results per capability. Capabilities are derived from the
 * planned case list, so a capability with zero settled cases appears with zero
 * counts — the *renderer* decides "not tested" vs 0 (D4), the aggregate only
 * reports what happened. */
export function aggregateCapabilities(planned: Array<{ capability: string }>, results: CaseResult[]): CapabilityAggregate[] {
  const order: string[] = [];
  const plannedCounts = new Map<string, number>();
  for (const unit of planned) {
    if (!plannedCounts.has(unit.capability)) {
      order.push(unit.capability);
    }
    plannedCounts.set(unit.capability, (plannedCounts.get(unit.capability) ?? 0) + 1);
  }

  const aggregates = new Map<string, CapabilityAggregate>();
  for (const capability of order) {
    aggregates.set(capability, emptyAggregate(capability, plannedCounts.get(capability) ?? 0));
  }

  for (const result of results) {
    const cap = aggregates.get(result.capability);
    if (cap === undefined) {
      // A result for a capability that was never planned cannot exist; if it
      // does, the run is inconsistent — fail loudly rather than silently absorb.
      throw new Error(`Result for case "${result.case_id}" has capability "${result.capability}" which was never planned. Run is inconsistent.`);
    }
    cap.settled += 1;
    switch (result.outcome) {
      case "pass":
        cap.pass += 1;
        cap.scored += 1;
        break;
      case "fail":
        cap.fail += 1;
        cap.scored += 1;
        break;
      case "partial":
        cap.partial += 1;
        cap.scored += 1;
        break;
      case "request_error":
        cap.request_errors += 1;
        break;
      case "scoring_error":
        cap.scoring_errors += 1;
        break;
      case "timeout":
        cap.timeouts += 1;
        break;
      case "skipped":
      case "not_run":
        // Terminal but not settled-error classes: counted in settled, in no bucket.
        break;
    }
    cap.coverage = cap.planned > 0 ? cap.scored / cap.planned : 0;
  }
  for (const cap of aggregates.values()) {
    cap.coverage = cap.planned > 0 ? cap.scored / cap.planned : 0;
  }
  return order.map((capability) => aggregates.get(capability) as CapabilityAggregate);
}

/** Run status per ARCHITECTURE.md §5.3: gaps are visible, never absorbed. */
export function runStatus(results: CaseResult[], plannedCount: number): RunStatus {
  if (results.length === 0 && plannedCount > 0) {
    return "failed";
  }
  if (results.length < plannedCount) {
    return "completed_with_gaps";
  }
  const hasErrors = results.some(
    (r) => r.outcome === "request_error" || r.outcome === "scoring_error" || r.outcome === "timeout",
  );
  return hasErrors ? "completed_with_gaps" : "completed";
}

/** Latency percentiles over scored samples. p95 is reported only at n ≥ 20;
 * below that it is `not_available` with the reason (EVALUATIONS.md §8.2). */
export function aggregateLatency(results: CaseResult[]): ReportLatency {
  const samples = results
    .filter((r) => r.outcome === "pass" || r.outcome === "fail" || r.outcome === "partial")
    .map((r) => r.latency_ms)
    .filter((ms): ms is number => typeof ms === "number" && ms >= 0);

  if (samples.length === 0) {
    return { p50_ms: 0, p95_ms: "not_available", n: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (p: number): number => {
    const idx = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
    return sorted[Math.max(0, idx)] as number;
  };
  const p50 = at(0.5);
  const p95 = sorted.length >= 20 ? at(0.95) : "not_available";
  return { p50_ms: p50, p95_ms: p95, n: sorted.length };
}

/** Run-level cost from per-case estimated costs (provider token counts × the
 * dated price table). If any priced case exists the total is `estimated`; a
 * wholly unpriced run stays `unpriced` — a missing price is never zero
 * (EVALUATIONS.md §8.1). */
export function aggregateCost(results: CaseResult[], priceTableRef: string): ReportCost {
  let total = 0;
  let hasPriced = false;
  let hasUnpriced = false;
  for (const r of results) {
    if (r.estimated_cost_usd === "unpriced") {
      hasUnpriced = true;
    } else if (typeof r.estimated_cost_usd === "number") {
      total += r.estimated_cost_usd;
      hasPriced = true;
    }
  }
  if (!hasPriced) {
    return { total_usd: "unpriced", basis: "unpriced", price_table_ref: priceTableRef };
  }
  if (hasUnpriced) {
    // Mixed: some cases priced, some not. The total would be a partial sum
    // pretending to be a total — refuse rather than misreport (Hard Rule 2).
    throw new Error("Cost aggregation found both priced and unpriced cases. A partial total would misreport spend. Report not written.");
  }
  return {
    total_usd: Math.round(total * 1e6) / 1e6,
    basis: "estimated",
    price_table_ref: priceTableRef,
  };
}
