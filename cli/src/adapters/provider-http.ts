/** Owns the HTTP concerns every provider adapter shares: base-URL safety
 * validation, status → error-class mapping, and Retry-After parsing, so two
 * providers classify identically (PHASES.md Phase 2, D20). Protocol shaping
 * (request bodies, response normalisation) stays in each adapter, and nothing
 * here knows about scoring, retry policy, or reports (CODESTYLE.md §2.2). */

import { ConfigError, ProviderError } from "../lib/errors.js";
import type { ErrorClassName } from "../lib/errors.js";

/** Rejects endpoints a provider call must never target (SECURITY.md §4):
 * non-HTTPS hosts other than loopback, and the cloud metadata service. */
export function validateBaseUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigError(`Provider endpoint "${value}" is not a valid URL. Pass an HTTPS provider URL.`);
  }
  if (url.hostname === "169.254.169.254") {
    throw new ConfigError(`Provider endpoint "${value}" targets the cloud metadata service. Choose a provider endpoint instead.`);
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname))) {
    throw new ConfigError(`Provider endpoint "${value}" must use HTTPS, except for loopback local servers. Pass a safe --base-url.`);
  }
}

/** The host of a validated base URL, used to name the failing target in errors.
 * A host names the provider without exposing the path, a key, or userinfo. */
export function providerHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return "provider";
  }
}

/** Message shape: object, reason, next step (CODESTYLE.md §2.4). */
export function providerError(errorClass: ErrorClassName, message: string, status?: number, retryAfterMs?: number): ProviderError {
  return new ProviderError(errorClass, message, status, retryAfterMs);
}

/** Maps an HTTP status to an error class. `provider` names the target so the
 * user knows which endpoint failed; it is a host or label, never a credential. */
export function classifyStatus(status: number, provider: string, retryAfterMs?: number): ProviderError {
  switch (true) {
    case status === 401 || status === 403:
      return providerError("auth", `Provider "${provider}" rejected the API key (HTTP ${status}). Check the key or use a different one.`, status);
    case status === 429:
      return providerError("rate_limit", `Provider "${provider}" rate limit hit (429). Retry with fewer concurrent requests or wait.`, status, retryAfterMs);
    case status >= 500:
      return providerError("server", `Provider "${provider}" server error (HTTP ${status}). Retry later or check the provider's status page.`, status, retryAfterMs);
    case status === 404:
      return providerError("malformed", `Endpoint or model not found (404) at "${provider}". Check --base-url and the model id.`, status);
    default:
      return providerError("malformed", `Provider "${provider}" rejected the request (HTTP ${status}). Check the request parameters.`, status);
  }
}

export function parseRetryAfter(header: string | null): number | undefined {
  if (header === null) {
    return undefined;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return undefined;
}