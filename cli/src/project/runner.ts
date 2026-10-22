/** Owns local regression execution, trusted custom evaluators, and JSONL evidence. */
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile, rename, realpath } from "node:fs/promises";
import path from "node:path";
import { selectAdapter } from "../commands/run.js";
import { findPrice, loadPriceTable, caseCost, estimateCost, printEstimate, assertWithinSpendLimit, PRICE_TABLE_REF } from "../engine/estimate.js";
import { backoffDelay, isRetryable, sleep } from "../engine/retry.js";
import { ProviderError } from "../lib/errors.js";
import { knownCredentials, redactSecrets } from "../lib/redact.js";
import type { AdapterRequest, AdapterResponse, ModelAdapter } from "../adapters/types.js";
import { hash } from "./config.js";
import { evaluate } from "./evaluate.js";
import { aggregate } from "./verdict.js";
import type { ProjectCase, ProjectConfig, ProjectResult, ProjectRun } from "./types.js";

export interface RunProjectOptions { root: string; config: ProjectConfig; cases: ProjectCase[]; output?: string; responses?: string; adapter?: ModelAdapter; suiteHash?: string; spendLimit?: number }
export async function atomicWrite(file: string, text: string, exclusive = false): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  if (exclusive) { await writeFile(file, text, { flag: "wx", mode: 0o600 }); return; }
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, text, { flag: "wx", mode: 0o600 });
  await rename(temp, file);
}
async function customEvaluator(root: string, name: string, input: unknown, timeout: number, keyEnv?: string): Promise<{ pass: boolean; reason?: string }> {
  const base = await realpath(path.join(root, "modelcheck/evaluators/custom"));
  const file = await realpath(path.join(base, name));
  if (!file.startsWith(`${base}${path.sep}`)) throw new Error("Custom evaluator escapes its directory.");
  const evaluatorEnv = { ...process.env };
  for (const key of Object.keys(evaluatorEnv)) if (/key|token|secret|password/i.test(key)) delete evaluatorEnv[key];
  if (keyEnv) delete evaluatorEnv[keyEnv];
  return new Promise((resolve, reject) => {
    const child = execFile(file, [], { cwd: root, timeout, maxBuffer: 1024 * 1024, encoding: "utf8", env: evaluatorEnv }, (error, stdout) => {
      if (error) { reject(new Error(`Custom evaluator ${name} failed or timed out.`)); return; }
      try {
        const result = JSON.parse(stdout);
        if (typeof result.pass !== "boolean" || (result.reason !== undefined && typeof result.reason !== "string")) throw new Error();
        resolve(result);
      } catch { reject(new Error(`Custom evaluator ${name} must return JSON {pass:boolean,reason?:string}.`)); }
    });
    child.stdin?.on("error", () => {});
    child.stdin?.end(JSON.stringify(input));
  });
}
export async function runProject(options: RunProjectOptions): Promise<ProjectRun> {
  const { root, config, cases } = options;
  const configHash = hash(config);
  const suiteHash = options.suiteHash ?? hash(cases);
  const applicationHash = hash({ target: config.target, runtime: config.runtime });
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const artifact = path.resolve(root, options.output ?? `.modelcheck/runs/${runId}.jsonl`);
  const secrets = [...knownCredentials(), ...(config.target.api_key_env && process.env[config.target.api_key_env] ? [process.env[config.target.api_key_env]!] : [])];
  function scrub(value: unknown): unknown {
    if (typeof value === "string") return redactSecrets(value, secrets);
    if (Array.isArray(value)) return value.map(scrub);
    if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, v]) => [redactSecrets(key, secrets), scrub(v)]));
    return value;
  }
  const safe = (value: unknown) => JSON.stringify(scrub(value));
  const offline = new Map<string, { response: AdapterResponse; latency_ms: number }>();
  if (options.responses) {
    for (const line of (await readFile(path.resolve(root, options.responses), "utf8")).split(/\r?\n/).filter((s) => s.trim())) {
      const row = JSON.parse(line);
      if (typeof row.id !== "string" || offline.has(row.id) || !row.response || typeof row.response.model !== "string" || !(row.response.content === null || typeof row.response.content === "string") || !(row.response.tool_calls === null || (Array.isArray(row.response.tool_calls) && row.response.tool_calls.every((t: {name: unknown; arguments: unknown}) => typeof t.name === "string" && typeof t.arguments === "string"))) || !Number.isFinite(row.latency_ms) || row.latency_ms < 0) throw new Error("Invalid or duplicate offline response. See the fixture contract.");
      offline.set(row.id, row);
    }
    if (offline.size !== cases.length || cases.some((c) => !offline.has(c.id))) throw new Error("Offline responses must match the exact case id set.");
  }
  const target = config.target;
  const adapter = options.responses ? undefined : options.adapter ?? selectAdapter({ model: `${target.provider}/${target.model}`, baseUrl: target.base_url, apiKeyEnv: target.api_key_env, mock: false }).adapter;
  const price = findPrice(loadPriceTable(), `${target.provider}/${target.model}`);
  const estimate = estimateCost({ suite: { id: "project", version: "1", content_hash: suiteHash, cases: [] }, cases: cases.map((c) => ({ case_id: c.id, repeat_index: 0 })), repeats_per_case: 1, estimated_requests: cases.length * (1 + config.runtime.retries) }, `${target.provider}/${target.model}`, loadPriceTable());
  if (options.spendLimit !== undefined) {
    if (estimate.basis === "unpriced") throw new Error("Cannot enforce --spend-limit for an unpriced target.");
    assertWithinSpendLimit(estimate, options.spendLimit);
  }
  if (!options.responses) printEstimate(estimate, `${target.provider}/${target.model}`);
  console.error(`Running ${cases.length} cases against ${target.provider}:${target.model}; cost basis: ${price ? "estimated from pinned price table" : "unpriced"}${options.responses ? "; offline fixture" : ""}.`);
  const results: ProjectResult[] = new Array(cases.length);
  let cursor = 0;
  // Persist an incomplete header before execution; interrupted runs cannot pass.
  const header = { type: "run", version: 1, run_id: runId, target, mode: options.responses ? "offline" : "live", config_hash: configHash, suite_hash: suiteHash, application_hash: applicationHash, configuration: config, cases: cases.length, price_table_ref: PRICE_TABLE_REF, price: price ?? null };
  await atomicWrite(artifact, `${safe(header)}\n`, true);
  const persist = async () => atomicWrite(artifact, [safe(header), ...results.filter(Boolean).map((r) => safe({ type: "case", ...r }))].join("\n") + "\n");
  // One serialization chain prevents workers overwriting one another's evidence.
  let writes = Promise.resolve();
  async function worker(): Promise<void> {
    for (;;) {
      const i = cursor++;
      if (i >= cases.length) return;
      const c = cases[i];
      let attempts = 0;
      let response: AdapterResponse | undefined;
      const start = Date.now();
      const attemptRecords: unknown[] = [];
      let result: ProjectResult = { id: c.id, status: "request_error", assertions: [], task_success: null, schema_validity: null, instruction_following: null, tool_accuracy: null, latency_ms: 0, attempts: 0, estimated_cost_usd: null };
      try {
        if (options.responses) { response = offline.get(c.id)!.response; attempts = 1; }
        else {
          const messages = [...c.input.messages];
          if (config.runtime.system_prompt) messages.unshift({ role: "system", content: config.runtime.system_prompt });
          const request: AdapterRequest = { model: target.model, messages, tools: c.input.tools ?? config.runtime.tools, temperature: config.runtime.temperature, max_output_tokens: config.runtime.max_output_tokens, timeout_ms: config.runtime.timeout_ms, reasoning_effort: config.runtime.reasoning_effort };
          for (;;) {
            attempts++;
            try { response = await adapter!.send(request); break; }
            catch (error) {
              attemptRecords.push({ attempt: attempts, error_class: error instanceof ProviderError ? error.error_class : "unexpected" });
              if (!isRetryable(error) || attempts > config.runtime.retries) throw error;
              await sleep(backoffDelay(attempts - 1, error.retry_after_ms));
            }
          }
        }
        result = { ...result, response, latency_ms: options.responses ? offline.get(c.id)!.latency_ms : Date.now() - start, attempts, estimated_cost_usd: null };
        const validUsage = response.usage && [response.usage.input_tokens, response.usage.output_tokens].every((n) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0);
        const charge = validUsage ? caseCost(price, response.usage) : "unpriced";
        // Failed retry attempts may have billed unknown tokens; do not invent them.
        result.estimated_cost_usd = attempts === 1 && typeof charge === "number" ? charge : null;
        try {
          Object.assign(result, evaluate(c, response, config));
          for (const name of c.expected.custom ?? []) result.assertions.push({ name: `custom:${name}`, ...await customEvaluator(root, name, { case: c, response }, config.runtime.timeout_ms, config.target.api_key_env) });
          result.status = "scored";
          result.task_success = result.assertions.length > 0 && result.assertions.every((a) => a.pass);
        } catch (e) { result.status = "evaluator_error"; result.error = e instanceof Error ? e.message : String(e); }
      } catch (e) { result.error = e instanceof Error ? e.message : String(e); result.latency_ms = Date.now() - start; result.attempts = attempts; }
      // Keep raw evidence and normalized response separate from assertions.
      results[i] = JSON.parse(safe({ ...result, input: c.input, expected: c.expected, attempt_records: attemptRecords }));
      writes = writes.then(persist);
      await writes;
    }
  }
  await Promise.all(Array.from({ length: Math.min(config.runtime.concurrency, cases.length) }, worker));
  const run: ProjectRun = { version: 1, run_id: runId, created_at: new Date().toISOString(), target, mode: options.responses ? "offline" : "live", config_hash: configHash, suite_hash: suiteHash, application_hash: applicationHash, valid: results.every((r) => r.status === "scored"), cases: cases.length, metrics: aggregate(results), results, artifact, price_table_ref: PRICE_TABLE_REF, price: price ?? null };
  await atomicWrite(artifact, [safe(header), ...results.map((r) => safe({ type: "case", ...r })), safe({ type: "summary", ...run, results: undefined })].join("\n") + "\n");
  return run;
}
