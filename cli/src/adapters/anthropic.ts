/** Owns the Anthropic Messages API adapter: `/v1/messages` request
 * construction, response normalisation, and error classification. Knows
 * nothing about scoring, retry policy, or reports (CODESTYLE.md §2.2).
 *
 * MVP §4.3 requires this adapter; D17 deferred it to Phase 6 and this is it.
 * Error classification is shared with the OpenAI-compatible adapter through
 * provider-http.ts so the two cannot drift (D20). */

import {
  classifyStatus,
  parseRetryAfter,
  providerError,
  providerHost,
  validateBaseUrl,
} from "./provider-http.js";
import type {
  AdapterRequest,
  AdapterResponse,
  ModelAdapter,
} from "./types.js";

/** The Messages API version pinned by this adapter. Anthropic requires an
 * explicit version; changing it is a wire-format change covered by a test. */
export const ANTHROPIC_API_VERSION = "2023-06-01";

/** Anthropic requires `max_tokens` on every request — unlike the
 * OpenAI-compatible gateways there is no provider default to fall back to.
 * This is the request ceiling ModelCheck sends when a case asks for
 * `provider_default`. It is a request parameter, not a measurement, and the
 * report records the value actually sent (EVALUATIONS.md §5.4). */
export const ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS = 4096;

export interface AnthropicAdapterConfig {
  base_url: string;
  /** The API key value. Read from an env var by the caller — never argv, never logged. */
  api_key: string;
  /** Wire model id, e.g. "claude-sonnet-5". */
  model: string;
  /** Diagnostic label, e.g. "anthropic". */
  label?: string;
}

/** Translates one tool declaration into the Messages API shape. The suite
 * declares tools in the OpenAI `{type:"function", function:{...}}` shape
 * (docs/benchmarks.md §3); a declaration already carrying `input_schema`
 * passes through unchanged. */
function toAnthropicTool(tool: unknown): unknown {
  if (typeof tool !== "object" || tool === null) {
    return tool;
  }
  const candidate = tool as Record<string, unknown>;
  const fn = candidate.function;
  if (typeof fn !== "object" || fn === null) {
    return tool;
  }
  const f = fn as Record<string, unknown>;
  return {
    name: f.name,
    ...(f.description !== undefined ? { description: f.description } : {}),
    input_schema: f.parameters ?? { type: "object", properties: {} },
  };
}

export class AnthropicAdapter implements ModelAdapter {
  private readonly config: AnthropicAdapterConfig;
  /** Host used to name the provider in errors; never the key or full URL. */
  private readonly target: string;
  private resolved: string | undefined;

  constructor(config: AnthropicAdapterConfig) {
    validateBaseUrl(config.base_url);
    this.config = config;
    this.target = providerHost(config.base_url);
  }

  identify(): string {
    return `anthropic${this.config.label !== undefined ? ` (${this.config.label})` : ""}`;
  }

  resolvedModel(): string | undefined {
    return this.resolved;
  }

  buildRequest(request: AdapterRequest): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
    // The Messages API takes the system prompt as a top-level field and only
    // accepts user/assistant turns in `messages`.
    const systemParts: string[] = [];
    const messages: Array<{ role: string; content: string }> = [];
    for (const message of request.messages) {
      if (message.role === "system") {
        systemParts.push(message.content);
      } else {
        messages.push({ role: message.role === "assistant" ? "assistant" : "user", content: message.content });
      }
    }

    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens:
        request.max_output_tokens === "provider_default"
          ? ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS
          : request.max_output_tokens,
      messages,
    };
    if (systemParts.length > 0) {
      body.system = systemParts.join("\n\n");
    }
    if (request.temperature !== "provider_default") {
      body.temperature = request.temperature;
    }
    if (request.tools !== undefined && request.tools.length > 0) {
      body.tools = request.tools.map(toAnthropicTool);
    }

    return {
      url: `${this.config.base_url.replace(/\/$/, "")}/messages`,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.config.api_key,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      body,
    };
  }

  normaliseResponse(payload: unknown, latency_ms: number): AdapterResponse {
    if (typeof payload !== "object" || payload === null) {
      throw providerError("malformed", `Provider "${this.target}" returned a non-object response body. Record the run and check the provider status.`);
    }
    const p = payload as Record<string, unknown>;

    if ((typeof p.error === "object" && p.error !== null) || p.type === "error") {
      const err = (typeof p.error === "object" && p.error !== null ? p.error : {}) as Record<string, unknown>;
      throw providerError("malformed", `Provider "${this.target}" returned an error payload: ${String(err.message ?? "unknown error")}. Check the model id and parameters.`);
    }

    // `content` is an array of blocks: text blocks carry the answer, tool_use
    // blocks carry the tool call. A missing array is an empty answer, not a crash.
    const blocks = Array.isArray(p.content) ? p.content : [];
    const textParts: string[] = [];
    const calls: Array<{ name: string; arguments: string }> = [];
    for (const block of blocks) {
      if (typeof block !== "object" || block === null) {
        continue;
      }
      const b = block as Record<string, unknown>;
      if (b.type === "text" && typeof b.text === "string") {
        textParts.push(b.text);
      }
      if (b.type === "tool_use" && typeof b.name === "string") {
        // The Messages API returns parsed `input`; the domain interface carries
        // tool arguments as a JSON string, so serialise it back.
        calls.push({ name: b.name, arguments: JSON.stringify(b.input ?? {}) });
      }
    }

    const usage = (typeof p.usage === "object" && p.usage !== null ? p.usage : {}) as Record<string, unknown>;
    const model = typeof p.model === "string" ? p.model : this.config.model;
    this.resolved = model;

    return {
      content: textParts.length > 0 ? textParts.join("") : null,
      tool_calls: calls.length > 0 ? calls : null,
      model,
      usage: {
        input_tokens: typeof usage.input_tokens === "number" ? usage.input_tokens : undefined,
        output_tokens: typeof usage.output_tokens === "number" ? usage.output_tokens : undefined,
      },
      latency_ms,
      raw: payload,
    };
  }

  async send(request: AdapterRequest): Promise<AdapterResponse> {
    const { url, headers, body } = this.buildRequest(request);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeout_ms);
    const started = Date.now();

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
        // Manual redirects let us reject cross-origin targets before a second
        // request can carry provider credentials.
        redirect: "manual",
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw providerError("timeout", `Provider "${this.target}" did not respond within ${request.timeout_ms} ms. Increase --timeout or check the provider.`);
      }
      const cause = error instanceof Error ? error.message : String(error);
      throw providerError("network", `Could not reach the provider at ${this.target} (${cause}). Check the base URL and your connection.`);
    } finally {
      clearTimeout(timer);
    }

    const latency_ms = Date.now() - started;
    const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location !== null && new URL(location, url).origin !== new URL(url).origin) {
        throw providerError("network", "Provider redirected to a different origin. Check the base URL and disable the redirect.", response.status);
      }
      throw providerError("network", "Provider returned a redirect. Check the base URL and use the final provider endpoint.", response.status);
    }

    if (!response.ok) {
      throw classifyStatus(response.status, this.target, retryAfterMs);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw providerError("malformed", `Provider "${this.target}" returned a non-JSON success response. Record the run and check the provider status.`);
    }

    return this.normaliseResponse(payload, latency_ms);
  }
}