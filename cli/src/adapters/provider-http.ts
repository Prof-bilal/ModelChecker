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

/** A single deadline covers headers and body; raw payloads are bounded at 8 MiB. */
export async function requestProviderJson(url: string, headers: Record<string, string>, body: Record<string, unknown>, timeoutMs: number): Promise<{ payload: unknown; latency_ms: number }> {
  const controller = new AbortController();
  const started = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const target = providerHost(url);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cancel = () => { void reader?.cancel().catch(() => {}); };
  controller.signal.addEventListener("abort", cancel);
  try {
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location && new URL(location, url).origin !== new URL(url).origin) throw providerError("network", "Provider redirected to a different origin. Check the base URL and disable the redirect.", response.status);
      throw providerError("network", "Provider returned a redirect; no credentials were forwarded. Use the final provider endpoint.", response.status);
    }
    if (!response.ok) throw classifyStatus(response.status, target, parseRetryAfter(response.headers.get("retry-after")));
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (response.body) {
      reader = response.body.getReader();
      if (controller.signal.aborted) cancel();
      for (;;) {
        const part = await reader.read();
        if (controller.signal.aborted) throw providerError("timeout", `Provider "${target}" did not finish within ${timeoutMs} ms. Increase --timeout or check the provider.`);
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 8 * 1024 * 1024) { await reader.cancel(); throw providerError("malformed", "Provider response exceeds the 8 MiB limit. Lower the output token limit."); }
        chunks.push(part.value);
      }
    }
    let payload: unknown;
    try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw providerError("malformed", `Provider "${target}" returned a non-JSON success response. Check the provider endpoint.`); }
    return { payload, latency_ms: Date.now() - started };
  } catch (error) {
    if (controller.signal.aborted) throw providerError("timeout", `Provider "${target}" did not finish within ${timeoutMs} ms. Increase --timeout or check the provider.`);
    if (error instanceof ProviderError) throw error;
    throw providerError("network", `Could not reach the provider at ${target}. Check the base URL and your connection.`);
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener("abort", cancel);
    reader?.releaseLock();
  }
}
