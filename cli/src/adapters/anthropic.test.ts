/** Unit tests for the Anthropic Messages API adapter (PHASES.md Phase 2/6,
 * MVP §4.3). No network: request shaping and normalisation are pure, and the
 * one transport test stubs `fetch` with a canned response. */

import assert from "node:assert/strict";
import { test } from "node:test";

import { ANTHROPIC_API_VERSION, ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS, AnthropicAdapter } from "./anthropic.js";
import { ProviderError } from "../lib/errors.js";
import type { AdapterRequest } from "./types.js";

const CONFIG = {
  base_url: "https://api.example.com/v1",
  api_key: "test-key-not-real",
  model: "claude-sonnet-5",
};

function makeRequest(overrides: Partial<AdapterRequest> = {}): AdapterRequest {
  return {
    model: "claude-sonnet-5",
    messages: [{ role: "user", content: "hello" }],
    temperature: "provider_default",
    max_output_tokens: "provider_default",
    timeout_ms: 1000,
    ...overrides,
  };
}

test("buildRequest targets {base_url}/messages with x-api-key and a pinned version", () => {
  const adapter = new AnthropicAdapter(CONFIG);
  const { url, headers, body } = adapter.buildRequest(makeRequest());

  assert.equal(url, "https://api.example.com/v1/messages");
  assert.notEqual(url, "https://api.example.com/v1/chat/completions");
  assert.equal(headers["x-api-key"], "test-key-not-real");
  assert.equal(headers["anthropic-version"], ANTHROPIC_API_VERSION);
  assert.equal(headers.Authorization, undefined, "the Messages API uses x-api-key, not Bearer");
  assert.equal(body.model, "claude-sonnet-5");
  assert.deepEqual(body.messages, [{ role: "user", content: "hello" }]);
});

test("max_tokens is always sent: provider_default maps to the documented ceiling", () => {
  const adapter = new AnthropicAdapter(CONFIG);
  assert.equal(adapter.buildRequest(makeRequest()).body.max_tokens, ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS);
  assert.equal(adapter.buildRequest(makeRequest({ max_output_tokens: 128 })).body.max_tokens, 128);
});

test("provider_default temperature is omitted; an explicit one is sent", () => {
  const adapter = new AnthropicAdapter(CONFIG);
  assert.ok(!("temperature" in adapter.buildRequest(makeRequest()).body));
  assert.equal(adapter.buildRequest(makeRequest({ temperature: 0 })).body.temperature, 0);
});

test("a system message is hoisted to the top-level system field", () => {
  const adapter = new AnthropicAdapter(CONFIG);
  const { body } = adapter.buildRequest(
    makeRequest({
      messages: [
        { role: "system", content: "Answer only in JSON." },
        { role: "user", content: "hello" },
      ],
    }),
  );
  assert.equal(body.system, "Answer only in JSON.");
  assert.deepEqual(body.messages, [{ role: "user", content: "hello" }]);
});

test("suite tool declarations translate to the Messages API shape", () => {
  const adapter = new AnthropicAdapter(CONFIG);
  const { body } = adapter.buildRequest(
    makeRequest({
      tools: [
        {
          type: "function",
          function: {
            name: "get_weather",
            description: "Get current weather for a city",
            parameters: { type: "object", properties: { location: { type: "string" } }, required: ["location"] },
          },
        },
      ],
    }),
  );
  assert.deepEqual(body.tools, [
    {
      name: "get_weather",
      description: "Get current weather for a city",
      input_schema: { type: "object", properties: { location: { type: "string" } }, required: ["location"] },
    },
  ]);
});

test("normaliseResponse extracts text blocks, usage and the resolved model", () => {
  const adapter = new AnthropicAdapter(CONFIG);
  const response = adapter.normaliseResponse(
    {
      id: "msg_1",
      type: "message",
      model: "claude-sonnet-5-20260101",
      content: [{ type: "text", text: "{\"a\":1}" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 11, output_tokens: 7 },
    },
    123,
  );

  assert.equal(response.content, "{\"a\":1}");
  assert.equal(response.tool_calls, null);
  assert.equal(response.usage?.input_tokens, 11);
  assert.equal(response.usage?.output_tokens, 7);
  assert.equal(response.latency_ms, 123);
  assert.equal(adapter.resolvedModel(), "claude-sonnet-5-20260101");
});

test("normaliseResponse turns tool_use blocks into JSON-string arguments", () => {
  const adapter = new AnthropicAdapter(CONFIG);
  const response = adapter.normaliseResponse(
    {
      model: "claude-sonnet-5",
      content: [
        { type: "text", text: "Let me check." },
        { type: "tool_use", id: "toolu_1", name: "get_weather", input: { location: "Lisbon" } },
      ],
      usage: { input_tokens: 20, output_tokens: 12 },
    },
    5,
  );

  assert.ok(response.tool_calls);
  assert.equal(response.tool_calls[0].name, "get_weather");
  assert.deepEqual(JSON.parse(response.tool_calls[0].arguments), { location: "Lisbon" });
});

test("normaliseResponse rejects an error payload as malformed", () => {
  const adapter = new AnthropicAdapter(CONFIG);
  assert.throws(
    () => adapter.normaliseResponse({ type: "error", error: { type: "invalid_request_error", message: "bad model" } }, 1),
    (error: unknown) => error instanceof ProviderError && error.error_class === "malformed",
  );
});

test("send classifies a 401 as auth, names the provider, and never echoes the key", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
  try {
    const error = await new AnthropicAdapter(CONFIG)
      .send(makeRequest())
      .then(() => undefined, (e: unknown) => e);
    assert.ok(error instanceof ProviderError);
    assert.equal(error.error_class, "auth");
    assert.equal(error.status, 401);
    assert.match(error.message, /api\.example\.com/, "the error names the provider host");
    assert.match(error.message, /401/, "the error names the status");
    assert.ok(!error.message.includes(CONFIG.api_key), "the key never reaches an error message");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("identify() carries the label; the key never appears in it", () => {
  const adapter = new AnthropicAdapter({ ...CONFIG, label: "anthropic" });
  assert.equal(adapter.identify(), "anthropic (anthropic)");
  assert.ok(!adapter.identify().includes(CONFIG.api_key));
});

test("refuses the cloud metadata endpoint", () => {
  assert.throws(() => new AnthropicAdapter({ ...CONFIG, base_url: "http://169.254.169.254" }), /metadata service/);
});

test("does not follow a cross-origin redirect with credentials", async () => {
  const originalFetch = globalThis.fetch;
  let seen: RequestInit | undefined;
  globalThis.fetch = (async (_input, init) => {
    seen = init;
    return new Response(null, { status: 302, headers: { location: "https://evil.example/steal" } });
  }) as typeof fetch;
  try {
    await assert.rejects(new AnthropicAdapter(CONFIG).send(makeRequest()), /different origin/);
    assert.equal(seen?.redirect, "manual");
  } finally {
    globalThis.fetch = originalFetch;
  }
});