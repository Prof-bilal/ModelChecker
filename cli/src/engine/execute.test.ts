/** Unit tests for the executor (PHASES.md Phase 2). Uses the mock adapter —
 * no real provider call is ever made (TESTING.md §1). */

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { MockAdapter } from "../adapters/mock.js";
import { executeRun } from "./execute.js";
import { ProviderError } from "../lib/errors.js";
import type { AdapterRequest } from "../adapters/types.js";

function makeRequest(model = "gpt-4o"): AdapterRequest {
  return {
    model,
    messages: [{ role: "user", content: "hello" }],
    temperature: "provider_default",
    max_output_tokens: "provider_default",
    timeout_ms: 1000,
  };
}

test("mock adapter returns the so-001 fixture with usage and resolved model", async () => {
  const adapter = new MockAdapter();
  const request = makeRequest() as AdapterRequest & { case_id?: string };
  request.case_id = "so-001";
  const response = await adapter.send(request);

  assert.equal(adapter.identify(), "mock");
  assert.equal(adapter.resolvedModel(), "gpt-4o");
  assert.equal(response.usage?.input_tokens, 92);
  assert.match(String(response.content ?? ""), /INV-2031/);
});

test("mock adapter returns the tc-001 fixture tool call", async () => {
  const adapter = new MockAdapter();
  const request = makeRequest() as AdapterRequest & { case_id?: string };
  request.case_id = "tc-001";
  const response = await adapter.send(request);

  assert.ok(response.tool_calls);
  assert.equal(response.tool_calls[0].name, "get_weather");
});

test("mock adapter surfaces auth errors from scenario fixtures", async () => {
  const adapter = new MockAdapter({ scenario: "401" });
  const request = makeRequest() as AdapterRequest & { case_id?: string };
  request.case_id = "so-001";
  await assert.rejects(() => adapter.send(request), (error: unknown) => {
    assert.ok(error instanceof Error && "error_class" in error);
    return true;
  });
});

test("executeRun maps settled units to results in order and persists raw responses", async () => {
  const rawDir = await mkdtemp(path.join(tmpdir(), "modelcheck-raw-"));
  try {
    const adapter = new MockAdapter();
    const units = [
      { case_id: "so-001", repeat_index: 0, capability: "structured_output", request: withCase("so-001") },
      { case_id: "tc-001", repeat_index: 0, capability: "tool_calling", request: withCase("tc-001") },
    ];

    const results = await executeRun({ adapter, units, concurrency: 2, maxRetries: 0, rawDir });

    assert.equal(results.length, 2);
    assert.deepEqual(results.map((r) => r.case_id), ["so-001", "tc-001"]);
    for (const result of results) {
      assert.equal(result.outcome, "pass");
      assert.equal(result.attempts, 1);
      assert.ok(typeof result.latency_ms === "number");
    }

    const raw = await readFile(path.join(rawDir, "so-001.json"), "utf8");
    assert.match(raw, /chatcmpl-synthetic-so-001/);
  } finally {
    await rm(rawDir, { recursive: true, force: true });
  }
});

test("missing fixture becomes request_error with reason, not a crash", async () => {
  const adapter = new MockAdapter();
  const units = [
    { case_id: "does-not-exist", repeat_index: 0, capability: "structured_output", request: withCase("does-not-exist") },
  ];
  const results = await executeRun({ adapter, units, concurrency: 1, maxRetries: 0 });
  assert.equal(results.length, 1);
  assert.equal(results[0].outcome, "request_error");
  assert.match(String(results[0].reason), /fixture/i);
});

test("terminal auth error is not retried: attempts stays 1 and outcome is request_error", async () => {
  const adapter = new MockAdapter({ scenario: "401" });
  const units = [
    { case_id: "so-001", repeat_index: 0, capability: "structured_output", request: withCase("so-001") },
  ];
  const results = await executeRun({ adapter, units, concurrency: 1, maxRetries: 2 });
  assert.equal(results.length, 1);
  assert.equal(results[0].attempts, 1, "auth must never be retried");
  assert.equal(results[0].outcome, "request_error");
  assert.equal(results[0].error_class, "auth");
  assert.match(String(results[0].reason), /API key/i);
});

test("retryable rate_limit is retried to the bound: attempts = maxRetries + 1", { timeout: 5000 }, async () => {
  const adapter = new MockAdapter({ scenario: "429" });
  const units = [
    { case_id: "so-001", repeat_index: 0, capability: "structured_output", request: withCase("so-001") },
  ];
  const results = await executeRun({ adapter, units, concurrency: 1, maxRetries: 2 });
  assert.equal(results.length, 1);
  assert.equal(results[0].attempts, 3, "initial attempt + 2 retries");
  assert.equal(results[0].outcome, "request_error");
  assert.equal(results[0].error_class, "rate_limit");
});

test("server errors (5xx) retry to the bound and keep error_class server", { timeout: 5000 }, async () => {
  const adapter = new MockAdapter({ scenario: "500" });
  const units = [
    { case_id: "so-001", repeat_index: 0, capability: "structured_output", request: withCase("so-001") },
  ];
  const results = await executeRun({ adapter, units, concurrency: 1, maxRetries: 1 });
  assert.equal(results[0].attempts, 2);
  assert.equal(results[0].error_class, "server");
});

test("timeout is a terminal outcome, not a retry loop", async () => {
  const adapter = new MockAdapter({ scenario: "timeout" });
  const units = [
    { case_id: "so-001", repeat_index: 0, capability: "structured_output", request: withCase("so-001") },
  ];
  const results = await executeRun({ adapter, units, concurrency: 1, maxRetries: 2 });
  assert.equal(results.length, 1);
  assert.equal(results[0].attempts, 1, "a timeout must not enter the retry loop");
  assert.equal(results[0].outcome, "timeout");
  assert.equal(results[0].error_class, "timeout");
});

test("maxRetries 0 means one attempt, no retries", async () => {
  const adapter = new MockAdapter({ scenario: "500" });
  const units = [
    { case_id: "so-001", repeat_index: 0, capability: "structured_output", request: withCase("so-001") },
  ];
  const results = await executeRun({ adapter, units, concurrency: 1, maxRetries: 0 });
  assert.equal(results[0].attempts, 1);
});

test("a retryable failure followed by success retries and records attempts > 1", { timeout: 5000 }, async () => {
  // The file-based mock fails on every attempt, so this scripted adapter
  // simulates one 429 then success — the recorded `attempts` is the point of
  // ARCHITECTURE.md §5.2: a retry never silently replaces the original outcome.
  let calls = 0;
  const scripted = {
    identify: () => "scripted",
    resolvedModel: () => "gpt-4o",
    send: async () => {
      calls += 1;
      if (calls === 1) {
        throw new ProviderError("rate_limit", "Provider rate limit hit (429).", 429, 1);
      }
      const adapter = new MockAdapter();
      const request = withCase("so-001");
      return adapter.send(request);
    },
  };
  const units = [
    { case_id: "so-001", repeat_index: 0, capability: "structured_output", request: withCase("so-001") },
  ];
  const results = await executeRun({ adapter: scripted, units, concurrency: 1, maxRetries: 2 });
  assert.equal(calls, 2);
  assert.equal(results[0].attempts, 2);
  assert.equal(results[0].outcome, "pass");
});

function withCase(caseId: string): AdapterRequest & { case_id: string } {
  return { ...makeRequest(), case_id: caseId };
}
