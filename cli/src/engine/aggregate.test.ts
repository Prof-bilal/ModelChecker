/** Unit tests for aggregation (TESTING.md §5.2): denominator invariants,
 * coverage basis, absence vs zero, and the p95 rule. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aggregateCapabilities,
  aggregateCost,
  aggregateLatency,
  assertInvariants,
  runStatus,
} from "./aggregate.js";
import type { CaseResult, Outcome } from "../types.js";

let seq = 0;
function result(outcome: Outcome, capability = "structured_output", overrides: Partial<CaseResult> = {}): CaseResult {
  seq += 1;
  return {
    case_id: `case-${seq}`,
    capability,
    outcome,
    score: outcome === "pass" ? 1 : outcome === "partial" ? 0.5 : outcome === "fail" ? 0 : null,
    scoring_rule: "json_schema@1",
    raw_response: null,
    latency_ms: 100,
    attempts: 1,
    ...overrides,
  };
}

describe("aggregateCapabilities: denominators", () => {
  it("scored = pass + fail + partial", () => {
    const results = [
      result("pass"),
      result("fail"),
      result("partial"),
      result("pass"),
    ];
    const [cap] = aggregateCapabilities(
      results.map((r) => ({ capability: r.capability })),
      results,
    );
    assert.equal(cap.scored, 4);
    assert.equal(cap.pass + cap.fail + cap.partial, cap.scored);
    assertInvariants(cap); // must not throw
  });

  it("settled = scored + request_errors + scoring_errors + timeouts", () => {
    const results = [
      result("pass"),
      result("fail"),
      result("request_error"),
      result("scoring_error"),
      result("timeout"),
    ];
    const [cap] = aggregateCapabilities(
      results.map((r) => ({ capability: r.capability })),
      results,
    );
    assert.equal(cap.settled, 5);
    assert.equal(cap.scored + cap.request_errors + cap.scoring_errors + cap.timeouts, cap.settled);
    assertInvariants(cap);
  });

  it("planned ≥ settled when some cases never settled", () => {
    const planned = [
      { capability: "structured_output" },
      { capability: "structured_output" },
      { capability: "structured_output" },
    ];
    const results = [result("pass"), result("fail")];
    const [cap] = aggregateCapabilities(planned, results);
    assert.equal(cap.planned, 3);
    assert.equal(cap.settled, 2);
    assert.ok(cap.planned >= cap.settled);
    assertInvariants(cap);
  });

  it("coverage = scored / planned, NOT scored / settled", () => {
    const planned = [
      { capability: "structured_output" },
      { capability: "structured_output" },
      { capability: "structured_output" },
      { capability: "structured_output" },
    ];
    const results = [result("pass"), result("pass"), result("request_error")];
    const [cap] = aggregateCapabilities(planned, results);
    assert.equal(cap.scored, 2);
    assert.equal(cap.settled, 3);
    assert.equal(cap.planned, 4);
    // 2/4 = 0.5, not 2/3
    assert.equal(cap.coverage, 0.5);
  });

  it("counts errors per class within a capability", () => {
    const results = [
      result("request_error"),
      result("request_error"),
      result("scoring_error"),
      result("timeout"),
    ];
    const [cap] = aggregateCapabilities(
      results.map((r) => ({ capability: r.capability })),
      results,
    );
    assert.equal(cap.request_errors, 2);
    assert.equal(cap.scoring_errors, 1);
    assert.equal(cap.timeouts, 1);
    assert.equal(cap.scored, 0);
  });

  it("a result for an unplanned capability is refused, not absorbed", () => {
    const results = [result("pass", "coding")];
    assert.throws(
      () => aggregateCapabilities([{ capability: "structured_output" }], results),
      /never planned/,
    );
  });
});

describe("aggregateCapabilities: capability absence (D4)", () => {
  it("a capability with zero planned cases is absent from the aggregate list", () => {
    // Only structured_output was planned; tool_calling was not.
    const results = [result("pass")];
    const caps = aggregateCapabilities([{ capability: "structured_output" }], results);
    assert.equal(caps.length, 1);
    assert.equal(caps[0].capability, "structured_output");
    assert.ok(!caps.some((c) => c.capability === "tool_calling"));
    // Absent capability → the renderer shows "not tested", never 0.
  });

  it("a planned capability with zero settled cases appears with zero counts", () => {
    const caps = aggregateCapabilities(
      [{ capability: "tool_calling" }, { capability: "tool_calling" }],
      [],
    );
    assert.equal(caps.length, 1);
    assert.equal(caps[0].capability, "tool_calling");
    assert.equal(caps[0].planned, 2);
    assert.equal(caps[0].settled, 0);
    assert.equal(caps[0].scored, 0);
    assert.equal(caps[0].coverage, 0);
    assertInvariants(caps[0]);
  });
});

describe("runStatus", () => {
  it("all settled cleanly → completed", () => {
    const results = [result("pass"), result("fail")];
    assert.equal(runStatus(results, 2), "completed");
  });

  it("any request_error / scoring_error / timeout → completed_with_gaps", () => {
    assert.equal(runStatus([result("pass"), result("request_error")], 2), "completed_with_gaps");
    assert.equal(runStatus([result("pass"), result("scoring_error")], 2), "completed_with_gaps");
    assert.equal(runStatus([result("pass"), result("timeout")], 2), "completed_with_gaps");
  });

  it("fewer results than planned → completed_with_gaps", () => {
    assert.equal(runStatus([result("pass")], 3), "completed_with_gaps");
  });

  it("nothing settled out of planned → failed", () => {
    assert.equal(runStatus([], 3), "failed");
  });

  it("a fail outcome is a real result, not a gap", () => {
    assert.equal(runStatus([result("fail")], 1), "completed");
  });
});

describe("aggregateLatency: the p95 rule (EVALUATIONS.md §8.2)", () => {
  it("n < 20 → p95 is not_available, p50 numeric", () => {
    const results = Array.from({ length: 19 }, (_, i) => result("pass", "structured_output", { latency_ms: i + 1 }));
    const latency = aggregateLatency(results);
    assert.equal(latency.n, 19);
    assert.equal(latency.p95_ms, "not_available");
    assert.equal(typeof latency.p50_ms, "number");
  });

  it("n = 20 → p95 is numeric", () => {
    const results = Array.from({ length: 20 }, (_, i) => result("pass", "structured_output", { latency_ms: (i + 1) * 10 }));
    const latency = aggregateLatency(results);
    assert.equal(latency.n, 20);
    assert.equal(typeof latency.p95_ms, "number");
    // Nearest-rank p95 of 20 sorted samples: the 19th value (190), not the max.
    assert.equal(latency.p95_ms, 190);
    assert.equal(latency.p50_ms, 100); // 10th of 20 sorted
  });

  it("error outcomes are excluded from latency samples", () => {
    const results = [
      ...Array.from({ length: 25 }, () => result("pass", "structured_output", { latency_ms: 100 })),
      result("request_error", "structured_output", { latency_ms: 9999 }),
    ];
    const latency = aggregateLatency(results);
    assert.equal(latency.n, 25);
  });

  it("no scored samples → n = 0 and p50 is 0, not invented", () => {
    const latency = aggregateLatency([result("request_error")]);
    assert.equal(latency.n, 0);
    assert.equal(latency.p50_ms, 0);
    assert.equal(latency.p95_ms, "not_available");
  });
});

describe("aggregateCost", () => {
  const REF = "cli/src/config/prices.json (dated snapshot)";

  it("all cases priced → estimated total is the sum", () => {
    const results = [
      result("pass", "structured_output", { estimated_cost_usd: 0.001 }),
      result("pass", "structured_output", { estimated_cost_usd: 0.0025 }),
    ];
    const cost = aggregateCost(results, REF);
    assert.equal(cost.basis, "estimated");
    assert.equal(cost.total_usd, 0.0035);
  });

  it("all cases unpriced → unpriced, never zero", () => {
    const results = [
      result("pass", "structured_output", { estimated_cost_usd: "unpriced" }),
      result("fail", "structured_output", { estimated_cost_usd: "unpriced" }),
    ];
    const cost = aggregateCost(results, REF);
    assert.equal(cost.basis, "unpriced");
    assert.equal(cost.total_usd, "unpriced");
  });

  it("mixed priced/unpriced → refused, a partial total would misreport spend", () => {
    const results = [
      result("pass", "structured_output", { estimated_cost_usd: 0.001 }),
      result("pass", "structured_output", { estimated_cost_usd: "unpriced" }),
    ];
    assert.throws(() => aggregateCost(results, REF), /misreport/);
  });

  it("no results → unpriced", () => {
    const cost = aggregateCost([], REF);
    assert.equal(cost.total_usd, "unpriced");
  });
});
