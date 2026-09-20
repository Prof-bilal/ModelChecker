/** Shared fixture input for the golden tests (write-json.test.ts and
 * render-html.test.ts): a fixed report covering pass/fail/request_error/
 * timeout outcomes, both capabilities, partial coverage, and both cost
 * states. Editing a golden file to make a failing test pass is a review red
 * flag — regenerate only with UPDATE_GOLDEN=1 and justify the diff. */

import { aggregateCapabilities, aggregateCost, aggregateLatency, runStatus } from "../engine/aggregate.js";
import { PRICE_TABLE_REF } from "../engine/estimate.js";
import type { CaseResult, Report } from "../types.js";
import { buildReport } from "./write-json.js";

export function fixtureCases(): CaseResult[] {
  return [
    {
      case_id: "so-001",
      capability: "structured_output",
      outcome: "pass",
      score: 1,
      scoring_rule: "json_schema@1",
      raw_response: { id: "chatcmpl-fixture-1", choices: [{ message: { content: "{}" } }] },
      input_tokens: 92,
      output_tokens: 48,
      latency_ms: 812,
      attempts: 1,
      estimated_cost_usd: 0.0002,
    },
    {
      case_id: "so-002",
      capability: "structured_output",
      outcome: "pass",
      score: 1,
      scoring_rule: "json_schema@1",
      raw_response: { id: "chatcmpl-fixture-2", choices: [{ message: { content: "{}" } }] },
      input_tokens: 88,
      output_tokens: 41,
      latency_ms: 644,
      attempts: 1,
      estimated_cost_usd: 0.0002,
    },
    {
      case_id: "so-003",
      capability: "structured_output",
      outcome: "fail",
      score: 0,
      scoring_rule: "json_schema@1",
      raw_response: { id: "chatcmpl-fixture-3", choices: [{ message: { content: "I cannot comply." } }] },
      reason: "Response body is not valid JSON.",
      input_tokens: 101,
      output_tokens: 12,
      latency_ms: 501,
      attempts: 1,
      estimated_cost_usd: 0.0002,
    },
    {
      case_id: "so-004",
      capability: "structured_output",
      outcome: "request_error",
      score: null,
      scoring_rule: "json_schema@1",
      raw_response: null,
      error_class: "rate_limit",
      reason: "Provider rate limit hit (429).",
      latency_ms: 153,
      attempts: 3,
      // No estimated_cost_usd: the request never returned usage, so this case
      // is outside the cost basis — absent ≠ unpriced (unpriced = tokens known,
      // no price row; EVALUATIONS.md §8.1).
    },
    {
      case_id: "tc-001",
      capability: "tool_calling",
      outcome: "pass",
      score: 1,
      scoring_rule: "tool_call_match@1",
      raw_response: { id: "chatcmpl-fixture-5", choices: [{ message: { content: null } }] },
      input_tokens: 140,
      output_tokens: 33,
      latency_ms: 977,
      attempts: 1,
      estimated_cost_usd: 0.0002,
    },
    {
      case_id: "tc-002",
      capability: "tool_calling",
      outcome: "timeout",
      score: null,
      scoring_rule: "tool_call_match@1",
      raw_response: null,
      error_class: "timeout",
      reason: "Provider did not respond within the timeout.",
      latency_ms: 60_000,
      attempts: 1,
      // Absent for the same reason as so-004: no usage, outside the cost basis.
    },
  ];
}

export function buildFixtureReport(): Report {
  const cases = fixtureCases();
  const planned = [
    { capability: "structured_output" },
    { capability: "structured_output" },
    { capability: "structured_output" },
    { capability: "structured_output" },
    { capability: "tool_calling" },
    { capability: "tool_calling" },
    { capability: "tool_calling" },
  ];
  const capabilities = aggregateCapabilities(planned, cases);
  return buildReport({
    run_id: "20260919T120000Z-mock-golden",
    run_label: "golden",
    status: runStatus(cases, planned.length),
    started_at_utc: "2026-09-19T12:00:00Z",
    finished_at_utc: "2026-09-19T12:01:30Z",
    provider: "mock",
    endpoint_base_url: "mock://fixtures",
    requested_model: "mock/golden-model",
    resolved_model: "golden-model-2026-09-01",
    suite_id: "core",
    suite_version: "1.0.0",
    suite_content_hash: "a".repeat(64),
    planned_count: planned.length,
    repeats_per_case: 1,
    parameters: {
      temperature: "provider_default",
      max_output_tokens: "provider_default",
      seed: "unsupported",
      streaming: false,
      timeout_ms: 60_000,
      max_retries: 2,
      concurrency: 3,
    },
    cases,
    capabilities,
    cost: aggregateCost(cases, PRICE_TABLE_REF),
    latency: aggregateLatency(cases),
    modelcheck_version: "0.1.0",
  });
}
