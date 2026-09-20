/** Owns building and writing report.json (PHASES.md Phase 4). The report is
 * validated against the rules in schema.json before it touches disk: a run
 * missing any required field from EVALUATIONS.md §5 is invalid and is never
 * presented as complete (MVP §7.6, ARCHITECTURE.md §4). */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  CapabilityAggregate,
  CaseResult,
  Parameters,
  Report,
  ReportCost,
  ReportLatency,
  RunStatus,
} from "../types.js";
import { mandatoryLimitations } from "./limits.js";

export const REPORT_SCHEMA_VERSION = "1.0.0";

/** Directory holding schema.json, resolved from this module's location so the
 * schema ships with both src/ and dist/ builds (tsc copies JSON beside modules). */
export function reportSchemaPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "schema.json");
}

export class ReportValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new ReportValidationError(message);
}

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const OUTCOMES = new Set([
  "pass",
  "fail",
  "partial",
  "request_error",
  "scoring_error",
  "skipped",
  "timeout",
  "not_run",
]);
const ERROR_CLASSES = new Set(["auth", "rate_limit", "timeout", "server", "network", "refusal", "malformed"]);
const STATUSES = new Set(["completed", "completed_with_gaps", "failed", "aborted"]);

/** Validates a report object against the §5 manifest rules (schema.json is the
 * normative reference; this is the executable check, dependency-free). */
export function validateReport(report: unknown): asserts report is Report {
  if (!isRecord(report)) {
    fail("Report is not an object.");
  }
  const r = report as Record<string, unknown>;

  for (const field of [
    "schema_version",
    "modelcheck_version",
    "run_id",
    "status",
    "started_at_utc",
    "finished_at_utc",
    "provider",
    "endpoint_base_url",
    "requested_model",
    "resolved_model",
    "suite_id",
    "suite_version",
    "suite_content_hash",
    "planned_count",
    "repeats_per_case",
    "parameters",
    "cases",
    "capabilities",
    "cost",
    "latency",
    "limitations",
  ]) {
    if (!(field in r)) {
      fail(`Report is missing required field "${field}" (EVALUATIONS.md §5). A run missing any required field is invalid and must not be presented as complete.`);
    }
  }

  if (r.schema_version !== REPORT_SCHEMA_VERSION) {
    fail(`Report schema_version must be "${REPORT_SCHEMA_VERSION}", got "${String(r.schema_version)}".`);
  }
  for (const field of ["modelcheck_version", "run_id", "provider", "endpoint_base_url", "requested_model", "resolved_model", "suite_id", "suite_version"] as const) {
    if (typeof r[field] !== "string" || (r[field] as string).length === 0) {
      fail(`Report field "${field}" must be a non-empty string.`);
    }
  }
  if (typeof r.suite_content_hash !== "string" || !/^[0-9a-f]{64}$/.test(r.suite_content_hash)) {
    fail(`Report field "suite_content_hash" must be a 64-char lowercase hex SHA-256.`);
  }
  if (!STATUSES.has(r.status as string)) {
    fail(`Report field "status" must be one of: ${[...STATUSES].join(", ")}.`);
  }
  for (const field of ["started_at_utc", "finished_at_utc"] as const) {
    if (typeof r[field] !== "string" || !ISO_UTC.test(r[field] as string)) {
      fail(`Report field "${field}" must be an ISO 8601 UTC timestamp (…Z), got "${String(r[field])}". Local time is never recorded.`);
    }
  }
  if (typeof r.planned_count !== "number" || !Number.isInteger(r.planned_count) || r.planned_count < 1) {
    fail(`Report field "planned_count" must be a positive integer (the denominator anchor).`);
  }
  if (typeof r.repeats_per_case !== "number" || !Number.isInteger(r.repeats_per_case) || r.repeats_per_case < 1) {
    fail(`Report field "repeats_per_case" must be a positive integer.`);
  }
  if (!Array.isArray(r.limitations) || r.limitations.length < 7 || !r.limitations.every((s) => typeof s === "string" && s.length > 0)) {
    fail(`Report field "limitations" must carry at least the 7 mandatory strings (EVALUATIONS.md §10).`);
  }

  validateParameters(r.parameters);
  if (!Array.isArray(r.cases)) {
    fail(`Report field "cases" must be an array.`);
  }
  (r.cases as unknown[]).forEach((c, i) => validateCaseResult(c, `cases[${i}]`));
  if (!Array.isArray(r.capabilities)) {
    fail(`Report field "capabilities" must be an array.`);
  }
  (r.capabilities as unknown[]).forEach((c, i) => validateCapability(c, `capabilities[${i}]`));
  validateCost(r.cost);
  validateLatency(r.latency);
}

function validateParameters(value: unknown): void {
  if (!isRecord(value)) {
    fail(`Report "parameters" must be an object.`);
  }
  const p = value as Record<string, unknown>;
  for (const field of ["temperature", "max_output_tokens", "seed", "streaming", "timeout_ms", "max_retries", "concurrency"] as const) {
    if (!(field in p)) {
      fail(`Report "parameters" is missing "${field}" (EVALUATIONS.md §5.4).`);
    }
  }
  if (p.temperature !== "provider_default" && typeof p.temperature !== "number") {
    fail(`Report "parameters.temperature" must be a number or the exact string "provider_default" — the two are different states.`);
  }
  if (p.max_output_tokens !== "provider_default" && typeof p.max_output_tokens !== "number") {
    fail(`Report "parameters.max_output_tokens" must be a number or "provider_default".`);
  }
  if (p.seed !== "unsupported" && typeof p.seed !== "number") {
    fail(`Report "parameters.seed" must be a number or "unsupported".`);
  }
  if (typeof p.streaming !== "boolean") {
    fail(`Report "parameters.streaming" must be a boolean.`);
  }
  for (const field of ["timeout_ms", "max_retries", "concurrency"] as const) {
    if (typeof p[field] !== "number" || !Number.isInteger(p[field]) || (p[field] as number) < (field === "max_retries" ? 0 : 1)) {
      fail(`Report "parameters.${field}" must be a non-negative integer.`);
    }
  }
}

function validateCaseResult(value: unknown, where: string): void {
  if (!isRecord(value)) {
    fail(`Report ${where} is not an object.`);
  }
  const c = value as Record<string, unknown>;
  for (const field of ["case_id", "capability", "outcome", "score", "scoring_rule", "raw_response", "latency_ms", "attempts"] as const) {
    if (!(field in c)) {
      fail(`Report ${where} is missing required field "${field}" (EVALUATIONS.md §5.5).`);
    }
  }
  if (typeof c.case_id !== "string" || !/^[\w-]+$/.test(c.case_id)) {
    fail(`Report ${where}.case_id "${String(c.case_id)}" is not a valid case id.`);
  }
  if (typeof c.capability !== "string" || c.capability.length === 0) {
    fail(`Report ${where}.capability must be a non-empty string.`);
  }
  if (!OUTCOMES.has(c.outcome as string)) {
    fail(`Report ${where}.outcome "${String(c.outcome)}" is not one of the eight defined outcomes (EVALUATIONS.md §1). Never booleans.`);
  }
  if (c.score !== null && typeof c.score !== "number") {
    fail(`Report ${where}.score must be a number or null (null when not scored).`);
  }
  if (typeof c.scoring_rule !== "string" || c.scoring_rule.length === 0) {
    fail(`Report ${where}.scoring_rule must be a non-empty string (the rule actually applied).`);
  }
  if (typeof c.latency_ms !== "number" || c.latency_ms < 0) {
    fail(`Report ${where}.latency_ms must be a non-negative number.`);
  }
  if (typeof c.attempts !== "number" || !Number.isInteger(c.attempts) || c.attempts < 1) {
    fail(`Report ${where}.attempts must be a positive integer.`);
  }
  if (c.error_class !== undefined) {
    if (!ERROR_CLASSES.has(c.error_class as string)) {
      fail(`Report ${where}.error_class "${String(c.error_class)}" is not a defined error class.`);
    }
    if (!["request_error", "timeout"].includes(c.outcome as string)) {
      fail(`Report ${where} carries error_class "${String(c.error_class)}" but its outcome is "${String(c.outcome)}". error_class is required whenever the outcome is an error, and meaningless otherwise.`);
    }
  }
  if (c.estimated_cost_usd !== undefined) {
    if (c.estimated_cost_usd !== "unpriced" && typeof c.estimated_cost_usd !== "number") {
      fail(`Report ${where}.estimated_cost_usd must be a number or the exact string "unpriced". A missing price is not zero.`);
    }
  }
}

function validateCapability(value: unknown, where: string): void {
  if (!isRecord(value)) {
    fail(`Report ${where} is not an object.`);
  }
  const cap = value as Record<string, unknown>;
  for (const field of [
    "capability",
    "planned",
    "settled",
    "scored",
    "pass",
    "fail",
    "partial",
    "request_errors",
    "scoring_errors",
    "timeouts",
    "coverage",
  ] as const) {
    if (!(field in cap)) {
      fail(`Report ${where} is missing required field "${field}" (EVALUATIONS.md §5.6).`);
    }
  }
  if (typeof cap.capability !== "string" || cap.capability.length === 0) {
    fail(`Report ${where}.capability must be a non-empty string.`);
  }
  for (const field of ["planned", "settled", "scored", "pass", "fail", "partial", "request_errors", "scoring_errors", "timeouts"] as const) {
    if (typeof cap[field] !== "number" || !Number.isInteger(cap[field]) || (cap[field] as number) < 0) {
      fail(`Report ${where}.${field} must be a non-negative integer.`);
    }
  }
  if (typeof cap.coverage !== "number" || cap.coverage < 0 || cap.coverage > 1) {
    fail(`Report ${where}.coverage must be between 0 and 1.`);
  }
  // The denominator invariants are also re-asserted here: a report that
  // violates them is never written (ARCHITECTURE.md §4).
  const scored = (cap.pass as number) + (cap.fail as number) + (cap.partial as number);
  if (scored !== cap.scored) {
    fail(`Report ${where}: scored (${cap.scored}) != pass + fail + partial (${scored}).`);
  }
  const settled = cap.scored as number + (cap.request_errors as number) + (cap.scoring_errors as number) + (cap.timeouts as number);
  if (settled !== cap.settled) {
    fail(`Report ${where}: settled (${cap.settled}) != scored + request_errors + scoring_errors + timeouts (${settled}).`);
  }
  if ((cap.planned as number) < (cap.settled as number)) {
    fail(`Report ${where}: planned (${cap.planned}) < settled (${cap.settled}).`);
  }
}

function validateCost(value: unknown): void {
  if (!isRecord(value)) {
    fail(`Report "cost" must be an object.`);
  }
  const cost = value as Record<string, unknown>;
  for (const field of ["total_usd", "basis", "price_table_ref"] as const) {
    if (!(field in cost)) {
      fail(`Report "cost" is missing "${field}".`);
    }
  }
  if (cost.basis !== "estimated" && cost.basis !== "unpriced") {
    fail(`Report "cost.basis" must be "estimated" or "unpriced".`);
  }
  if (cost.basis === "unpriced" && cost.total_usd !== "unpriced") {
    fail(`Report "cost.total_usd" must be "unpriced" when basis is "unpriced" — a missing price is not zero (EVALUATIONS.md §8.1).`);
  }
  if (cost.basis === "estimated" && (typeof cost.total_usd !== "number" || !(cost.total_usd >= 0))) {
    fail(`Report "cost.total_usd" must be a non-negative number when basis is "estimated".`);
  }
  if (typeof cost.price_table_ref !== "string" || cost.price_table_ref.length === 0) {
    fail(`Report "cost.price_table_ref" must be a non-empty string (the dated table the run used).`);
  }
}

function validateLatency(value: unknown): void {
  if (!isRecord(value)) {
    fail(`Report "latency" must be an object.`);
  }
  const lat = value as Record<string, unknown>;
  for (const field of ["p50_ms", "p95_ms", "n"] as const) {
    if (!(field in lat)) {
      fail(`Report "latency" is missing "${field}".`);
    }
  }
  if (typeof lat.p50_ms !== "number" || lat.p50_ms < 0) {
    fail(`Report "latency.p50_ms" must be a non-negative number.`);
  }
  if (lat.p95_ms !== "not_available" && typeof lat.p95_ms !== "number") {
    fail(`Report "latency.p95_ms" must be a number or the exact string "not_available".`);
  }
  if (typeof lat.p95_ms === "number" && typeof lat.n === "number" && lat.n < 20) {
    fail(`Report "latency.p95_ms" is numeric but n (${String(lat.n)}) < 20. p95 is only reported over ≥20 samples (EVALUATIONS.md §8.2).`);
  }
  if (typeof lat.n !== "number" || !Number.isInteger(lat.n) || lat.n < 0) {
    fail(`Report "latency.n" must be a non-negative integer.`);
  }
}

export interface BuildReportInput {
  run_id: string;
  run_label?: string;
  status: RunStatus;
  started_at_utc: string;
  finished_at_utc: string;
  provider: string;
  endpoint_base_url: string;
  requested_model: string;
  resolved_model: string | undefined;
  suite_id: string;
  suite_version: string;
  suite_content_hash: string;
  planned_count: number;
  repeats_per_case: number;
  parameters: Parameters;
  cases: CaseResult[];
  capabilities: CapabilityAggregate[];
  cost: ReportCost;
  latency: ReportLatency;
  modelcheck_version: string;
}

/** Builds a report with the mandatory limitations injected. `resolved_model`
 * is `unresolved` with a reason when the provider never reported one — never
 * silently omitted (EVALUATIONS.md §5.2). */
export function buildReport(input: BuildReportInput): Report {
  const resolved =
    input.resolved_model !== undefined && input.resolved_model.length > 0
      ? input.resolved_model
      : "unresolved (provider did not report a model id)";
  const scoredCases = input.capabilities.reduce((n, cap) => n + cap.scored, 0);
  const report: Report = {
    schema_version: REPORT_SCHEMA_VERSION,
    modelcheck_version: input.modelcheck_version,
    run_id: input.run_id,
    ...(input.run_label !== undefined ? { run_label: input.run_label } : {}),
    status: input.status,
    started_at_utc: input.started_at_utc,
    finished_at_utc: input.finished_at_utc,
    provider: input.provider,
    endpoint_base_url: input.endpoint_base_url,
    requested_model: input.requested_model,
    resolved_model: resolved,
    suite_id: input.suite_id,
    suite_version: input.suite_version,
    suite_content_hash: input.suite_content_hash,
    planned_count: input.planned_count,
    repeats_per_case: input.repeats_per_case,
    parameters: input.parameters,
    cases: input.cases,
    capabilities: input.capabilities,
    cost: input.cost,
    latency: input.latency,
    limitations: mandatoryLimitations({ scoredCases }),
  };
  validateReport(report);
  return report;
}

/** Validates then writes report.json into the run directory. */
export async function writeReportJson(report: Report, runDir: string): Promise<string> {
  validateReport(report);
  await mkdir(runDir, { recursive: true });
  const filePath = path.join(runDir, "report.json");
  await writeFile(filePath, JSON.stringify(report, null, 2) + "\n", "utf8");
  return filePath;
}
