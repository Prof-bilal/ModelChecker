/** Adapter-selection tests for the run command (PHASES.md Phase 6, D17/D20).
 * Construction reads config and env only — no request is ever sent, so no
 * network call is made (TESTING.md §1). */

import assert from "node:assert/strict";
import { test } from "node:test";

import { AnthropicAdapter } from "../adapters/anthropic.js";
import { MockAdapter } from "../adapters/mock.js";
import { OpenAICompatibleAdapter } from "../adapters/openai-compatible.js";
import { ADAPTER_NAMES, isAdapterName, runCommand, selectAdapter } from "./run.js";
import { UsageError } from "../lib/args.js";

const SENTINEL_KEY = "sentinel-anthropic-key-do-not-leak";

/** Sets an env var for one test and restores the previous value afterwards. */
function withEnv<T>(name: string, value: string, fn: () => T): T {
  const previous = process.env[name];
  process.env[name] = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

test("the anthropic/ gateway prefix selects the Messages API adapter and its default endpoint", () => {
  withEnv("ANTHROPIC_API_KEY", SENTINEL_KEY, () => {
    const { adapter, baseUrl } = selectAdapter({
      model: "anthropic/claude-sonnet-5",
      baseUrl: undefined,
      apiKeyEnv: undefined,
      mock: false,
    });
    assert.ok(adapter instanceof AnthropicAdapter);
    assert.equal(baseUrl, "https://api.anthropic.com/v1");
    assert.equal(adapter.identify(), "anthropic (anthropic)");
    assert.ok(!adapter.identify().includes(SENTINEL_KEY));
  });
});

test("--adapter anthropic with a bare claude id resolves the endpoint, and the wire id drops no segment", () => {
  withEnv("ANTHROPIC_API_KEY", SENTINEL_KEY, () => {
    const { adapter } = selectAdapter({
      model: "claude-sonnet-5",
      baseUrl: undefined,
      apiKeyEnv: undefined,
      mock: false,
      adapterName: "anthropic",
    });
    assert.ok(adapter instanceof AnthropicAdapter);
    const { url, body } = (adapter as AnthropicAdapter).buildRequest({
      model: "claude-sonnet-5",
      messages: [{ role: "user", content: "hello" }],
      temperature: "provider_default",
      max_output_tokens: "provider_default",
      timeout_ms: 1000,
    });
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    assert.equal(body.model, "claude-sonnet-5");
  });
});

test("a non-anthropic model still uses the OpenAI-compatible adapter", () => {
  withEnv("OPENROUTER_API_KEY", SENTINEL_KEY, () => {
    const { adapter } = selectAdapter({
      model: "openrouter/deepseek/deepseek-v4-flash",
      baseUrl: undefined,
      apiKeyEnv: undefined,
      mock: false,
    });
    assert.ok(adapter instanceof OpenAICompatibleAdapter);
  });
});

test("the mock remains explicit-only: it is never selected by a model id", () => {
  withEnv("OPENAI_API_KEY", SENTINEL_KEY, () => {
    const { adapter, baseUrl } = selectAdapter({
      model: "openai/gpt-4o",
      baseUrl: undefined,
      apiKeyEnv: undefined,
      mock: false,
    });
    assert.ok(!(adapter instanceof MockAdapter));
    assert.notEqual(baseUrl, "mock://fixtures");
  });

  const explicitMock = selectAdapter({ model: "openai/gpt-4o", baseUrl: undefined, apiKeyEnv: undefined, mock: true, adapterName: "mock" });
  assert.ok(explicitMock.adapter instanceof MockAdapter);
});

test("an unknown --adapter is a usage error, not a silent fallback", async () => {
  assert.equal(isAdapterName("mock"), true);
  assert.equal(isAdapterName("nope"), false);
  assert.deepEqual([...ADAPTER_NAMES], ["openai-compatible", "anthropic", "mock"]);

  await assert.rejects(
    () => runCommand({ suite: "core", model: "openai/gpt-4o", adapter: "nope" }),
    (error: unknown) => error instanceof UsageError && /not a known adapter/.test(error.message),
  );
});

test("the groq/ gateway prefix selects the OpenAI-compatible adapter and its default endpoint", () => {
  withEnv("GROQ_API_KEY", SENTINEL_KEY, () => {
    const { adapter, baseUrl } = selectAdapter({
      model: "groq/llama-3.3-70b-versatile",
      baseUrl: undefined,
      apiKeyEnv: undefined,
      mock: false,
    });
    assert.ok(adapter instanceof OpenAICompatibleAdapter);
    assert.equal(baseUrl, "https://api.groq.com/openai/v1");
    assert.equal(adapter.identify(), "openai-compatible (groq)");
    assert.ok(!adapter.identify().includes(SENTINEL_KEY));
  });
});

test("the xai/ gateway prefix selects the OpenAI-compatible adapter and its default endpoint", () => {
  withEnv("XAI_API_KEY", SENTINEL_KEY, () => {
    const { adapter, baseUrl } = selectAdapter({
      model: "x-ai/grok-4.6",
      baseUrl: undefined,
      apiKeyEnv: undefined,
      mock: false,
    });
    assert.ok(adapter instanceof OpenAICompatibleAdapter);
    assert.equal(baseUrl, "https://api.x.ai/v1");
    assert.equal(adapter.identify(), "openai-compatible (xai)");
    assert.ok(!adapter.identify().includes(SENTINEL_KEY));
  });
});

test("the deepseek/ gateway prefix selects the OpenAI-compatible adapter and its default endpoint", () => {
  withEnv("DEEPSEEK_API_KEY", SENTINEL_KEY, () => {
    const { adapter, baseUrl } = selectAdapter({
      model: "deepseek/deepseek-chat",
      baseUrl: undefined,
      apiKeyEnv: undefined,
      mock: false,
    });
    assert.ok(adapter instanceof OpenAICompatibleAdapter);
    assert.equal(baseUrl, "https://api.deepseek.com");
    assert.equal(adapter.identify(), "openai-compatible (deepseek)");
    assert.ok(!adapter.identify().includes(SENTINEL_KEY));
  });
});

test("the x-ai/ alias normalizes to the xai gateway", () => {
  withEnv("XAI_API_KEY", SENTINEL_KEY, () => {
    const { adapter, baseUrl } = selectAdapter({
      model: "x-ai/grok-4.6",
      baseUrl: undefined,
      apiKeyEnv: undefined,
      mock: false,
    });
    assert.ok(adapter instanceof OpenAICompatibleAdapter);
    assert.equal(baseUrl, "https://api.x.ai/v1");
    assert.equal(adapter.identify(), "openai-compatible (xai)");
  });
});