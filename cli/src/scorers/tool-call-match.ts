/** Owns `tool_call_match@1` (EVALUATIONS.md §6.2): the expected tool was called
 * and its arguments validate against that tool's parameter schema. Pure
 * function: no I/O, no clock (CODESTYLE.md §2.2). */

import type { AdapterResponse } from "../adapters/types.js";
import type { ScorerResult } from "./types.js";

export const TOOL_CALL_MATCH_RULE_VERSION = "tool_call_match@1";

interface ToolParamSchema {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  enum?: unknown[];
  items?: unknown;
}

interface ToolDef {
  function?: { name?: string; parameters?: ToolParamSchema };
  name?: string;
  parameters?: ToolParamSchema;
}

function toolName(tool: unknown): string | undefined {
  if (typeof tool !== "object" || tool === null) return undefined;
  const t = tool as ToolDef;
  return t.function?.name ?? t.name;
}

function toolParams(tool: unknown): ToolParamSchema | undefined {
  if (typeof tool !== "object" || tool === null) return undefined;
  const t = tool as ToolDef;
  return t.function?.parameters ?? t.parameters;
}

function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function validateArgs(
  value: unknown,
  schema: ToolParamSchema,
  path: string,
): string[] {
  const errors: string[] = [];
  if (schema.type !== undefined) {
    const actual = typeName(value);
    if (schema.type === "integer" ? !(actual === "number" && Number.isInteger(value)) : actual !== schema.type) {
      errors.push(`${path || "root"}: expected ${schema.type}, got ${actual}`);
      return errors;
    }
  }
  if (schema.enum !== undefined && !schema.enum.some((e) => e === value)) {
    errors.push(`${path || "root"}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
  }
  if (Array.isArray(value) && schema.items !== undefined) {
    // Items are validated directly against the items schema. (An earlier
    // draft wrapped each item in {v: item} to reuse the object branch, which
    // made every item report as "object" — array arguments could never pass.)
    const items = schema.items as ToolParamSchema;
    value.forEach((item, i) => {
      errors.push(...validateArgs(item, items, `${path}[${i}]`));
    });
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const props = (schema.properties ?? {}) as Record<string, ToolParamSchema>;
    for (const key of schema.required ?? []) {
      if (!(key in obj)) {
        errors.push(`${path ? `${path}.` : ""}${key}: required argument is missing`);
      }
    }
    for (const [key, sub] of Object.entries(props)) {
      if (key in obj) {
        errors.push(...validateArgs(obj[key], sub, path ? `${path}.${key}` : key));
      }
    }
  }
  return errors;
}

export function scoreToolCallMatch(
  response: AdapterResponse,
  params: { expected_tool: string; tools: unknown[] },
): ScorerResult {
  const calls = response.tool_calls ?? [];
  const declaredNames = new Set(params.tools.map(toolName).filter((n): n is string => n !== undefined));

  // "No tool required" case (tc-002): an empty expected_tool means compliance
  // is *not calling*. The documented outcome: no call → pass; a declared call
  // → partial (over-eager but harmless); an undeclared call → fail.
  if (params.expected_tool === "") {
    if (calls.length === 0) {
      return { outcome: "pass", score: 1 };
    }
    for (const call of calls) {
      if (!declaredNames.has(call.name)) {
        return { outcome: "fail", score: 0, reason: `Tool "${call.name}" was never declared. An undeclared tool is a fail, not a partial.` };
      }
    }
    return { outcome: "partial", score: 0.5, reason: `No tool was required, but the model called ${calls.map((c) => c.name).join(", ")}. Over-eagerness is the failure under test.` };
  }

  if (calls.length === 0) {
    return { outcome: "fail", score: 0, reason: "No tool was called. The case requires the expected tool." };
  }

  for (const call of calls) {
    if (!declaredNames.has(call.name)) {
      return { outcome: "fail", score: 0, reason: `Tool "${call.name}" was never declared. An undeclared tool is a fail, not a partial.` };
    }
  }

  const expected = calls.find((c) => c.name === params.expected_tool);
  if (expected === undefined) {
    const called = calls.map((c) => c.name).join(", ");
    return { outcome: "partial", score: 0.5, reason: `Declared tool(s) called (${called}) but not the expected "${params.expected_tool}".` };
  }

  const tool = params.tools.find((t) => toolName(t) === params.expected_tool);
  const schema = toolParams(tool);
  if (schema === undefined) {
    return { outcome: "partial", score: 0.5, reason: `Expected tool called but its parameter schema is missing from the case tools.` };
  }

  let args: unknown;
  try {
    args = JSON.parse(expected.arguments);
  } catch {
    return { outcome: "partial", score: 0.5, reason: `Expected tool "${expected.name}" called but its arguments are not valid JSON.` };
  }

  const errors = validateArgs(args, schema, "");
  if (errors.length > 0) {
    return { outcome: "partial", score: 0.5, reason: `Right tool, invalid arguments: ${errors.join("; ")}` };
  }

  return { outcome: "pass", score: 1 };
}
