/** Exercises full-response deadlines and size bounds with in-memory fetch doubles. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { requestProviderJson } from "./provider-http.js";
import { ProviderError } from "../lib/errors.js";

test("deadline covers a stalled response body after headers arrive", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"pending":')); } }));
  try {
    await assert.rejects(requestProviderJson("https://provider.example/v1", {}, {}, 30), (e) => e instanceof ProviderError && e.error_class === "timeout");
  } finally { globalThis.fetch = original; }
});
test("response limit rejects oversized payloads without JSON parsing", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("x".repeat(8 * 1024 * 1024 + 1));
  try { await assert.rejects(requestProviderJson("https://provider.example/v1", {}, {}, 1000), /8 MiB/); }
  finally { globalThis.fetch = original; }
});
test("valid body is returned with measured latency and malformed JSON is classified", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{"ok":true}');
    const result = await requestProviderJson("https://provider.example/v1", {}, {}, 1000);
    assert.deepEqual(result.payload, { ok: true }); assert.ok(result.latency_ms >= 0);
    globalThis.fetch = async () => new Response("not JSON");
    await assert.rejects(requestProviderJson("https://provider.example/v1", {}, {}, 1000), (e) => e instanceof ProviderError && e.error_class === "malformed");
  } finally { globalThis.fetch = original; }
});
