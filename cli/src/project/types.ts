/** Owns the versioned project regression contracts. */
import type { AdapterRequest, AdapterResponse } from "../adapters/types.js";

export type Metric = "task_success" | "schema_validity" | "instruction_following" | "tool_accuracy" | "latency_p95" | "cost";
export type Verdict = "PASS" | "WARN" | "FAIL";
export interface Threshold { warn_drop?: number; fail_drop?: number; warn_increase?: number; fail_increase?: number }
export interface Target { provider: string; model: string; base_url?: string; api_key_env?: string }
export interface ProjectConfig {
  version: 1;
  target: Target;
  runtime: { temperature: number | "provider_default"; reasoning_effort?: string; timeout_ms: number; retries: number; concurrency: number; max_output_tokens: number | "provider_default"; system_prompt?: string; tools?: unknown[]; retrieval?: unknown; agent?: unknown };
  suite: { paths: string[] };
  schemas: Record<string, Record<string, unknown>>;
  thresholds: Partial<Record<Metric, Threshold>>;
}
export interface ProjectCase {
  id: string;
  input: { messages: AdapterRequest["messages"]; tools?: unknown[] };
  expected: { schema?: string | Record<string, unknown>; exact?: unknown; must_include?: string[]; must_not_include?: string[]; max_tool_calls?: number; tools?: Array<{ name: string; schema?: Record<string, unknown> }>; custom?: string[] };
  tags?: string[];
}
export interface Assertion { name: string; pass: boolean; reason?: string }
export interface ProjectResult {
  id: string; status: "scored" | "request_error" | "evaluator_error";
  assertions: Assertion[]; task_success: boolean | null;
  schema_validity: boolean | null; instruction_following: boolean | null; tool_accuracy: boolean | null;
  latency_ms: number; attempts: number; estimated_cost_usd: number | null;
  response?: AdapterResponse; error?: string;
}
export interface MetricValue { value: number | null; n: number; reason?: string }
export type Metrics = Record<Metric, MetricValue>;
export interface ProjectRun {
  version: 1; run_id: string; created_at: string; target: Target; mode: "live" | "offline";
  config_hash: string; suite_hash: string; application_hash: string;
  valid: boolean; cases: number; metrics: Metrics; results: ProjectResult[]; artifact: string;
  price_table_ref: string; price?: unknown;
}
export interface ProjectLock {
  version: 1;
  baseline: { created_at: string; provider: string; model: string; config_hash: string; suite_hash: string; application_hash: string; mode: ProjectRun["mode"] };
  metrics: Metrics; cases: number; artifacts: { run: string; sha256: string };
}
export interface MetricDelta { metric: Metric; baseline: MetricValue; candidate: MetricValue; delta: number | null; verdict: Verdict; reason?: string }
export interface Comparison { verdict: Verdict; metrics: MetricDelta[]; failed_cases: string[]; invalid: boolean; recommendation: "HOLD" | "STAGED MIGRATION" | "MIGRATE"; config_changed: boolean }
