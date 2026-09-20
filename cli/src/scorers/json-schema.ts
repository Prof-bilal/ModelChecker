/** Owns `json_schema@1` (EVALUATIONS.md §6.1): parse the body as JSON and
 * validate against the case schema. pass/fail only — partial is not used.
 * Pure function: no I/O, no clock (CODESTYLE.md §2.2). Validation is
 * hand-rolled: no JSON-Schema library until one is earned (CODESTYLE §2.7). */

import type { AdapterResponse } from "../adapters/types.js";
import type { ScorerResult } from "./types.js";

export const JSON_SCHEMA_RULE_VERSION = "json_schema@1";

/** Fence policy: a fenced body is a fail. The policy is asserted here, not
 * assumed away (TESTING.md §5.1) — a provider wrapping JSON in ``` fences has
 * not complied with the structured-output contract. */
function parseBody(body: string | null): { ok: true; value: unknown } | { ok: false; reason: string } {
  if (body === null || body.trim() === "") {
    return { ok: false, reason: "Response body was empty. The model must return exactly one JSON value." };
  }
  try {
    return { ok: true, value: JSON.parse(body) };
  } catch {
    return { ok: false, reason: "Response body is not valid JSON. No fence stripping, no preamble tolerance — the body must be exactly one JSON value." };
  }
}

type JsonSchema = {
  /** A single type name, or a union of type names (e.g. ["string", "null"]). */
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: unknown[];
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  /** String length constraints, measured in characters (docs/benchmarks.md so-010). */
  minLength?: number;
  maxLength?: number;
};

function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function validate(value: unknown, schema: JsonSchema, path: string): string[] {
  const errors: string[] = [];

  if (schema.type !== undefined) {
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeName(value);
    const matchesType = (expected: string): boolean =>
      expected === "integer"
        ? actual === "number" && Number.isInteger(value)
        : expected === "number"
          ? actual === "number"
          : actual === expected;
    if (!expectedTypes.some(matchesType)) {
      const expectedDesc = Array.isArray(schema.type) ? schema.type.join(" | ") : (schema.type as string);
      errors.push(`${path || "root"}: expected ${expectedDesc}, got ${actual}`);
      return errors;
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path || "root"}: string has ${value.length} characters, minimum ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path || "root"}: string has ${value.length} characters, maximum ${schema.maxLength}`);
    }
  }

  if (schema.enum !== undefined && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    errors.push(`${path || "root"}: value ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const props = schema.properties ?? {};
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(obj)) {
        if (!(key in props)) {
          errors.push(`${path || "root"}: additional property "${key}" is not allowed`);
        }
      }
    }
    for (const key of schema.required ?? []) {
      if (!(key in obj)) {
        errors.push(`${path ? `${path}.` : ""}${key}: required property is missing`);
      }
    }
    for (const [key, sub] of Object.entries(props)) {
      if (key in obj) {
        errors.push(...validate(obj[key], sub, path ? `${path}.${key}` : key));
      }
    }
  }

  if (Array.isArray(value) && schema.items !== undefined) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path || "root"}: array has ${value.length} items, minimum ${schema.minItems}`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path || "root"}: array has ${value.length} items, maximum ${schema.maxItems}`);
    }
    value.forEach((item, i) => {
      errors.push(...validate(item, schema.items as JsonSchema, `${path}[${i}]`));
    });
  }

  return errors;
}

export function scoreJsonSchema(response: AdapterResponse, params: { schema: JsonSchema }): ScorerResult {
  const parsed = parseBody(response.content);
  if (!parsed.ok) {
    return { outcome: "fail", score: 0, reason: parsed.reason };
  }
  const errors = validate(parsed.value, params.schema, "");
  if (errors.length > 0) {
    return { outcome: "fail", score: 0, reason: `Schema violation: ${errors.join("; ")}` };
  }
  return { outcome: "pass", score: 1 };
}
