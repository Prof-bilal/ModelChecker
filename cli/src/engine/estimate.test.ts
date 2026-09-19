/** Unit tests for cost estimation and the price lookup (PHASES.md Phase 1, D15). */

import assert from "node:assert/strict";
import { test } from "node:test";

import { estimateCost, findPrice, loadPriceTable } from "./estimate.js";
import type { PlannedRun } from "../types.js";

function fakePlanned(requests: number): PlannedRun {
  return {
    suite: {
      id: "core",
      version: "1.0.0",
      content_hash: "0".repeat(64),
      cases: [],
    },
    cases: [],
    repeats_per_case: 1,
    estimated_requests: requests,
  };
}

test("price table loads with USD currency and entries", () => {
  const table = loadPriceTable();
  assert.equal(table.currency, "USD");
  assert.ok(Object.keys(table.prices).length > 0);
  for (const [key, entry] of Object.entries(table.prices)) {
    assert.ok(key.includes("/"), `price key "${key}" must be provider/model`);
    assert.equal(entry.currency, "USD");
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(entry.source.startsWith("http"), `entry "${key}" must cite a source URL`);
    if (entry.free_promo === true) {
      // A promotion's zero is explicit and intentional; anything else is bad data.
      assert.equal(entry.input_per_1k, 0, `free promo "${key}" must be 0-priced`);
      assert.equal(entry.output_per_1k, 0, `free promo "${key}" must be 0-priced`);
    } else {
      assert.ok(entry.input_per_1k > 0 && entry.output_per_1k > 0, `entry "${key}" must be positively priced`);
    }
  }
});

test("free-promo model estimates $0 and says the promotion can end", () => {
  const table = loadPriceTable();
  const price = findPrice(table, "opencode/big-pickle");
  assert.ok(price && price.free_promo === true);
  const estimate = estimateCost(fakePlanned(3), "opencode/big-pickle", table);
  assert.ok(estimate.basis === "estimated");
  assert.equal(estimate.total_usd, 0);
});

test("prefixed model ids look up directly", () => {
  const table = loadPriceTable();
  assert.ok(findPrice(table, "openai/gpt-4o"));
  assert.ok(findPrice(table, "anthropic/claude-sonnet-5"));
});

test("bare Anthropic id resolves via provider_prefixes (claude- → anthropic)", () => {
  const table = loadPriceTable();
  const prefixed = findPrice(table, "anthropic/claude-sonnet-5");
  const bare = findPrice(table, "claude-sonnet-5");
  assert.ok(prefixed);
  assert.equal(bare, prefixed);
});

test("bare claude id that no openai row claims is not mispriced as openai", () => {
  const table = loadPriceTable();
  const bare = findPrice(table, "claude-sonnet-5");
  const openaiRow = table.prices["openai/claude-sonnet-5"];
  assert.ok(bare);
  assert.notEqual(bare, openaiRow);
});

test("bare OpenAI id falls back to the openai/ prefix", () => {
  const table = loadPriceTable();
  assert.equal(findPrice(table, "gpt-4o"), findPrice(table, "openai/gpt-4o"));
});

test("unknown model is unpriced, never zero", () => {
  const table = loadPriceTable();
  assert.equal(findPrice(table, "acme/mystery-model"), undefined);
  const estimate = estimateCost(fakePlanned(3), "acme/mystery-model", table);
  assert.equal(estimate.basis, "unpriced");
  assert.equal(estimate.total_usd, "unpriced");
});

test("estimate scales with the planned request count", () => {
  const table = loadPriceTable();
  const price = findPrice(table, "openai/gpt-4o");
  assert.ok(price);

  const one = estimateCost(fakePlanned(1), "openai/gpt-4o", table);
  const three = estimateCost(fakePlanned(3), "openai/gpt-4o", table);
  assert.ok(one.basis === "estimated" && three.basis === "estimated");
  assert.equal(three.total_usd, one.total_usd * 3);
});
