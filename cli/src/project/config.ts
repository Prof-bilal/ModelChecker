/** Owns YAML config and JSONL case loading, validation, and canonical hashes. */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { parseDocument } from "yaml";
import { Ajv } from "ajv";
import { ConfigError } from "../lib/errors.js";
import { ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS } from "../adapters/anthropic.js";
import type { Metric, ProjectCase, ProjectConfig, Threshold } from "./types.js";

export const DEFAULT_THRESHOLDS: Record<Metric, Threshold> = {
  task_success: { warn_drop: 0.03, fail_drop: 0.08 },
  schema_validity: { warn_drop: 0.01, fail_drop: 0.03 },
  instruction_following: { warn_drop: 0.03, fail_drop: 0.07 },
  tool_accuracy: { warn_drop: 0.03, fail_drop: 0.08 },
  latency_p95: { warn_increase: 0.20, fail_increase: 0.50 },
  cost: { warn_increase: 0.20, fail_increase: 0.50 },
};
export const ajv = new Ajv({ strict: true, allErrors: true, ownProperties: true });
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function hash(value: unknown): string { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }
export function bytesHash(value: string): string { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }

const object = { type: "object" };
const configSchema = {
  type: "object", additionalProperties: false, required: ["version", "target", "suite"],
  properties: {
    version: { const: 1 },
    target: { type: "object", additionalProperties: false, required: ["provider", "model"], properties: {
      provider: { enum: ["openai", "anthropic", "openrouter", "groq", "xai", "deepseek"] }, model: { type: "string", minLength: 1 }, base_url: { type: "string", minLength: 1 }, api_key_env: { type: "string", pattern: "^[A-Za-z_][A-Za-z0-9_]*$" },
    } },
    runtime: { type: "object", additionalProperties: false, properties: {
      temperature: { anyOf: [{ type: "number", minimum: 0, maximum: 2 }, { const: "provider_default" }] },
      reasoning_effort: { enum: ["none", "minimal", "low", "medium", "high", "xhigh"] },
      timeout_ms: { type: "integer", minimum: 1, maximum: 2147483647 }, retries: { type: "integer", minimum: 0, maximum: 10 }, concurrency: { type: "integer", minimum: 1, maximum: 32 },
      max_output_tokens: { anyOf: [{ type: "integer", minimum: 1 }, { const: "provider_default" }] }, system_prompt: { type: "string" }, tools: { type: "array", items: object }, retrieval: object, agent: object,
    } },
    suite: { type: "object", additionalProperties: false, required: ["paths"], properties: { paths: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } } } },
    schemas: { type: "object", additionalProperties: object },
    thresholds: { type: "object", additionalProperties: false, properties: Object.fromEntries(Object.keys(DEFAULT_THRESHOLDS).map((key) => [key, { type: "object", additionalProperties: false, properties: Object.fromEntries((key === "latency_p95" || key === "cost" ? ["warn_increase", "fail_increase"] : ["warn_drop", "fail_drop"]).map((k) => [k, { type: "number", minimum: 0 }])) }])) },
  },
};
const caseSchema = {
  type: "object", additionalProperties: false, required: ["id", "input", "expected"], properties: {
    id: { type: "string", minLength: 1, maxLength: 200 }, tags: { type: "array", items: { type: "string" } },
    input: { type: "object", additionalProperties: false, required: ["messages"], properties: {
      messages: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["role", "content"], properties: { role: { enum: ["system", "user", "assistant"] }, content: { type: "string" } } } }, tools: { type: "array", items: object },
    } },
    expected: { type: "object", minProperties: 1, additionalProperties: false, properties: {
      schema: { anyOf: [{ type: "string", minLength: 1 }, object] }, exact: {},
      must_include: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } }, must_not_include: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
      max_tool_calls: { type: "integer", minimum: 0 },
      tools: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["name"], properties: { name: { type: "string", minLength: 1 }, schema: object } } },
      custom: { type: "array", minItems: 1, items: { type: "string", pattern: "^[A-Za-z0-9_-]+$" } },
    } },
  },
};
export function validateConfig(value: unknown): ProjectConfig {
  if (!ajv.validate(configSchema, value)) throw new ConfigError(`Invalid project config: ${ajv.errorsText()}. Check docs/regression-cli.md.`);
  const config = value as ProjectConfig;
  config.runtime = { temperature: 0, timeout_ms: 30000, retries: 1, concurrency: 3, max_output_tokens: "provider_default", ...(config.runtime as Partial<ProjectConfig["runtime"]>) };
  config.schemas ??= {};
  config.thresholds = Object.fromEntries(Object.entries(DEFAULT_THRESHOLDS).map(([key, defaults]) => [key, { ...defaults, ...config.thresholds?.[key as Metric] }]));
  for (const t of Object.values(config.thresholds)) {
    if ((t.warn_drop ?? t.warn_increase ?? 0) > (t.fail_drop ?? t.fail_increase ?? 0)) throw new ConfigError("Warning threshold must not exceed failure threshold.");
  }
  for (const schema of Object.values(config.schemas)) ajv.compile(schema);
  if (config.target.base_url) {
    const endpoint = new URL(config.target.base_url);
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new ConfigError("Provider base_url must not contain credentials, query parameters, or fragments.");
  }
  if (config.target.provider === "anthropic" && config.runtime.reasoning_effort !== undefined) throw new ConfigError("reasoning_effort currently requires an OpenAI-compatible target. Remove it for Anthropic.");
  if (config.target.provider === "anthropic" && config.runtime.max_output_tokens === "provider_default") config.runtime.max_output_tokens = ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS;
  return config;
}
export async function loadConfig(root: string, configPath = "modelcheck/config.yaml"): Promise<ProjectConfig> {
  const doc = parseDocument(await readFile(path.resolve(root, configPath), "utf8"), { uniqueKeys: true });
  if (doc.errors.length) throw new ConfigError(`Invalid YAML: ${doc.errors.map((e) => e.message).join("; ")}`);
  return validateConfig(doc.toJS({ maxAliasCount: 50 }));
}
export function validateCase(value: unknown, config: ProjectConfig): ProjectCase {
  if (!ajv.validate(caseSchema, value)) throw new ConfigError(`Invalid case: ${ajv.errorsText()}. Check the JSONL case format.`);
  const c = value as ProjectCase;
  if (c.expected.schema !== undefined) {
    const schema = typeof c.expected.schema === "string" ? config.schemas[c.expected.schema] : c.expected.schema;
    if (!schema || (typeof c.expected.schema === "string" && !Object.hasOwn(config.schemas, c.expected.schema))) throw new ConfigError(`Case ${c.id} references unknown schema ${String(c.expected.schema)}.`);
    ajv.compile(schema);
  }
  for (const t of c.expected.tools ?? []) if (t.schema) ajv.compile(t.schema);
  return c;
}
export async function loadCases(root: string, config: ProjectConfig): Promise<ProjectCase[]> {
  const files = new Set<string>();
  for (const pattern of config.suite.paths) {
    const absolute = path.resolve(root, pattern);
    if (!absolute.includes("*")) { files.add(absolute); continue; }
    const prefix = absolute.slice(0, absolute.indexOf("*"));
    const base = path.dirname(prefix.endsWith(path.sep) ? `${prefix}_` : prefix);
    let expression = "";
    for (let i = 0; i < absolute.length; i++) {
      if (absolute.slice(i, i + 3) === "**/") { expression += "(?:.*/)?"; i += 2; }
      else if (absolute.slice(i, i + 2) === "**") { expression += ".*"; i++; }
      else if (absolute[i] === "*") expression += "[^/]*";
      else expression += absolute[i].replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
    const regex = new RegExp(`^${expression}$`);
    async function walk(dir: string): Promise<void> {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const file = path.join(dir, e.name);
        if (e.isDirectory()) await walk(file);
        else if (e.isFile() && regex.test(file)) files.add(file);
      }
    }
    await walk(base);
  }
  const cases: ProjectCase[] = [];
  const ids = new Set<string>();
  for (const file of [...files].sort()) {
    if (!(await lstat(file)).isFile()) throw new ConfigError(`Case path ${file} must be a regular file.`);
    const lines = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
    let i = 0;
    for await (const line of lines) {
      i++;
      if (!line.trim()) continue;
      try {
        const c = validateCase(JSON.parse(line), config);
        if (ids.has(c.id)) throw new ConfigError(`Duplicate case id ${c.id}.`);
        ids.add(c.id); cases.push(c);
      } catch (e) { throw new ConfigError(`${file}:${i}: ${e instanceof Error ? e.message : String(e)}`); }
    }
  }
  if (!cases.length) throw new ConfigError("No project cases found. Add JSONL cases before creating a baseline.");
  return cases;
}
