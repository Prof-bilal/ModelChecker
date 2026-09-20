/** Unit tests for tool_call_match@1 (TESTING.md §5.1 matrix). No network, no clock. */

import assert from "node:assert/strict";
import { test } from "node:test";

import { scoreToolCallMatch } from "./tool-call-match.js";
import type { AdapterResponse } from "../adapters/types.js";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_weather",
      parameters: {
        type: "object",
        properties: { location: { type: "string" }, unit: { type: "string", enum: ["celsius", "fahrenheit"] } },
        required: ["location"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_time",
      parameters: { type: "object", properties: { timezone: { type: "string" } }, required: ["timezone"] },
    },
  },
];

function response(toolCalls: AdapterResponse["tool_calls"]): AdapterResponse {
  return { content: null, tool_calls: toolCalls, model: "test-model", latency_ms: 0, raw: { synthetic: true } };
}

function call(name: string, args: string) {
  return { name, arguments: args };
}

const PARAMS = { expected_tool: "get_weather", tools: TOOLS };

test("correct tool + valid args → pass", () => {
  const r = scoreToolCallMatch(response([call("get_weather", '{"location":"Lisbon"}')]), PARAMS);
  assert.deepEqual({ outcome: r.outcome, score: r.score }, { outcome: "pass", score: 1 });
});

test("correct tool + invalid args (missing required) → partial", () => {
  const r = scoreToolCallMatch(response([call("get_weather", "{}")]), PARAMS);
  assert.equal(r.outcome, "partial");
  assert.equal(r.score, 0.5);
  assert.match(String(r.reason), /location/);
});

test("correct tool + wrong enum value → partial (synonym is partial, not fail)", () => {
  const r = scoreToolCallMatch(response([call("get_weather", '{"location":"Lisbon","unit":"kelvin"}')]), PARAMS);
  assert.equal(r.outcome, "partial");
});

test("wrong but declared tool → partial", () => {
  const r = scoreToolCallMatch(response([call("get_time", '{"timezone":"UTC"}')]), PARAMS);
  assert.equal(r.outcome, "partial");
  assert.equal(r.score, 0.5);
});

test("undeclared tool → fail", () => {
  const r = scoreToolCallMatch(response([call("delete_database", "{}")]), PARAMS);
  assert.equal(r.outcome, "fail");
  assert.equal(r.score, 0);
});

test("no tool call → fail", () => {
  const r = scoreToolCallMatch(response(null), PARAMS);
  assert.equal(r.outcome, "fail");
  assert.equal(r.score, 0);
});

test("no tool call when none required: empty expectations are a case-authoring matter — undeclared call still fails", () => {
  // tc-002 ("no tool required") is scored by declaring expected_tool "" —
  // any tool call is then an over-eager call. The scorer treats an empty
  // expected_tool with no call as pass (documented outcome per TESTING §5.1).
  const noToolNeeded = { expected_tool: "", tools: TOOLS };
  assert.equal(scoreToolCallMatch(response(null), noToolNeeded).outcome, "pass");
  assert.equal(scoreToolCallMatch(response([call("get_weather", '{"location":"x"}')]), noToolNeeded).outcome, "partial");
});

test("arguments that are not valid JSON → partial, not fail", () => {
  const r = scoreToolCallMatch(response([call("get_weather", "{location: Lisbon}")]), PARAMS);
  assert.equal(r.outcome, "partial");
});

test("numeric type discipline: amount must be a number, not a string", () => {
  const tools = [
    {
      type: "function",
      function: {
        name: "charge",
        parameters: {
          type: "object",
          properties: { amount: { type: "number" }, currency: { type: "string" } },
          required: ["amount", "currency"],
        },
      },
    },
  ];
  const params = { expected_tool: "charge", tools };
  assert.equal(scoreToolCallMatch(response([call("charge", '{"amount":1250,"currency":"GBP"}')]), params).outcome, "pass");
  const r = scoreToolCallMatch(response([call("charge", '{"amount":"1250","currency":"GBP"}')]), params);
  assert.equal(r.outcome, "partial");
  assert.match(String(r.reason), /amount/);
});

test("scorer purity: same input → same outcome; no clock, no network", () => {
  const input = response([call("get_weather", '{"location":"Lisbon"}')]);
  const a = scoreToolCallMatch(input, PARAMS);
  const b = scoreToolCallMatch(input, PARAMS);
  assert.deepEqual(a, b);
});

test("array argument: string items validate against the items schema (tc-008)", () => {
  const tools = [
    {
      type: "function",
      function: {
        name: "archive_projects",
        parameters: {
          type: "object",
          properties: { project_names: { type: "array", items: { type: "string" } } },
          required: ["project_names"],
        },
      },
    },
  ];
  const params = { expected_tool: "archive_projects", tools };
  assert.equal(
    scoreToolCallMatch(response([call("archive_projects", '{"project_names":["aurora","baseline"]}')]), params).outcome,
    "pass",
  );
  const r = scoreToolCallMatch(response([call("archive_projects", '{"project_names":["aurora",42]}')]), params);
  assert.equal(r.outcome, "partial");
  assert.match(String(r.reason), /project_names\[1\]: expected string, got number/);
});
