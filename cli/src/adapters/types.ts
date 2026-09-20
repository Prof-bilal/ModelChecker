/** Owns the ModelAdapter boundary — the only provider-facing interface. */

/** The normalised request the engine sends. The adapter translates this into
 * provider-specific wire format. Never carries credentials. */
export interface AdapterRequest {
  /** Wire model id, e.g. "deepseek/deepseek-v4-flash" for OpenRouter. */
  model: string;
  messages: Array<{ role: string; content: string }>;
  tools?: unknown[];
  temperature: number | "provider_default";
  max_output_tokens: number | "provider_default";
  timeout_ms: number;
}

export interface AdapterUsage {
  input_tokens?: number;
  output_tokens?: number;
}

/** The normalised response. `raw` keeps the provider payload verbatim. */
export interface AdapterResponse {
  content: string | null;
  tool_calls: Array<{ name: string; arguments: string }> | null;
  model: string;
  usage?: AdapterUsage;
  latency_ms: number;
  raw: unknown;
}

/** The only provider boundary (ARCHITECTURE.md §3). Adapters know nothing
 * about scoring, retry policy, or report shape. */
export interface ModelAdapter {
  /** Human-readable provider label, e.g. "openai-compatible (openrouter)". */
  identify(): string;
  /** The provider's own resolved model string, when it reports one. */
  resolvedModel(): string | undefined;
  send(request: AdapterRequest): Promise<AdapterResponse>;
}
