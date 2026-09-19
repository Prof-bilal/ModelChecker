/** Owns orchestration of the run command: load → plan → estimate → print.
 * Execution arrives in Phase 2 (PHASES.md). */

import { UsageError } from "../lib/args.js";
import {
  assertWithinSpendLimit,
  estimateCost,
  loadPriceTable,
  printEstimate,
} from "../engine/estimate.js";
import { planRun } from "../engine/plan.js";
import { loadSuite } from "../engine/suite-loader.js";

/** Official endpoint per provider. A user-supplied --base-url overrides these
 * (SECURITY.md: an explicit base URL is the user's choice as operator). */
const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

/** The API-key environment variable expected per provider when --api-key-env
 * is not given. Only the *name* is ever handled here, never a key value. */
const DEFAULT_API_KEY_ENVS: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

/** Resolves the provider from a `provider/model` id (D15 lookup convention). */
export function resolveProvider(model: string): string | undefined {
  const slash = model.indexOf("/");
  return slash === -1 ? undefined : model.slice(0, slash);
}

function stringValue(values: Record<string, unknown>, key: string): string | undefined {
  const value = values[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(values: Record<string, unknown>, key: string): number | undefined {
  const value = values[key];
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function runCommand(values: Record<string, unknown> = {}): Promise<void> {
  const suiteId = stringValue(values, "suite") ?? "core";
  const model = stringValue(values, "model");
  const repeat = numberValue(values, "repeat") ?? 1;
  const spendLimit = numberValue(values, "spend-limit");
  const baseUrl = stringValue(values, "base-url");
  const apiKeyEnv = stringValue(values, "api-key-env");

  if (Number.isNaN(repeat) || repeat < 1) {
    throw new UsageError(`--repeat "${String(values.repeat)}" is not a positive number. Pass an integer of 1 or more.`);
  }
  if (spendLimit !== undefined && (Number.isNaN(spendLimit) || spendLimit <= 0)) {
    throw new UsageError(`--spend-limit "${String(values["spend-limit"])}" is not a positive number. Pass a USD amount, e.g. --spend-limit 5.`);
  }
  if (model === undefined) {
    throw new UsageError(`--model is required for "run". Pass the model id, e.g. modelcheck run --suite core --model openai/gpt-4o.`);
  }
  if (baseUrl !== undefined && !/^https?:\/\//.test(baseUrl)) {
    throw new UsageError(`--base-url "${baseUrl}" is not an HTTP(S) URL. Pass the provider's API root, e.g. https://openrouter.ai/api/v1.`);
  }
  if (apiKeyEnv !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(apiKeyEnv)) {
    throw new UsageError(`--api-key-env "${apiKeyEnv}" is not a valid environment variable name. Pass the NAME of the env var that holds the key, never the key itself.`);
  }

  const provider = resolveProvider(model);
  const effectiveBaseUrl = baseUrl ?? (provider !== undefined ? DEFAULT_BASE_URLS[provider] : undefined);
  const effectiveKeyEnv = apiKeyEnv ?? (provider !== undefined ? DEFAULT_API_KEY_ENVS[provider] : undefined);

  const suite = await loadSuite(suiteId, "1.0.0");
  const planned = planRun(suite, repeat);

  const table = loadPriceTable();
  const estimate = estimateCost(planned, model, table);
  if (spendLimit !== undefined) {
    assertWithinSpendLimit(estimate, spendLimit);
  }

  // Human-readable progress goes to stderr (CODESTYLE.md §2.5).
  console.error(`Suite ${suite.id}@${suite.version} loaded (hash ${suite.content_hash.slice(0, 12)}…), ${suite.cases.length} cases.`);
  for (const c of suite.cases) {
    console.error(`  ${c.case_id}  ${c.capability}  ${c.scoring}  v${c.version}`);
  }
  console.error(
    `${planned.cases.length} cases planned (${planned.repeats_per_case} repeat(s) per case). Estimated requests: ${planned.estimated_requests}.`,
  );
  printEstimate(estimate, model);

  if (effectiveBaseUrl !== undefined) {
    const keyStatus =
      effectiveKeyEnv === undefined
        ? "no key variable configured"
        : process.env[effectiveKeyEnv] !== undefined && process.env[effectiveKeyEnv] !== ""
          ? `set (${effectiveKeyEnv})`
          : `NOT set (${effectiveKeyEnv})`;
    console.error(`Target: ${effectiveBaseUrl} with model ${model}; API key ${keyStatus}.`);
  } else {
    console.error(`Target: provider "${String(provider)}" has no default endpoint. Pass --base-url, e.g. --base-url https://openrouter.ai/api/v1.`);
  }

  console.error("Execution is not implemented yet — nothing was run.");
}
