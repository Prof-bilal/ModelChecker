/** Owns the shared structured error types (PHASES.md Phase 7 item, added in
 * Phase 2 because the adapter and executor need them; recorded as D17). */

export type ErrorClassName =
  | "auth"
  | "rate_limit"
  | "timeout"
  | "server"
  | "network"
  | "refusal"
  | "malformed";

export type StructuredErrorClass = ErrorClassName | "suite" | "config" | "spend";

class StructuredError extends Error {
  readonly error_class: StructuredErrorClass;
  constructor(errorClass: StructuredErrorClass, message: string) {
    super(message);
    this.error_class = errorClass;
    this.name = new.target.name;
  }
}

/** Expected provider failure. Message shape: object, reason, next step. */
export class ProviderError extends Error {
  readonly error_class: ErrorClassName;
  readonly status?: number;
  readonly retry_after_ms?: number;

  constructor(errorClass: ErrorClassName, message: string, status?: number, retryAfterMs?: number) {
    super(message);
    this.name = "ProviderError";
    this.error_class = errorClass;
    this.status = status;
    this.retry_after_ms = retryAfterMs;
  }
}

/** Pre-flight spend guard breach (run stops before scheduling any request). */
export class SpendLimitError extends StructuredError {
  constructor(message: string) { super("spend", message); }
}

/** The user's --model or --base-url could not be resolved to an adapter. */
export class ConfigError extends StructuredError {
  constructor(message: string) { super("config", message); }
}

export class SuiteLoadError extends StructuredError {
  constructor(message: string) { super("suite", message); }
}
