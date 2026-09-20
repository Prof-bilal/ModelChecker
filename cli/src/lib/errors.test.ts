/** Error-path tests (PHASES.md Phase 7, TESTING.md §5.3): the failures that
 * would destroy trust in a result if they were absorbed or misreported.
 * Every test here uses a fixture or a scripted adapter — no real provider call
 * is ever made (TESTING.md §1, AGENTS.md Hard Rule 5). */

import assert from "node:assert/strict";
import { test } from "node:test";

import { MockAdapter } from "../adapters/mock.js";
import { OpenAICompatibleAdapter } from "../adapters/openai-compatible.js";
import type { AdapterRequest, ModelAdapter } from "../adapters/types.js";
import { aggregateCapabilities, aggregateCost, runStatus } from "../engine/aggregate.js";
import { caseCost, PRICE_TABLE_REF } from "../engine/estimate.js";
import { executeRun } from "../engine/execute.js";
import { ProviderError } from "../lib/errors.js";
import { redactSecrets } from "../lib/redact.js";
import type { CaseResult } from "../types.js";

const SENTINEL_KEY = "sentinel-credential-401-do-not-leak";
const PROVIDER_HOST = "provider.example";

function makeRequest(caseId: string): AdapterRequest & { case_id: string } {
  return {
    model: "gpt-4o",
    messages: [{ role: "user", content: "hello" }],
    temperature: "provider_default",
    max_output_tokens: "provider_default",
    timeout_ms: 1000,
    case_id: caseId,
  };
}

function unit(caseId: string, capability: string) {
  return { case_id: caseId, repeat_index: 0, capability, request: makeRequest(caseId) };
}

function unpricedCase(caseId: string): CaseResult {
  return {
    case_id: caseId,
    capability: "structured_output",
    outcome: "pass",
    score: null,
    scoring_rule: "json_schema@1",
    raw_response: { choices: [] },
    input_tokens: 10,
    output_tokens: 5,
    latency_ms: 10,
    attempts: 1,
    estimated_cost_usd: "unpriced",
  };
}

test("401: the run stops on the first attempt, names the provider and status, and leaks no credential", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: { message: "invalid api key", type: "authentication_error" } }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
  try {
    const adapter = new OpenAICompatibleAdapter({
      base_url: `https://${PROVIDER_HOST}/v1`,
      api_key: SENTINEL_KEY,
      model: "gpt-4o",
    });

    // 1. The error itself names the provider and the status.
    const error = await adapter.send(makeRequest("so-001")).then(() => undefined, (e: unknown) => e);
    assert.ok(error instanceof ProviderError, "a 401 must surface as a ProviderError");
    assert.equal(error.error_class, "auth");
    assert.equal(error.status, 401);
    assert.match(error.message, new RegExp(PROVIDER_HOST), "the error names the provider");
    assert.match(error.message, /401/, "the error names the status");
    assert.ok(!error.message.includes(SENTINEL_KEY), "the key must not appear in the error message");

    // 2. The run does not start: auth is terminal, so the case is recorded on
    //    its first attempt rather than retried.
    const units = [unit("so-001", "structured_output")];
    const results = await executeRun({ adapter, units, concurrency: 1, maxRetries: 2 });
    assert.equal(results[0].outcome, "request_error");
    assert.equal(results[0].error_class, "auth");
    assert.equal(results[0].attempts, 1, "auth must never be retried");

    // 3. No credential anywhere in what the run produced.
    for (const result of results) {
      assert.ok(!JSON.stringify(result).includes(SENTINEL_KEY), `${result.case_id} carries the credential`);
      assert.equal(redactSecrets(String(result.reason), [SENTINEL_KEY]).includes(SENTINEL_KEY), false);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("429 exhaustion → request_error with error_class rate_limit, visible as a gap", { timeout: 5000 }, async () => {
  const adapter = new MockAdapter({ scenario: "429" });
  const units = [unit("so-001", "structured_output")];
  const results = await executeRun({ adapter, units, concurrency: 1, maxRetries: 2 });

  assert.equal(results[0].outcome, "request_error");
  assert.equal(results[0].error_class, "rate_limit");
  assert.equal(results[0].attempts, 3, "initial attempt + 2 retries");

  // An exhausted rate limit is not a score and not a zero: it is an error count.
  const aggregate = aggregateCapabilities(units, results)[0];
  assert.equal(aggregate.scored, 0);
  assert.equal(aggregate.request_errors, 1);
  assert.equal(aggregate.coverage, 0);
  assert.equal(runStatus(results, units.length), "completed_with_gaps");
});

test("a mid-run 5xx records the affected case as request_error without invalidating the run", { timeout: 5000 }, async () => {
  // One provider failure in the middle of a run: the failing case is retried to
  // the bound and recorded; the other case still settles.
  const scripted: ModelAdapter = {
    identify: () => `scripted (mid-run 5xx on ${PROVIDER_HOST})`,
    resolvedModel: () => "gpt-4o",
    send: async (request) => {
      if ((request as AdapterRequest & { case_id?: string }).case_id === "so-001") {
        throw new ProviderError(
          "server",
          `Provider "${PROVIDER_HOST}" server error (HTTP 500). Retry later or check the provider's status page.`,
          500,
        );
      }
      return new MockAdapter().send(request);
    },
  };

  const units = [unit("so-001", "structured_output"), unit("tc-001", "tool_calling")];
  const results = await executeRun({ adapter: scripted, units, concurrency: 1, maxRetries: 1 });

  assert.deepEqual(results.map((r) => r.case_id), ["so-001", "tc-001"]);
  assert.equal(results[0].outcome, "request_error");
  assert.equal(results[0].error_class, "server");
  assert.equal(results[0].attempts, 2, "a 5xx is retried once at --max-retries 1, then recorded");
  assert.equal(results[1].outcome, "pass", "a failure in one case must not invalidate another");

  const capabilities = aggregateCapabilities(units, results);
  const structured = capabilities.find((c) => c.capability === "structured_output");
  const toolCalling = capabilities.find((c) => c.capability === "tool_calling");
  assert.equal(structured?.request_errors, 1);
  assert.equal(structured?.scored, 0);
  assert.equal(toolCalling?.pass, 1);

  // The run completed its work but has a visible gap — never "completed".
  assert.equal(runStatus(results, units.length), "completed_with_gaps");
});

test("an unpriced model stays unpriced — never zero, never a fabricated total", () => {
  const empty = aggregateCost([], PRICE_TABLE_REF);
  assert.equal(empty.basis, "unpriced");
  assert.equal(empty.total_usd, "unpriced");

  const cost = aggregateCost([unpricedCase("so-001"), unpricedCase("so-002")], PRICE_TABLE_REF);
  assert.equal(cost.basis, "unpriced");
  assert.equal(cost.total_usd, "unpriced");
  assert.notEqual(cost.total_usd, 0, "a missing price is not zero (Hard Rule 2)");
  assert.equal(cost.price_table_ref, PRICE_TABLE_REF);

  // Both directions of a missing price: no row, and no usage to price.
  assert.equal(caseCost(undefined, { input_tokens: 10, output_tokens: 5 }), "unpriced");
  assert.equal(caseCost({ input_per_1k: 1, output_per_1k: 1, currency: "USD", date: "2026-09-19", source: "test" }, undefined), "unpriced");

  // A run that mixes priced and unpriced cases refuses rather than summing a
  // partial total that would misreport spend (D18).
  const priced: CaseResult = { ...unpricedCase("so-003"), estimated_cost_usd: 0.0001 };
  assert.throws(() => aggregateCost([unpricedCase("so-001"), priced], PRICE_TABLE_REF), /both priced and unpriced/);
});