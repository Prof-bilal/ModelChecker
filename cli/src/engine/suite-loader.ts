/** Owns loading and validating a suite from disk, and its content hash. */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ScoringRule, SuiteCase, SuiteMeta } from "../types.js";

const SCORING_RULES: readonly ScoringRule[] = ["json_schema@1", "tool_call_match@1"];

/** Returns the suites directory (cli/suites), resolved from this module's location. */
export function suitesDir(): string {
  // This module runs from <root>/dist/engine/ (bin target, D14), so the
  // suites directory is two levels up. Tests run the same path via src/.
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "suites");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Deterministic JSON serialisation: object keys sorted, no whitespace. */
export function canonicalJson(value: unknown): string {
  return stableStringify(value);
}

function stableStringify(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isRecord(value)) {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const body = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(",");
    return `{${body}}`;
  }
  const valueType: string = typeof value;
  switch (valueType) {
    case "string":
      return JSON.stringify(value as string);
    case "number":
      return Number.isFinite(value as number) ? JSON.stringify(value) : "null";
    case "boolean":
      return JSON.stringify(value as boolean);
    case "undefined":
      return "null";
    case "bigint":
      return JSON.stringify((value as bigint).toString());
    default:
      // function, symbol — cannot appear in a suite loaded from JSON.
      throw new TypeError(`Cannot serialise value of type "${valueType}" to JSON.`);
  }
}

export function suiteContentHash(suite: unknown): string {
  return createHash("sha256").update(canonicalJson(suite)).digest("hex");
}

export class SuiteLoadError extends Error {}

function fail(message: string): never {
  // Message shape: object, reason, next step (CODESTYLE.md §2.4).
  throw new SuiteLoadError(message);
}

export async function loadSuite(suiteId: string, suiteVersion: string): Promise<SuiteMeta> {
  if (!/^[\w.-]+$/.test(suiteId) || !/^[\d.]+$/.test(suiteVersion)) {
    fail(`Suite id/version "${suiteId}@${suiteVersion}" contains invalid characters. Use the suite directory name and its semver version.`);
  }

  const suitePath = path.join(suitesDir(), suiteId, suiteVersion, "suite.json");

  let raw: string;
  try {
    raw = await readFile(suitePath, "utf8");
  } catch {
    fail(`Suite "${suiteId}@${suiteVersion}" could not be loaded from ${suitePath}. Check that the suite directory exists.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`Suite file "${suitePath}" is not valid JSON (${error instanceof Error ? error.message : String(error)}). Fix the suite file or pick a different suite.`);
  }

  if (!isRecord(parsed) || !isRecord(parsed.meta) || !Array.isArray(parsed.cases)) {
    fail(`Suite file "${suitePath}" must be an object with a "meta" object and a "cases" array. See docs/benchmarks.md for the expected shape.`);
  }

  const meta = parsed.meta as Record<string, unknown>;
  const id = meta.id;
  const version = meta.version;
  if (typeof id !== "string" || typeof version !== "string") {
    fail(`Suite file "${suitePath}" meta must include string "id" and "version". Fix the suite file's meta block.`);
  }
  if (id !== suiteId || version !== suiteVersion) {
    fail(`Suite file "${suitePath}" declares "${id}@${version}" but was loaded as "${suiteId}@${suiteVersion}". Align the meta block with the directory name.`);
  }

  const cases = (parsed.cases as unknown[]).map(validateCase);

  const ids = new Set<string>();
  for (const c of cases) {
    if (ids.has(c.case_id)) {
      fail(`Suite "${suitePath}" contains a duplicate case id "${c.case_id}". Case ids must be unique.`);
    }
    ids.add(c.case_id);
  }

  // The hash covers id, version and the validated cases — not raw file bytes,
  // so reformatting the JSON cannot change it.
  const content = { cases, id, version };
  const content_hash = suiteContentHash(content);

  return { id, version, content_hash, cases };
}

function validateCase(value: unknown, index: number): SuiteCase {
  const where = `case at index ${index}`;
  if (!isRecord(value)) {
    fail(`Suite ${where} is not an object. Each case must be an object with case_id, capability, version, input, scoring and scoring_params.`);
  }
  const { case_id, capability, version, input, scoring, scoring_params, tools } = value;

  if (typeof case_id !== "string" || case_id.length === 0) {
    fail(`Suite ${where} is missing a non-empty string "case_id". Fix the case entry.`);
  }
  if (typeof capability !== "string" || capability.length === 0) {
    fail(`Suite case "${case_id}" is missing a non-empty string "capability". Fix the case entry.`);
  }
  if (typeof version !== "string" || version.length === 0) {
    fail(`Suite case "${case_id}" is missing a non-empty string "version". Fix the case entry.`);
  }
  if (input === undefined) {
    fail(`Suite case "${case_id}" is missing an "input". Every case must define its prompt input.`);
  }
  if (typeof scoring !== "string" || !SCORING_RULES.includes(scoring as ScoringRule)) {
    fail(`Suite case "${case_id}" has unknown scoring rule "${String(scoring)}". Scoring must be one of: ${SCORING_RULES.join(", ")}.`);
  }
  const scoringRule = scoring as ScoringRule;
  if (!isRecord(scoring_params)) {
    fail(`Suite case "${case_id}" has invalid "scoring_params". They must be an object.`);
  }
  if (tools !== undefined && !Array.isArray(tools)) {
    fail(`Suite case "${case_id}" has invalid "tools". They must be an array.`);
  }
  if (scoring === "tool_call_match@1" && !Array.isArray(tools)) {
    fail(`Suite case "${case_id}" uses "tool_call_match@1" but declares no "tools". Add a tools array to the case.`);
  }

  return {
    case_id,
    capability,
    version,
    input,
    scoring: scoringRule,
    scoring_params: scoring_params as Record<string, unknown>,
    ...(Array.isArray(tools) ? { tools } : {}),
  };
}
