/** Owns the fixture-based mock adapter (TESTING.md §4): a first-class fixture,
 * selected explicitly, never by accident. Reads recorded provider responses
 * from tests/fixtures/responses/. Performs no network I/O. */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ProviderError } from "../lib/errors.js";
import type { AdapterRequest, AdapterResponse, ModelAdapter } from "./types.js";

export interface MockAdapterConfig {
  /** Directory holding <case_id>.json fixtures. Defaults to tests/fixtures/responses. */
  fixtures_dir?: string;
  /** Error scenario name (e.g. "401", "429", "500", "timeout") → <case_id>.<scenario>.json. */
  scenario?: string;
}

export class MockAdapter implements ModelAdapter {
  private readonly fixturesDir: string;
  private readonly scenario?: string;
  private resolved: string | undefined;

  constructor(config: MockAdapterConfig = {}) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    this.fixturesDir = config.fixtures_dir ?? path.resolve(here, "..", "..", "tests", "fixtures", "responses");
    this.scenario = config.scenario;
  }

  identify(): string {
    return `mock${this.scenario !== undefined ? ` (scenario: ${this.scenario})` : ""}`;
  }

  resolvedModel(): string | undefined {
    return this.resolved;
  }

  async send(request: AdapterRequest): Promise<AdapterResponse> {
    const caseId = (request as AdapterRequest & { case_id?: string }).case_id ?? "unknown-case";
    const fileName = this.scenario !== undefined ? `${caseId}.${this.scenario}.json` : `${caseId}.json`;
    const filePath = path.join(this.fixturesDir, fileName);

    let raw: string;
    try {
      raw = await readFile(filePath, "utf8");
    } catch {
      throw new ProviderError(
        "malformed",
        `Mock fixture "${fileName}" not found in ${this.fixturesDir}. Add the fixture or fix the case id.`,
      );
    }

    const started = Date.now();
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      throw new ProviderError(
        "malformed",
        `Mock fixture "${fileName}" is not valid JSON (${error instanceof Error ? error.message : String(error)}). Fix the fixture.`,
      );
    }

    const latency_ms = Date.now() - started;
    return normaliseMockPayload(payload, latency_ms, request.model, (m) => {
      this.resolved = m;
    });
  }
}

function normaliseMockPayload(
  payload: unknown,
  latency_ms: number,
  fallbackModel: string,
  setResolved: (model: string) => void,
): AdapterResponse {
  if (typeof payload !== "object" || payload === null) {
    throw new ProviderError("malformed", `Mock fixture is not an object. Fix the fixture.`);
  }
  const p = payload as Record<string, unknown>;

  // An explicit scenario flag wins over the error payload shape.
  if (p.scenario === "timeout") {
    throw new ProviderError("timeout", `Provider did not respond within the timeout. Increase --timeout or check the provider.`);
  }

  // Error-scenario fixtures keep the provider's error shape.
  if (typeof p.error === "object" && p.error !== null) {
    const err = p.error as Record<string, unknown>;
    const status = typeof err.status === "number" ? err.status : undefined;
    const message = String(err.message ?? "mock error");
    if (status === 401 || status === 403) {
      throw new ProviderError("auth", `Provider rejected the API key (HTTP ${status}). Check the key or use a different one.`, status);
    }
    if (status === 429) {
      throw new ProviderError("rate_limit", "Provider rate limit hit (429). Retry with fewer concurrent requests or wait.", status);
    }
    if (status !== undefined && status >= 500) {
      throw new ProviderError("server", `Provider server error (HTTP ${status}). Retry later or check the provider's status page.`, status);
    }
    throw new ProviderError("malformed", `Provider returned an error payload: ${message}. Check the model id and parameters.`);
  }

  const choices = Array.isArray(p.choices) ? p.choices : [];
  const first = choices[0];
  let content: string | null = null;
  let toolCalls: Array<{ name: string; arguments: string }> | null = null;

  if (typeof first === "object" && first !== null) {
    const message = (first as Record<string, unknown>).message;
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
  const model = typeof p.model === "string" ? p.model : fallbackModel;
  setResolved(model);

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
