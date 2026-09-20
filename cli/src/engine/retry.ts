/** Owns retry classification and backoff (ARCHITECTURE.md §5.2): bounded,
 * retryable classes only — never auth, malformed content, or scoring failures. */

import { ProviderError } from "../lib/errors.js";

export const RETRYABLE_CLASSES = ["rate_limit", "server", "network"] as const;
export type RetryableClass = (typeof RETRYABLE_CLASSES)[number];

export const DEFAULT_MAX_RETRIES = 2;
export const BACKOFF_BASE_MS = 500;
export const BACKOFF_CAP_MS = 60_000;

export function isRetryable(error: unknown): error is ProviderError {
  return (
    error instanceof ProviderError &&
    (RETRYABLE_CLASSES as readonly string[]).includes(error.error_class)
  );
}

/** Exponential backoff with full jitter, capped at 60s, honouring Retry-After. */
export function backoffDelay(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined) {
    return Math.min(Math.max(retryAfterMs, 0), BACKOFF_CAP_MS);
  }
  const exponential = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_CAP_MS);
  return Math.floor(Math.random() * exponential);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
