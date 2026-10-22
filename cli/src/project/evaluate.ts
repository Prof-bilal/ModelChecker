/** Owns deterministic assertions over normalized responses; no I/O or model judging. */
import type { AdapterResponse } from "../adapters/types.js";
import { ajv, canonical } from "./config.js";
import type { Assertion, ProjectCase, ProjectConfig } from "./types.js";

export function evaluate(c: ProjectCase, response: AdapterResponse, config: ProjectConfig) {
  const assertions: Assertion[] = [];
  const instruction: boolean[] = [];
  const tools: boolean[] = [];
  let schemaValidity: boolean | null = null;
  const content = response.content ?? "";
  function check(name: string, pass: boolean, reason?: string): boolean {
    assertions.push({ name, pass, ...(reason ? { reason } : {}) }); return pass;
  }
  const expected = c.expected;
  if (expected.schema !== undefined) {
    try {
      const schema = typeof expected.schema === "string" ? config.schemas[expected.schema] : expected.schema;
      const validate = ajv.compile(schema);
      schemaValidity = check("schema", validate(JSON.parse(content)) as boolean, ajv.errorsText(validate.errors));
    } catch { schemaValidity = check("schema", false, "Response must be JSON matching the declared schema."); }
  }
  if (Object.hasOwn(expected, "exact")) {
    let actual: unknown = content;
    if (typeof expected.exact !== "string") { try { actual = JSON.parse(content); } catch { actual = undefined; } }
    instruction.push(check("exact", actual !== undefined && canonical(actual) === canonical(expected.exact)));
  }
  for (const value of expected.must_include ?? []) instruction.push(check(`must_include:${value}`, content.includes(value)));
  for (const value of expected.must_not_include ?? []) instruction.push(check(`must_not_include:${value}`, !content.includes(value)));
  const calls = response.tool_calls ?? [];
  if (expected.max_tool_calls !== undefined) tools.push(check("max_tool_calls", calls.length <= expected.max_tool_calls));
  if (expected.tools !== undefined) {
    tools.push(check("tool_count", calls.length === expected.tools.length));
    for (const [index, wanted] of expected.tools.entries()) {
      const call = calls[index];
      let pass = call?.name === wanted.name;
      if (pass && wanted.schema) {
        try { pass = ajv.compile(wanted.schema)(JSON.parse(call.arguments)) as boolean; } catch { pass = false; }
      }
      tools.push(check(`tool:${index}:${wanted.name}`, pass));
    }
  }
  return {
    assertions,
    schema_validity: schemaValidity,
    instruction_following: instruction.length ? instruction.every(Boolean) : null,
    tool_accuracy: tools.length ? tools.every(Boolean) : null,
  };
}
