/** Tests repository command validation and both flows without network calls. */

import assert from "node:assert/strict";
import { test } from "node:test";

import { modelForProvider, repoCommand } from "./repo.js";
import type { Report, RepositoryProfile } from "../types.js";

const PROFILE: RepositoryProfile = {
  root: "/project", languages: [], frameworks: [], projectTypes: ["application/library"],
  packageManagers: [], databaseTechnologies: [],
  repoSize: { files: 0, sourceFiles: 0, estimatedLines: 0, bytesScanned: 0, truncated: false },
  hasTests: false, hasCi: false, architectureSignals: [], detectedTechnologies: [], relevantFiles: [],
  exclusions: { ignored: 0, sensitive: 0, binary: 0, oversized: 0, unreadable: 0 },
  limits: { maxFiles: 1, maxFileBytes: 1, maxTotalBytes: 1 },
};

const REPORT: Report = {
  schema_version: "1.0.0", modelcheck_version: "0.1.0", run_id: "run-test", status: "completed",
  started_at_utc: "2026-01-01T00:00:00Z", finished_at_utc: "2026-01-01T00:01:00Z",
  provider: "mock", endpoint_base_url: "mock://fixtures", requested_model: "openrouter/anthropic/claude-sonnet-4.5",
  resolved_model: "anthropic/claude-sonnet-4.5", suite_id: "core", suite_version: "1.0.0",
  suite_content_hash: "a".repeat(64), planned_count: 1, repeats_per_case: 1,
  parameters: { temperature: "provider_default", max_output_tokens: "provider_default", seed: "unsupported", streaming: false, timeout_ms: 1, max_retries: 0, concurrency: 1 },
  cases: [{ case_id: "x", capability: "structured_output", outcome: "pass", score: 1, scoring_rule: "json_schema@1", raw_response: {}, latency_ms: 10, attempts: 1 }],
  capabilities: [{ capability: "structured_output", planned: 1, settled: 1, scored: 1, pass: 1, fail: 0, partial: 0, request_errors: 0, scoring_errors: 0, timeouts: 0, coverage: 1 }],
  cost: { total_usd: "unpriced", basis: "unpriced", price_table_ref: "test" },
  latency: { p50_ms: 10, p95_ms: "not_available", n: 1 }, limitations: ["test"],
};

test("OpenRouter route preserves vendor/model and uses the existing gateway convention", () => {
  assert.deepEqual(modelForProvider("anthropic/claude-sonnet-4.5", "openrouter"), {
    model: "openrouter/anthropic/claude-sonnet-4.5", provider: "openrouter",
  });
  assert.deepEqual(modelForProvider("openrouter/openai/gpt-4o", "openrouter"), {
    model: "openrouter/openai/gpt-4o", provider: "openrouter",
  });
});

test("provider/model validation rejects missing, unsupported, and conflicting values", () => {
  assert.throws(() => modelForProvider("openai/gpt-4o", "unknown"), /unsupported/);
  assert.throws(() => modelForProvider("", "openrouter"), /invalid/);
  assert.throws(() => modelForProvider("gpt-4o", "openrouter"), /unsupported/);
  assert.throws(() => modelForProvider("openai/gpt-4o", "anthropic"), /unsupported/);
  assert.throws(() => modelForProvider("anthropic/", "anthropic"), /missing its wire id/);
});

test("repository-only flow scans and returns an evidence-qualified recommendation", async () => {
  let evaluated = false;
  const result = await repoCommand(["/project"], {}, {
    scan: async () => PROFILE,
    loadReports: async () => [],
    runEvaluation: async () => { evaluated = true; return { report: REPORT, reportPath: "", runDir: "" }; },
  });
  assert.equal(evaluated, false);
  assert.equal(result.recommendation?.recommended, undefined);
  assert.equal(result.profile.root, "/project");
});

test("explicit model/provider flow reuses the existing evaluation command", async () => {
  let received: Record<string, unknown> | undefined;
  const result = await repoCommand(["/project", "anthropic/claude-sonnet-4.5", "openrouter"], {}, {
    scan: async () => PROFILE,
    loadReports: async () => [],
    runEvaluation: async (values) => {
      received = values;
      return { report: REPORT, reportPath: "/tmp/report.json", runDir: "/tmp/run" };
    },
  });
  assert.equal(received?.model, "openrouter/anthropic/claude-sonnet-4.5");
  assert.equal(received?.suite, "core");
  assert.equal(result.provider, "openrouter");
  assert.equal(result.evaluation?.run_id, "run-test");
});

test("explicit flow rejects a missing model before evaluation", async () => {
  let evaluated = false;
  await assert.rejects(
    () => repoCommand(["/project", "", "openrouter"], {}, {
      scan: async () => PROFILE,
      loadReports: async () => [],
      runEvaluation: async () => { evaluated = true; return { report: REPORT, reportPath: "", runDir: "" }; },
    }),
    /Model is required/,
  );
  assert.equal(evaluated, false);
});
