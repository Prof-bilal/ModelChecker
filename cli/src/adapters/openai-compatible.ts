/** Owns the OpenAI-compatible adapter: chat-completions request construction,
 * response normalisation, and error classification. Knows nothing about
 * scoring, retry policy, or reports (CODESTYLE.md §2.2). */

import { requestProviderJson, providerError, providerHost, validateBaseUrl } from "./provider-http.js";
import type {
  AdapterRequest,
  AdapterResponse,
  ModelAdapter,
} from "./types.js";

export interface OpenAIAdapterConfig {
  base_url: string;
  /** The API key value. Read from an env var by the caller — never argv, never logged. */
  api_key: string;
  /** Wire model id (may itself contain a slash, e.g. deepseek/deepseek-v4-flash). */
  model: string;
  /** Diagnostic label, e.g. "openrouter". */
  label?: string;
}

export class OpenAICompatibleAdapter implements ModelAdapter {
  private readonly config: OpenAIAdapterConfig;
  /** Host used to name the provider in errors; never the key or full URL. */
  private readonly target: string;
  private resolved: string | undefined;

  constructor(config: OpenAIAdapterConfig) {
    validateBaseUrl(config.base_url);
    this.config = config;
    this.target = providerHost(config.base_url);
  }

  identify(): string {
    return `openai-compatible${this.config.label !== undefined ? ` (${this.config.label})` : ""}`;
  }

  resolvedModel(): string | undefined {
    return this.resolved;
  }

  buildRequest(request: AdapterRequest): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream: false,
    };
    if (request.temperature !== "provider_default") {
      body.temperature = request.temperature;
    }
    if (request.max_output_tokens !== "provider_default") {
      body.max_tokens = request.max_output_tokens;
    }
    if (request.tools !== undefined && request.tools.length > 0) {
      body.tools = request.tools;
    }
    if (request.response_format !== undefined) {
      body.response_format = request.response_format;
    }
    if (request.reasoning_effort !== undefined) body.reasoning_effort = request.reasoning_effort;
    return {
      url: `${this.config.base_url.replace(/\/$/, "")}/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.api_key}`,
      },
      body,
    };
  }

  normaliseResponse(payload: unknown, latency_ms: number): AdapterResponse {
    if (typeof payload !== "object" || payload === null) {
      throw providerError("malformed", "Provider returned a non-object response body. Record the run and check the provider status.");
    }
    const p = payload as Record<string, unknown>;

    if (typeof p.error === "object" && p.error !== null) {
      const err = p.error as Record<string, unknown>;
      throw providerError("malformed", `Provider returned an error payload: ${String(err.message ?? "unknown error")}. Check the model id and parameters.`);
    }

    const choices = Array.isArray(p.choices) ? p.choices : [];
    const first = choices[0];
    let content: string | null = null;
    let toolCalls: Array<{ name: string; arguments: string }> | null = null;

    if (typeof first === "object" && first !== null) {
      const choice = first as Record<string, unknown>;
      const message = choice.message;
      if (typeof message === "object" && message !== null) {
        const m = message as Record<string, unknown>;
        content = typeof m.content === "string" ? m.content : null;
        if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
          toolCalls = m.tool_calls.map((tc) => {
            const call = tc as Record<string, unknown>;
            const fn = call.function as Record<string, unknown> | undefined;
            return {
              name: String(fn?.name ?? ""),
              arguments: typeof fn?.arguments === "string" ? fn.arguments : JSON.stringify(call.arguments ?? {}),
            };
          });
        }
      }
    }

    const usage = (typeof p.usage === "object" && p.usage !== null ? p.usage : {}) as Record<string, unknown>;
    const model = typeof p.model === "string" ? p.model : this.config.model;
    this.resolved = model;

    return {
      content,
      tool_calls: toolCalls,
      model,
      usage: {
        input_tokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
        output_tokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined,
      },
      latency_ms,
      raw: payload,
    };
  }

  async send(request: AdapterRequest): Promise<AdapterResponse> {
    const { url, headers, body } = this.buildRequest(request);
    const { payload, latency_ms } = await requestProviderJson(url, headers, body, request.timeout_ms);
    return this.normaliseResponse(payload, latency_ms);
  }
}
