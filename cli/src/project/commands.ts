/** Owns init, baseline, verify, live comparison, lock validation, and CLI presentation. */
import { readFile, mkdir, lstat } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stringify, parseDocument } from "yaml";
import { ConfigError } from "../lib/errors.js";
import { redactSecrets } from "../lib/redact.js";
import { ajv, bytesHash, hash, loadCases, loadConfig, validateConfig } from "./config.js";
import { atomicWrite, runProject } from "./runner.js";
import { compareMetrics, verdictExit } from "./verdict.js";
import type { Comparison, ProjectCase, ProjectConfig, ProjectLock, ProjectRun, Target } from "./types.js";

type Values = Record<string, unknown>;
function string(values: Values, key: string): string | undefined {
  return typeof values[key] === "string" ? values[key] as string : undefined;
}
function targetOverride(value: string, config: ProjectConfig): ProjectConfig {
  const at = value.indexOf(":");
  if (at < 1 || !value.slice(at + 1)) throw new ConfigError("Targets use provider:model, for example openai:gpt-4o.");
  const provider = value.slice(0, at);
  if (!["openai", "anthropic", "openrouter", "groq", "xai", "deepseek"].includes(provider)) throw new ConfigError(`Unsupported provider ${provider}.`);
  const target: Target = provider === config.target.provider ? { ...config.target, model: value.slice(at + 1) } : { provider, model: value.slice(at + 1) };
  if (provider === "anthropic" && config.runtime.reasoning_effort !== undefined) throw new ConfigError("Remove reasoning_effort before comparing an Anthropic target.");
  return validateConfig({ ...config, target });
}
async function identity(root: string, config: ProjectConfig, cases: ProjectCase[]): Promise<string> {
  const scripts: Record<string, string> = Object.create(null);
  for (const name of [...new Set(cases.flatMap((c) => c.expected.custom ?? []))].sort()) scripts[name] = bytesHash(await readFile(path.join(root, "modelcheck/evaluators/custom", name), "utf8"));
  return hash({ cases, schemas: config.schemas, evaluators: scripts });
}
async function exists(file: string): Promise<boolean> {
  try { await lstat(file); return true; } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return false; throw e; }
}
export async function initProject(values: Values, root = process.cwd()): Promise<void> {
  const configPath = path.resolve(root, string(values, "config") ?? "modelcheck/config.yaml");
  if (await exists(configPath)) throw new ConfigError(`Config already exists at ${configPath}. Init never overwrites a project.`);
  let provider = string(values, "provider") ?? "openai";
  let model = string(values, "model") ?? "gpt-4o";
  if (process.stdin.isTTY && process.stdout.isTTY && !values.yes && !values.provider && !values.model) {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    try { provider = (await rl.question(`Provider [${provider}]: `)).trim() || provider; model = (await rl.question(`Model [${model}]: `)).trim() || model; } finally { rl.close(); }
  }
  if (!["openai", "anthropic", "openrouter", "groq", "xai", "deepseek"].includes(provider)) throw new ConfigError(`Unsupported provider ${provider}.`);
  if (!model.trim()) throw new ConfigError("Init requires a nonempty model id.");
  const examplePath = path.join(root, "modelcheck/cases/example.jsonl");
  if (await exists(examplePath)) throw new ConfigError("Example cases already exist. Init never overwrites them.");
  await mkdir(path.join(root, "modelcheck/evaluators/custom"), { recursive: true, mode: 0o700 });
  await mkdir(path.join(root, ".modelcheck/runs"), { recursive: true, mode: 0o700 });
  await atomicWrite(examplePath, JSON.stringify({ id: "example-001", input: { messages: [{ role: "user", content: "Reply with exactly OK" }] }, expected: { exact: "OK" }, tags: ["example"] }) + "\n", true);
  await atomicWrite(configPath, stringify({ version: 1, target: { provider, model }, runtime: { temperature: 0, timeout_ms: 30000, retries: 1 }, suite: { paths: ["./modelcheck/cases/*.jsonl"] } }), true);
  const ignorePath = path.join(root, ".gitignore");
  const ignore = await exists(ignorePath) ? await readFile(ignorePath, "utf8") : "";
  if (!ignore.split(/\r?\n/).includes(".modelcheck/")) await atomicWrite(ignorePath, `${ignore}${ignore && !ignore.endsWith("\n") ? "\n" : ""}.modelcheck/\n`);
  console.error("Created modelcheck/config.yaml and example cases. Set your provider key in the environment, replace the example with application cases, then run modelcheck baseline.");
}

const metricSchema = { type: "object", additionalProperties: false, required: ["value", "n"], properties: { value: { type: ["number", "null"], minimum: 0 }, n: { type: "integer", minimum: 0 }, reason: { type: "string" } } };
const lockSchema = {
  type: "object", additionalProperties: false, required: ["version", "baseline", "metrics", "cases", "artifacts"], properties: {
    version: { const: 1 }, cases: { type: "integer", minimum: 1 },
    baseline: { type: "object", additionalProperties: false, required: ["created_at", "provider", "model", "config_hash", "suite_hash", "application_hash", "mode"], properties: Object.fromEntries(["created_at", "provider", "model", "config_hash", "suite_hash", "application_hash", "mode"].map((key) => [key, key === "mode" ? { enum: ["live", "offline"] } : { type: "string", minLength: 1 }])) },
    metrics: { type: "object", additionalProperties: false, required: ["task_success", "schema_validity", "instruction_following", "tool_accuracy", "latency_p95", "cost"], properties: Object.fromEntries(["task_success", "schema_validity", "instruction_following", "tool_accuracy", "latency_p95", "cost"].map((m) => [m, metricSchema])) },
    artifacts: { type: "object", additionalProperties: false, required: ["run", "sha256"], properties: { run: { type: "string", minLength: 1 }, sha256: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" } } },
  },
};
export async function loadLock(file: string, root: string): Promise<ProjectLock> {
  const doc = parseDocument(await readFile(file, "utf8"));
  if (doc.errors.length) throw new ConfigError("Baseline lockfile has invalid YAML. Recreate it with modelcheck baseline.");
  const lock = doc.toJS({ maxAliasCount: 50 });
  if (!ajv.validate(lockSchema, lock)) throw new ConfigError(`Invalid lockfile: ${ajv.errorsText()}. Recreate the baseline.`);
  const typed = lock as ProjectLock;
  for (const [key, m] of Object.entries(typed.metrics)) {
    if (m.n > typed.cases || (m.value !== null && m.n === 0) || (!["cost", "latency_p95"].includes(key) && m.value !== null && m.value > 1)) throw new ConfigError("Baseline metrics have invalid denominators or rates.");
  }
  const raw = await readFile(path.resolve(root, typed.artifacts.run), "utf8");
  if (bytesHash(raw) !== typed.artifacts.sha256) throw new ConfigError("Baseline evidence hash differs from the lockfile. Restore it or create a new baseline.");
  const records = raw.trim().split("\n").map((s) => JSON.parse(s));
  const summary = records.at(-1);
  if (summary?.type !== "summary" || summary.valid !== true || summary.cases !== typed.cases || hash(summary.metrics) !== hash(typed.metrics) || summary.config_hash !== typed.baseline.config_hash || summary.suite_hash !== typed.baseline.suite_hash || summary.application_hash !== typed.baseline.application_hash || summary.target.provider !== typed.baseline.provider || summary.target.model !== typed.baseline.model || summary.mode !== typed.baseline.mode) throw new ConfigError("Baseline evidence does not match the lockfile or is incomplete.");
  return typed;
}

function present(run: ProjectRun, comparison: Comparison | undefined, values: Values): void {
  if (values.format === "json") {
    console.log(JSON.stringify({ version: 1, run: { ...run, results: undefined }, ...(comparison ? { comparison, verdict_artifact: `${run.artifact}.verdict.json` } : {}) }));
    return;
  }
  console.error(`Cases: ${run.cases}; ${run.valid ? "complete" : "INVALID"}; target ${run.target.provider}:${run.target.model}`);
  if (comparison) {
    for (const m of comparison.metrics) {
      const performance = m.metric === "cost" || m.metric === "latency_p95";
      const format = (value: number | null) => value === null ? "not available" : m.metric === "cost" ? `$${value.toFixed(6)} estimated` : m.metric === "latency_p95" ? `${value.toFixed(1)} ms` : `${(value * 100).toFixed(1)}%`;
      const delta = m.delta === null ? "delta unavailable" : `${m.delta >= 0 ? "+" : ""}${(m.delta * 100).toFixed(1)}${performance ? "%" : " pp"}`;
      console.error(`${m.metric}: ${format(m.baseline.value)} → ${format(m.candidate.value)}; ${delta} (n=${m.baseline.n}/${m.candidate.n}) ${m.verdict}${m.reason ? ` — ${m.reason}` : ""}`);
    }
    console.error(`VERDICT: ${comparison.verdict}; recommendation: ${comparison.recommendation}`);
    if (comparison.config_changed) console.error("Application configuration changed; hashes are recorded in the artifacts.");
  } else for (const [metric, value] of Object.entries(run.metrics)) console.error(`${metric}: ${value.value ?? "not available"} (n=${value.n})${value.reason ? ` — ${value.reason}` : ""}`);
  const failed = run.results.filter((r) => r.task_success !== true);
  for (const c of failed.slice(0, 20)) console.error(`Failed case ${c.id}: ${(c.error ?? c.assertions.filter((a) => !a.pass).map((a) => a.name).join(", ")).slice(0, 300)}`);
  if (failed.length > 20) console.error(`${failed.length - 20} additional failed cases are recorded in the artifact.`);
  console.error(`Estimated charge only; provider route affects latency. Artifacts: ${run.artifact}`);
  if (comparison) console.error(`Machine-readable verdict: ${run.artifact}.verdict.json`);
}

export async function projectCommand(command: "init" | "baseline" | "verify" | "compare", values: Values, positionals: string[] = [], root = process.cwd()): Promise<number> {
  if (values.json && values.format === undefined) values.format = "json";
  if (command === "init") { await initProject(values, root); return 0; }
  if (values.format !== undefined && values.format !== "human" && values.format !== "json") throw new ConfigError("--format must be human or json.");
  if (command === "compare" && positionals.length > 1) throw new ConfigError("Use either two legacy run references, or a single candidate target; do not mix comparison forms.");
  if (Boolean(values.offline) !== Boolean(values.responses)) throw new ConfigError("Offline runs require both --offline and --responses PATH; neither permits a provider call.");
  const config = await loadConfig(root, string(values, "config"));
  const cases = await loadCases(root, config);
  const suiteHash = await identity(root, config, cases);
  const lockPath = path.resolve(root, string(values, "baseline") ?? "modelcheck.lock");
  const output = string(values, "output");
  if (output && (await exists(path.resolve(root, output)) || (command === "compare" && await exists(path.resolve(root, `${output}.current.jsonl`))))) throw new ConfigError("Output evidence already exists. Choose a new --output path.");
  const responses = string(values, "responses");
  const spendLimit = values["spend-limit"] === undefined ? undefined : Number(values["spend-limit"]);
  if (spendLimit !== undefined && (!Number.isFinite(spendLimit) || spendLimit <= 0)) throw new ConfigError("--spend-limit must be a positive finite USD amount.");
  const run = async (c: ProjectConfig, artifact?: string, fixture = responses) => {
    const result = await runProject({ root, config: c, cases, output: artifact, responses: fixture, suiteHash, spendLimit });
    return result;
  };
  if (command === "baseline") {
    if (await exists(lockPath) && !values.force) throw new ConfigError("Baseline exists. Review the change and use --force to replace it.");
    const result = await run(config, output);
    present(result, undefined, values);
    if (!result.valid) return 1;
    const lock: ProjectLock = { version: 1, baseline: { created_at: result.created_at, provider: result.target.provider, model: result.target.model, config_hash: result.config_hash, suite_hash: result.suite_hash, application_hash: result.application_hash, mode: result.mode }, metrics: result.metrics, cases: result.cases, artifacts: { run: path.relative(root, result.artifact), sha256: bytesHash(await readFile(result.artifact, "utf8")) } };
    await atomicWrite(lockPath, stringify(lock));
    console.error(`Baseline saved: ${lockPath}. Next: modelcheck verify.`);
    return 0;
  }
  let base: ProjectLock | ProjectRun;
  let candidateConfig = config;
  if (command === "verify") {
    base = await loadLock(lockPath, root);
    if (base.baseline.suite_hash !== suiteHash || base.cases !== cases.length) throw new ConfigError("Suite, schemas, or custom evaluators changed. Review and create a new baseline.");
    if (base.baseline.mode !== (responses ? "offline" : "live")) throw new ConfigError("Cannot compare offline fixture evidence with live provider evidence.");
  } else {
    const candidate = string(values, "candidate") ?? positionals[0];
    if (!candidate) throw new ConfigError("Compare requires --candidate provider:model or one provider:model argument.");
    candidateConfig = targetOverride(candidate, config);
    const currentConfig = values.current ? targetOverride(String(values.current), config) : config;
    if (values.offline && !values["current-responses"]) throw new ConfigError("Offline compare also requires --current-responses PATH.");
    base = await run(currentConfig, output ? `${output}.current.jsonl` : undefined, string(values, "current-responses"));
  }
  const candidate = await run(candidateConfig, output);
  const invalid = !candidate.valid || ("valid" in base && !base.valid);
  const comparison = compareMetrics(base.metrics, candidate.metrics, config, { invalid, failed_cases: candidate.results.filter((r) => r.task_success !== true).map((r) => r.id), config_changed: ("baseline" in base ? base.baseline.config_hash : base.config_hash) !== candidate.config_hash });
  await atomicWrite(`${candidate.artifact}.verdict.json`, JSON.stringify({ version: 1, comparison, thresholds: config.thresholds, baseline_config_hash: "baseline" in base ? base.baseline.config_hash : base.config_hash, candidate_config_hash: candidate.config_hash, suite_hash: candidate.suite_hash, run: candidate.artifact }, null, 2) + "\n");
  present(candidate, comparison, values);
  return verdictExit(comparison.verdict, values.strict === true || values["fail-on-warn"] === true);
}

export function projectError(error: unknown, json: boolean): void {
  const message = redactSecrets(error instanceof Error ? error.message : String(error));
  if (json) console.log(JSON.stringify({ version: 1, comparison: { verdict: "FAIL", invalid: true, recommendation: "HOLD" }, error: message }));
  else console.error(`VERDICT: FAIL — ${message}`);
}
