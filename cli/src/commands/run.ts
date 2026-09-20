/** Owns orchestration of the run command: load → plan → estimate → adapter
 * selection → execute → score → aggregate → write report.json (PHASES.md
 * Phases 2 and 4). */

import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { AnthropicAdapter, ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS } from "../adapters/anthropic.js";
import { MockAdapter } from "../adapters/mock.js";
import { OpenAICompatibleAdapter } from "../adapters/openai-compatible.js";
import type { AdapterRequest, ModelAdapter } from "../adapters/types.js";
import {
  aggregateCapabilities,
  aggregateCost,
  aggregateLatency,
  runStatus,
} from "../engine/aggregate.js";
import {
  assertWithinSpendLimit,
  caseCost,
  estimateCost,
  findPrice,
  loadPriceTable,
  PRICE_TABLE_REF,
  printEstimate,
} from "../engine/estimate.js";
import { executeRun } from "../engine/execute.js";
import { applyScoring } from "../engine/score.js";
import { planRun } from "../engine/plan.js";
import { loadSuite } from "../engine/suite-loader.js";
import { UsageError } from "../lib/args.js";
import { ConfigError } from "../lib/errors.js";
import { appendRunIndex, indexEntryFromReport, runsDirectory } from "../lib/runs.js";
import { renderReportHtmlFrom } from "../report/render-html.js";
import { buildReport, writeReportJson } from "../report/write-json.js";

/** The CLI's own version, read from package.json at build time is overkill for
 * now; kept in step manually with cli/package.json (checked by a test). */
export const MODELCHECK_VERSION = "0.1.0";

/** Run ids are directory names: keep them filesystem-safe. */
function sanitizeLabel(raw: string): string {
  return raw.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "model";
}

/** The provider label recorded in the report: the gateway prefix of the model
 * id (D15/D17 convention), or "openai" for a bare id. */
function gatewayOf(model: string): string {
  const first = model.indexOf("/");
  if (first === -1) return "openai";
  const gateway = model.slice(0, first);
  return ["openai", "anthropic", "openrouter", "opencode", "commandcode", "groq", "xai", "deepseek"].includes(gateway) ? gateway : "openai";
}

/** Official endpoint per provider. A user-supplied --base-url overrides these
 * (SECURITY.md: an explicit base URL is the user's choice as operator). */
const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  xai: "https://api.x.ai/v1",
  deepseek: "https://api.deepseek.com",
};

/** The API-key environment variable expected per provider when --api-key-env
 * is not given. Only the *name* is ever handled here, never a key value. */
const DEFAULT_API_KEY_ENVS: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  groq: "GROQ_API_KEY",
  xai: "XAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

/** Gateways whose wire ids are relative to the gateway (strip our prefix).
 * E.g. --model openrouter/deepseek/deepseek-v4-flash sends "deepseek/deepseek-v4-flash". */
const GATEWAY_PREFIXES = ["openai", "anthropic", "openrouter", "opencode", "commandcode", "groq", "xai", "x-ai", "deepseek"] as const;

/** Normalizes a raw gateway prefix to the canonical form used in reports and
 * config lookups. E.g. "x-ai" → "xai". */
function normalizeGateway(raw: string): string {
  return raw === "x-ai" ? "xai" : raw;
}

/** Resolves `gateway[/vendor]/model` → { gateway, wireId } (D15/D17 convention). */
export function resolveModel(model: string): { gateway: string | undefined; wireId: string } {
  const first = model.indexOf("/");
  if (first === -1) {
    return { gateway: undefined, wireId: model };
  }
  const rawGateway = model.slice(0, first);
  if ((GATEWAY_PREFIXES as readonly string[]).includes(rawGateway)) {
    return { gateway: normalizeGateway(rawGateway), wireId: model.slice(first + 1) };
  }
  // Not a known gateway prefix: the whole string is the wire id (e.g. an
  // OpenRouter vendor-prefixed id used against --base-url directly).
  return { gateway: undefined, wireId: model };
}

/** What a completed run hands back: the validated report and where it landed.
 * Tests and future callers (index, compare) consume this instead of parsing
 * stderr. */
export interface RunResult {
  report: ReturnType<typeof buildReport>;
  reportPath: string;
  runDir: string;
}

/** Adapter names accepted by --adapter. An unknown name is a usage error rather
 * than a silent fallback — the same rule that keeps the mock explicit-only
 * (TESTING.md §4, D17). Without the flag the gateway prefix of --model decides. */
export const ADAPTER_NAMES = ["openai-compatible", "anthropic", "mock"] as const;
export type AdapterName = (typeof ADAPTER_NAMES)[number];

export function isAdapterName(value: string): value is AdapterName {
  return (ADAPTER_NAMES as readonly string[]).includes(value);
}

/** Selects the adapter for a run. The mock is explicit-only (TESTING.md §4). */
export function selectAdapter(opts: {
  model: string;
  baseUrl: string | undefined;
  apiKeyEnv: string | undefined;
  mock: boolean;
  /** Explicit --adapter value; absent → the gateway prefix of --model decides. */
  adapterName?: AdapterName;
}): { adapter: ModelAdapter; baseUrl: string; apiKeyStatus: string } {
  const { gateway, wireId } = resolveModel(opts.model);

  if (opts.mock) {
    return {
      adapter: new MockAdapter(),
      baseUrl: "mock://fixtures",
      apiKeyStatus: "not required (mock adapter)",
    };
  }

  // An explicit --adapter fixes the protocol; the model's gateway prefix then
  // only supplies the default endpoint and key variable (D16/D17).
  const protocolGateway = gateway ?? (opts.adapterName === "anthropic" ? "anthropic" : undefined);
  const baseUrl = opts.baseUrl ?? (protocolGateway !== undefined ? DEFAULT_BASE_URLS[protocolGateway] : undefined);
  const apiKeyEnv = opts.apiKeyEnv ?? (protocolGateway !== undefined ? DEFAULT_API_KEY_ENVS[protocolGateway] : "OPENAI_API_KEY");

  if (baseUrl === undefined) {
    throw new ConfigError(`Provider "${String(protocolGateway)}" has no default endpoint. Pass --base-url, e.g. --base-url https://openrouter.ai/api/v1.`);
  }

  const keyValue = process.env[apiKeyEnv];
  const apiKeyStatus = keyValue !== undefined && keyValue !== "" ? `set (${apiKeyEnv})` : `NOT set (${apiKeyEnv})`;
  if (keyValue === undefined || keyValue === "") {
    throw new ConfigError(`API key environment variable ${apiKeyEnv} is not set. Export it before running, e.g. export ${apiKeyEnv}=… (never pass the key as an argument).`);
  }

  // The OpenAI-compatible adapter covers OpenAI and the compatible gateways in
  // the price table (MVP §4.3, D17); the Anthropic Messages API needs its own
  // wire format and is selected by the `anthropic/…` gateway prefix or
  // --adapter anthropic (PHASES.md Phase 6).
  const useAnthropic = opts.adapterName === "anthropic" || (opts.adapterName === undefined && gateway === "anthropic");
  const adapter = useAnthropic
    ? new AnthropicAdapter({
        base_url: baseUrl,
        api_key: keyValue,
        model: wireId,
        ...(gateway !== undefined ? { label: gateway } : {}),
      })
    : new OpenAICompatibleAdapter({
        base_url: baseUrl,
        api_key: keyValue,
        model: wireId,
        label: gateway,
      });
  return { adapter, baseUrl, apiKeyStatus };
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

export async function runCommand(values: Record<string, unknown> = {}): Promise<RunResult> {
  const startTime = Date.now();
  const suiteId = stringValue(values, "suite") ?? "core";
  const model = stringValue(values, "model");
  const label = stringValue(values, "label");
  const repeat = numberValue(values, "repeat") ?? 1;
  const spendLimit = numberValue(values, "spend-limit");
  const baseUrl = stringValue(values, "base-url");
  const apiKeyEnv = stringValue(values, "api-key-env");
  const concurrency = numberValue(values, "concurrency") ?? 3;
  const timeout = numberValue(values, "timeout") ?? 60_000;
  const maxRetries = numberValue(values, "max-retries") ?? 2;
  const adapterValue = stringValue(values, "adapter");
  if (adapterValue !== undefined && !isAdapterName(adapterValue)) {
    throw new UsageError(`--adapter "${adapterValue}" is not a known adapter. Pass one of: ${ADAPTER_NAMES.join(", ")}.`);
  }
  const adapterName = adapterValue as AdapterName | undefined;
  const mock = adapterName === "mock";

  if (Number.isNaN(repeat) || repeat < 1) {
    throw new UsageError(`--repeat "${String(values.repeat)}" is not a positive number. Pass an integer of 1 or more.`);
  }
  if (spendLimit !== undefined && (Number.isNaN(spendLimit) || spendLimit <= 0)) {
    throw new UsageError(`--spend-limit "${String(values["spend-limit"])}" is not a positive number. Pass a USD amount, e.g. --spend-limit 5.`);
  }
  if (Number.isNaN(concurrency) || concurrency < 1) {
    throw new UsageError(`--concurrency "${String(values.concurrency)}" is not a positive number. Pass an integer of 1 or more.`);
  }
  if (Number.isNaN(timeout) || timeout < 1) {
    throw new UsageError(`--timeout "${String(values.timeout)}" is not a positive number of milliseconds.`);
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

  const suite = await loadSuite(suiteId, "1.0.0");
  const planned = planRun(suite, repeat);

  const table = loadPriceTable();
  const estimate = estimateCost(planned, model, table);
  if (spendLimit !== undefined) {
    assertWithinSpendLimit(estimate, spendLimit);
  }

  const { adapter, baseUrl: effectiveBaseUrl, apiKeyStatus } = selectAdapter({
    model,
    baseUrl,
    apiKeyEnv,
    mock,
    ...(adapterName !== undefined ? { adapterName } : {}),
  });

  // Human-readable progress goes to stderr (CODESTYLE.md §2.5).
  console.error(`Suite ${suite.id}@${suite.version} loaded (hash ${suite.content_hash.slice(0, 12)}…), ${suite.cases.length} cases.`);
  console.error(`${planned.cases.length} cases planned (${planned.repeats_per_case} repeat(s) per case). Estimated requests: ${planned.estimated_requests}.`);
  printEstimate(estimate, model);
  console.error(`Target: ${effectiveBaseUrl} with model ${model} via ${adapter.identify()}; API key ${apiKeyStatus}.`);

  // The run id is the directory name under runs/ (or the mock temp dir), and
  // the report's run_id — one identity for the artefact and its location.
  const runId = `run-${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "")}-${sanitizeLabel(label ?? model)}`;
  // The run directory holds report.json; raw responses sit beside it in raw/.
  const runDir = mock
    ? await mkdtemp(path.join(tmpdir(), "modelcheck-mock-"))
    : path.join(process.env.RUNS_DIR ?? path.join(process.env.HOME ?? ".", ".modelcheck"), "runs", runId);
  const rawDir = path.join(runDir, "raw");
  await mkdir(rawDir, { recursive: true });

  const caseById = new Map(suite.cases.map((c) => [c.case_id, c]));
  const units = planned.cases
    .map((p) => {
      const c = caseById.get(p.case_id);
      if (c === undefined) {
        return undefined;
      }
      const request: AdapterRequest & { case_id: string } = {
        model: adapter instanceof MockAdapter ? model : resolveModel(model).wireId,
        messages: [{ role: "user", content: typeof c.input === "object" && c.input !== null && "prompt" in (c.input as Record<string, unknown>) ? String((c.input as Record<string, unknown>).prompt) : JSON.stringify(c.input) }],
        ...(c.tools !== undefined ? { tools: c.tools } : {}),
        temperature: "provider_default",
        max_output_tokens: "provider_default",
        timeout_ms: timeout,
        case_id: c.case_id,
      };
      return { case_id: c.case_id, repeat_index: p.repeat_index, capability: c.capability, request };
    })
    .filter((u): u is NonNullable<typeof u> => u !== undefined);

  const results = await executeRun({ adapter, units, concurrency, maxRetries, rawDir });

  // Score every settled case against its rule (Phase 3).
  const scored = results.map((r) => {
    const c = caseById.get(r.case_id);
    return c !== undefined ? applyScoring(r, c) : r;
  });

  // Per-case estimated cost from the tokens the provider actually returned
  // (EVALUATIONS.md §8.1). A case with no usage (request_error, timeout) is
  // outside the cost basis: the field stays absent, never zero. Unpriced
  // models report "unpriced" — a missing price is not zero (Hard Rule 2).
  const price = findPrice(table, model);
  const withCost = scored.map((r) => {
    if (r.input_tokens === undefined || r.output_tokens === undefined) {
      return r;
    }
    return { ...r, estimated_cost_usd: caseCost(price, { input_tokens: r.input_tokens, output_tokens: r.output_tokens }) };
  });

  const counts = new Map<string, number>();
  for (const r of withCost) {
    counts.set(r.outcome, (counts.get(r.outcome) ?? 0) + 1);
  }
  const summary = [...counts.entries()].map(([outcome, n]) => `${n} ${outcome}`).join(", ");
  console.error(`${withCost.length} case(s) scored: ${summary || "none settled"}.`);
  for (const r of withCost) {
    const reason = r.reason !== undefined && r.outcome !== "pass" ? ` — ${String(r.reason).slice(0, 120)}` : "";
    console.error(`  ${r.case_id}  ${r.outcome}${reason}`);
  }

  // Aggregate and write report.json (Phase 4). A run that violates the
  // denominator invariants or the mixed-cost rule throws — the report is
  // never written in a state that would misreport (ARCHITECTURE.md §4).
  const report = buildReport({
    run_id: runId,
    ...(label !== undefined ? { run_label: label } : {}),
    status: runStatus(withCost, planned.cases.length),
    started_at_utc: new Date(startTime).toISOString().replace(/\.\d+Z$/, "Z"),
    finished_at_utc: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    provider: mock ? "mock" : gatewayOf(model),
    endpoint_base_url: effectiveBaseUrl,
    requested_model: model,
    resolved_model: adapter.resolvedModel(),
    suite_id: suite.id,
    suite_version: suite.version,
    suite_content_hash: suite.content_hash,
    planned_count: planned.cases.length,
    repeats_per_case: planned.repeats_per_case,
    parameters: {
      temperature: "provider_default",
      // The Messages API has no provider default for max_tokens, so the
      // Anthropic adapter sends a documented ceiling. The report records the
      // value actually sent, not the request's provider_default marker
      // (EVALUATIONS.md §5.4).
      max_output_tokens:
        adapter instanceof AnthropicAdapter ? ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS : "provider_default",
      seed: "unsupported",
      streaming: false,
      timeout_ms: timeout,
      max_retries: maxRetries,
      concurrency,
    },
    cases: withCost,
    capabilities: aggregateCapabilities(units, withCost),
    cost: aggregateCost(withCost, PRICE_TABLE_REF),
    latency: aggregateLatency(withCost),
    modelcheck_version: MODELCHECK_VERSION,
  });
  const reportPath = await writeReportJson(report, runDir);
  const reportHtmlPath = await renderReportHtmlFrom(reportPath);
  if (path.resolve(path.dirname(runDir)) === path.resolve(runsDirectory())) {
    await appendRunIndex(indexEntryFromReport(report, runDir));
  }
  console.error(`Report written to ${reportPath} and ${reportHtmlPath}. Raw responses in ${rawDir}.`);
  return { report, reportPath, runDir };
}
