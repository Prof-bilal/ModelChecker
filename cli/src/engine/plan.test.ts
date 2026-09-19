/** Unit tests for the planner (PHASES.md Phase 1). No network, no credentials. */

import assert from "node:assert/strict";
import { test } from "node:test";

import { planRun } from "./plan.js";
import type { SuiteMeta } from "../types.js";

function fakeSuite(caseCount: number): SuiteMeta {
  return {
    id: "core",
    version: "1.0.0",
    content_hash: "0".repeat(64),
    cases: Array.from({ length: caseCount }, (_, i) => ({
      case_id: `case-${String(i + 1).padStart(3, "0")}`,
      capability: i % 2 === 0 ? "structured_output" : "tool_calling",
      version: "1",
      input: { prompt: "synthetic test input" },
      scoring: i % 2 === 0 ? ("json_schema@1" as const) : ("tool_call_match@1" as const),
      scoring_params: {},
    })),
  };
}

test("repeat=1 produces N planned cases", () => {
  const planned = planRun(fakeSuite(3), 1);
  assert.equal(planned.cases.length, 3);
  assert.equal(planned.estimated_requests, 3);
  assert.equal(planned.repeats_per_case, 1);
});

test("repeat=3 produces 3N planned cases", () => {
  const planned = planRun(fakeSuite(3), 3);
  assert.equal(planned.cases.length, 9);
  assert.equal(planned.estimated_requests, 9);
  assert.equal(planned.repeats_per_case, 3);
});

test("planned order is deterministic: case order first, repeat index second", () => {
  const planned = planRun(fakeSuite(2), 2);
  assert.deepEqual(
    planned.cases.map((c) => `${c.case_id}#${c.repeat_index}`),
    ["case-001#0", "case-001#1", "case-002#0", "case-002#1"],
  );
});

test("two plans of the same suite are identical", () => {
  const suite = fakeSuite(3);
  assert.deepEqual(planRun(suite, 1), planRun(suite, 1));
});

test("repeat below 1 is clamped to 1 rather than producing an empty run", () => {
  const planned = planRun(fakeSuite(2), 0);
  assert.equal(planned.cases.length, 2);
});
