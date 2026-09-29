/** Tests honest recommendation logic without network calls or invented evidence. */

import assert from "node:assert/strict";
import { test } from "node:test";

import { recommendModels } from "./recommend.js";
import type { Report, RepositoryProfile } from "../types.js";

const PROFILE: RepositoryProfile = {
  root: "/project",
  languages: [{ name: "TypeScript", files: 60 }],
  frameworks: ["React"],
  projectTypes: ["frontend"],
  packageManagers: ["npm"],
  databaseTechnologies: [],
  repoSize: { files: 70, sourceFiles: 60, estimatedLines: 5_000, bytesScanned: 10_000, truncated: false },
  hasTests: true,
  hasCi: false,
  architectureSignals: ["multi-file reasoning likely"],
  detectedTechnologies: ["React", "TypeScript", "npm"],
  relevantFiles: ["package.json"],
  exclusions: { ignored: 0, sensitive: 0, binary: 0, oversized: 0, unreadable: 0 },
  limits: { maxFiles: 10_000, maxFileBytes: 1, maxTotalBytes: 1 },
};

function report(model: string, structuredPass: number, toolPass: number): Report {
  return {
    schema_version: "1.0.0", modelcheck_version: "0.1.0", run_id: `run-${model}`,
    status: "completed", started_at_utc: "2026-01-01T00:00:00Z", finished_at_utc: "2026-01-01T00:01:00Z",
    provider: model.split("/")[0]!, endpoint_base_url: "mock://fixtures", requested_model: model,
    resolved_model: model, suite_id: "core", suite_version: "1.0.0", suite_content_hash: "a".repeat(64),
    planned_count: 20, repeats_per_case: 1,
    parameters: { temperature: "provider_default", max_output_tokens: "provider_default", seed: "unsupported", streaming: false, timeout_ms: 1, max_retries: 0, concurrency: 1 },
    cases: [],
    capabilities: [
      { capability: "structured_output", planned: 10, settled: 10, scored: 10, pass: structuredPass, fail: 10 - structuredPass, partial: 0, request_errors: 0, scoring_errors: 0, timeouts: 0, coverage: 1 },
      { capability: "tool_calling", planned: 10, settled: 10, scored: 10, pass: toolPass, fail: 10 - toolPass, partial: 0, request_errors: 0, scoring_errors: 0, timeouts: 0, coverage: 1 },
    ],
    cost: { total_usd: "unpriced", basis: "unpriced", price_table_ref: "test" },
    latency: { p50_ms: 1, p95_ms: "not_available", n: 0 }, limitations: ["test"],
  };
}

test("missing evaluation data yields no fabricated recommendation", () => {
  const result = recommendModels(PROFILE, []);
  assert.equal(result.recommended, undefined);
  assert.equal(result.evidenceStatus, "insufficient-local-evidence");
  assert.match(result.reasons.at(-1) ?? "", /Fewer than two/);
});

test("a model is recommended only when it dominates comparable runs per capability", () => {
  const result = recommendModels(PROFILE, [
    report("openai/a", 9, 8),
    report("anthropic/b", 8, 7),
  ]);
  assert.equal(result.recommended?.model, "openai/a");
  assert.equal(result.alternatives[0]?.model, "anthropic/b");
  assert.equal(result.evidenceStatus, "tested-with-modelcheck");
});

test("split capability winners do not produce a synthetic overall winner", () => {
  const result = recommendModels(PROFILE, [
    report("openai/a", 9, 6),
    report("anthropic/b", 7, 9),
  ]);
  assert.equal(result.recommended, undefined);
  assert.equal(result.alternatives.length, 2);
});
