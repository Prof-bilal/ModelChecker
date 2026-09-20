/** Owns executing planned cases against an adapter: bounded concurrency pool,
 * per-case timeout and retries (already inside the adapter), outcome mapping,
 * and verbatim raw-response persistence (ARCHITECTURE.md §5.2, §6). */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AdapterRequest, AdapterResponse, ModelAdapter } from "../adapters/types.js";
import { ProviderError } from "../lib/errors.js";
import type { CaseResult, ErrorClass, Outcome } from "../types.js";
import { backoffDelay, isRetryable, sleep } from "./retry.js";

export interface ExecuteOptions {
  adapter: ModelAdapter;
  /** Planned units in deterministic order. */
  units: Array<{ case_id: string; repeat_index: number; capability: string; request: AdapterRequest }>;
  concurrency: number;
  maxRetries: number;
  /** Directory for raw responses; created if missing. */
  rawDir?: string;
}

function outcomeForError(error: ProviderError): Outcome {
  return error.error_class === "timeout" ? "timeout" : "request_error";
}

async function sendWithRetry(
  adapter: ModelAdapter,
  request: AdapterRequest,
  maxRetries: number,
): Promise<{ response?: AdapterResponse; error?: ProviderError; attempts: number }> {
  let attempts = 0;
  for (;;) {
    attempts += 1;
    try {
      const response = await adapter.send(request);
      return { response, attempts };
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError("network", `Unexpected adapter failure: ${error instanceof Error ? error.message : String(error)}. Report this run.`);
      if (!isRetryable(providerError) || attempts > maxRetries) {
        return { error: providerError, attempts };
      }
      await sleep(backoffDelay(attempts - 1, providerError.retry_after_ms));
    }
  }
}

export async function executeRun(options: ExecuteOptions): Promise<CaseResult[]> {
  const { adapter, units, concurrency, maxRetries, rawDir } = options;
  // Results are returned in planned input order, not completion order
  // (ARCHITECTURE.md §5.2): two runs of the same suite produce identically
  // ordered results regardless of which worker finishes first.
  const results: CaseResult[] = new Array(units.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= units.length) {
        return;
      }
      const unit = units[index];
      const startedAt = Date.now();
      const { response, error, attempts } = await sendWithRetry(adapter, unit.request, maxRetries);

      if (rawDir !== undefined && response !== undefined) {
        await mkdir(rawDir, { recursive: true });
        const fileName = unit.repeat_index === 0 ? `${unit.case_id}.json` : `${unit.case_id}.r${unit.repeat_index}.json`;
        await writeFile(path.join(rawDir, fileName), JSON.stringify(response.raw, null, 2), "utf8");
      }

      const elapsed_ms = Date.now() - startedAt;

      if (error !== undefined) {
        const outcome = outcomeForError(error);
        results[index] = {
          case_id: unit.case_id,
          capability: unit.capability,
          outcome,
          score: null,
          scoring_rule: "json_schema@1",
          raw_response: null,
          error_class: error.error_class as ErrorClass,
          reason: error.message,
          latency_ms: elapsed_ms,
          attempts,
        };
        continue;
      }

      results[index] = {
        case_id: unit.case_id,
        capability: unit.capability,
        outcome: "pass",
        score: null,
        scoring_rule: "json_schema@1",
        raw_response: response!.raw,
        reason: response!.content ?? undefined,
        input_tokens: response!.usage?.input_tokens,
        output_tokens: response!.usage?.output_tokens,
        latency_ms: response!.latency_ms,
        attempts,
      };
    }
  }

  const poolSize = Math.max(1, Math.min(concurrency, units.length));
  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  return results;
}
