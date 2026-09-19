/** Owns the pre-flight cost estimate and the spend guard (MVP §4.4, EVALUATIONS.md §8.1). */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { PlannedRun } from "../types.js";

/** Average token assumptions for estimation only. Adjusted against real usage
 * token counts once the executor exists; never presented as a measurement. */
const ASSUMED_INPUT_TOKENS_PER_REQUEST = 1_000;
const ASSUMED_OUTPUT_TOKENS_PER_REQUEST = 500;

export interface PriceEntry {
  input_per_1k: number;
  output_per_1k: number;
  currency: "USD";
  date: string;
  source: string;
  /** True when the gateway lists the model as a time-limited free promotion.
   * The zero is a promotion, not a missing price (D15). */
  free_promo?: boolean;
}

interface PriceTable {
  currency: string;
  updated: string;
  provider_prefixes?: Record<string, string>;
  prices: Record<string, PriceEntry>;
}

export type CostEstimate =
  | { basis: "estimated"; total_usd: number; price: PriceEntry; price_table_ref: string }
  | { basis: "unpriced"; total_usd: "unpriced"; price_table_ref: string };

export class SpendLimitError extends Error {}

export const PRICE_TABLE_REF = "cli/src/config/prices.json (dated snapshot)";

/** Reads the committed price table (cli/src/config/prices.json). tsc copies the
 * JSON beside the compiled modules, so the same relative path resolves from both
 * src/ and dist/ (EVALUATIONS.md §9: a report references the table it used). */
export function loadPriceTable(): PriceTable {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const require = createRequire(import.meta.url);
  const tablePath = path.resolve(here, "..", "config", "prices.json");
  const table = require(tablePath) as PriceTable;
  if (table.currency !== "USD" || typeof table.prices !== "object" || table.prices === null) {
    throw new Error(`Price table "${tablePath}" is malformed. It must declare currency "USD" and a prices object.`);
  }
  for (const [key, entry] of Object.entries(table.prices)) {
    if (!key.includes("/")) {
      throw new Error(`Price table "${tablePath}" key "${key}" is invalid. Keys must be provider/model.`);
    }
    if (entry.currency !== "USD") {
      throw new Error(`Price table entry "${key}" must declare currency "USD".`);
    }
    if (!/\d{4}-\d{2}-\d{2}/.test(entry.date) || typeof entry.source !== "string" || entry.source.length === 0) {
      throw new Error(`Price table entry "${key}" must carry a date and a source. Unverifiable prices are not committed (AGENTS.md Hard Rule 1, D15).`);
    }
  }
  return table;
}

/** Looks up `provider/model` (e.g. "openai/gpt-4o", "anthropic/claude-sonnet-5").
 * A bare id resolves via the table's provider_prefixes (e.g. "claude-" →
 * "anthropic"), then falls back to "openai/<id>". Unknown providers stay
 * unpriced — never mispriced. */
export function findPrice(table: PriceTable, model: string): PriceEntry | undefined {
  if (table.prices[model]) {
    return table.prices[model];
  }
  if (!model.includes("/")) {
    for (const [prefix, provider] of Object.entries(table.provider_prefixes ?? {})) {
      const key = `${provider}/${model}`;
      if (model.startsWith(prefix) && table.prices[key]) {
        return table.prices[key];
      }
    }
    return table.prices[`openai/${model}`];
  }
  return undefined;
}

export function estimateCost(planned: PlannedRun, model: string, table: PriceTable): CostEstimate {
  const price = findPrice(table, model);

  if (price === undefined) {
    // A missing price is not zero (EVALUATIONS.md §8.1).
    return { basis: "unpriced", total_usd: "unpriced", price_table_ref: PRICE_TABLE_REF };
  }

  const requests = planned.estimated_requests;
  const inputCost = (requests * ASSUMED_INPUT_TOKENS_PER_REQUEST / 1_000) * price.input_per_1k;
  const outputCost = (requests * ASSUMED_OUTPUT_TOKENS_PER_REQUEST / 1_000) * price.output_per_1k;

  return {
    basis: "estimated",
    total_usd: inputCost + outputCost,
    price,
    price_table_ref: PRICE_TABLE_REF,
  };
}

export function assertWithinSpendLimit(estimate: CostEstimate, spendLimit: number): void {
  if (estimate.basis !== "estimated" || spendLimit <= 0) {
    return;
  }
  if (estimate.total_usd > spendLimit) {
    throw new SpendLimitError(
      `Estimated spend $${estimate.total_usd.toFixed(4)} exceeds the spend limit of $${spendLimit.toFixed(2)}. Lower --repeat, pick a cheaper model, or raise --spend-limit.`,
    );
  }
}

export function formatEstimateLine(estimate: CostEstimate, model: string): string {
  if (estimate.basis === "unpriced") {
    return `Model "${model}" is not in the price table — cost: unpriced. The run will still proceed; no total will be shown.`;
  }
  if (estimate.price.free_promo === true) {
    return `Estimated charge (not actual cost): $0.00 — gateway lists "${model}" as a free promotion. Promotions can end without notice; the run proceeds at $0 only while the promo is live. Source: ${estimate.price.source}`;
  }
  const p = estimate.price;
  return `Estimated charge (not actual cost): $${estimate.total_usd.toFixed(4)} — assumes ~${ASSUMED_INPUT_TOKENS_PER_REQUEST.toLocaleString()} input / ~${ASSUMED_OUTPUT_TOKENS_PER_REQUEST.toLocaleString()} output tokens per request, ${p.currency} ${p.input_per_1k}/1k in, ${p.currency} ${p.output_per_1k}/1k out. Source: ${p.source}`;
}

export function printEstimate(estimate: CostEstimate, model: string): void {
  console.error(formatEstimateLine(estimate, model));
}
