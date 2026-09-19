/** Owns the canonical domain types shared across the CLI. */

export type Outcome =
  | "pass"
  | "fail"
  | "partial"
  | "request_error"
  | "scoring_error"
  | "skipped"
  | "timeout"
  | "not_run";

export type RunStatus =
  | "completed"
  | "completed_with_gaps"
  | "failed"
  | "aborted";

export type ErrorClass =
  | "auth"
  | "rate_limit"
  | "timeout"
  | "server"
  | "network"
  | "refusal"
  | "malformed";

export type ScoringRule = "json_schema@1" | "tool_call_match@1";

export interface CaseResult {
  case_id: string;
  capability: string;
  outcome: Outcome;
  score: number | null;
  scoring_rule: ScoringRule;
  raw_response: unknown;
  error_class?: ErrorClass;
  reason?: string;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms: number;
  attempts: number;
  estimated_cost_usd?: number | "unpriced";
}

export interface CapabilityAggregate {
  capability: string;
  planned: number;
  settled: number;
  scored: number;
  pass: number;
  fail: number;
  partial: number;
  request_errors: number;
  scoring_errors: number;
  timeouts: number;
  coverage: number;
  interval?: [number, number] | "not_available";
}

export interface ReportCost {
  total_usd: number | "unpriced";
  basis: "estimated" | "unpriced";
  price_table_ref: string;
}

export interface ReportLatency {
  p50_ms: number;
  p95_ms: number | "not_available";
  n: number;
}

export interface Parameters {
  temperature: number | "provider_default";
  max_output_tokens: number | "provider_default";
  seed: number | "unsupported";
  streaming: boolean;
  timeout_ms: number;
  max_retries: number;
  concurrency: number;
}

export interface Report {
  schema_version: string;
  modelcheck_version: string;
  run_id: string;
  run_label?: string;
  status: RunStatus;
  started_at_utc: string;
  finished_at_utc: string;
  provider: string;
  endpoint_base_url: string;
  requested_model: string;
  resolved_model: string;
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
  limitations: string[];
}

export interface SuiteCase {
  case_id: string;
  capability: string;
  version: string;
  input: unknown;
  scoring: ScoringRule;
  scoring_params: Record<string, unknown>;
  tools?: unknown[];
}

export interface SuiteMeta {
  id: string;
  version: string;
  content_hash: string;
  cases: SuiteCase[];
}

export interface PlannedCase {
  case_id: string;
  repeat_index: number;
}

export interface PlannedRun {
  suite: SuiteMeta;
  cases: PlannedCase[];
  repeats_per_case: number;
  estimated_requests: number;
}

export interface AdapterConfig {
  provider: "openai-compatible" | "anthropic";
  base_url?: string;
  api_key_env: string;
  model: string;
}

export interface RunOptions {
  suite: string;
  model: string;
  label?: string;
  repeat: number;
  concurrency: number;
  timeout: number;
  maxRetries: number;
  spendLimit?: number;
  /** Provider API base URL; default is the provider's official endpoint. */
  baseUrl?: string;
  /** Name of the env var holding the API key. The key itself is never an
   * argument (SECURITY.md: argv is visible in ps and shell history). */
  apiKeyEnv?: string;
  json: boolean;
}
