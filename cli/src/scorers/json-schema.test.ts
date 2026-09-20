/** Unit tests for json_schema@1 (TESTING.md §5.1 matrix). No network, no clock. */

import assert from "node:assert/strict";
import { test } from "node:test";

import { scoreJsonSchema } from "./json-schema.js";
import type { AdapterResponse } from "../adapters/types.js";

const SCHEMA = {
  type: "object",
  properties: {
    invoice_id: { type: "string" },
    vendor: { type: "string" },
    total: { type: "number" },
    due_date: { type: "string" },
  },
  required: ["invoice_id", "vendor", "total", "due_date"],
  additionalProperties: false,
};

function response(content: string | null): AdapterResponse {
  return {
    content,
    tool_calls: null,
    model: "test-model",
    latency_ms: 0,
    raw: { synthetic: true },
  };
}

test("valid object → pass", () => {
  const r = scoreJsonSchema(
    response('{"invoice_id":"INV-1","vendor":"Acme","total":10.5,"due_date":"2026-09-19"}'),
    { schema: SCHEMA },
  );
  assert.deepEqual({ outcome: r.outcome, score: r.score }, { outcome: "pass", score: 1 });
});

test("unparseable → fail", () => {
  const r = scoreJsonSchema(response("not json at all"), { schema: SCHEMA });
  assert.equal(r.outcome, "fail");
  assert.equal(r.score, 0);
});

test("schema violation → fail with the violation as reason", () => {
  const r = scoreJsonSchema(
    response('{"invoice_id":"INV-1","vendor":"Acme","total":"10.50","due_date":"2026-09-19"}'),
    { schema: SCHEMA },
  );
  assert.equal(r.outcome, "fail");
  assert.match(String(r.reason), /total/);
  assert.match(String(r.reason), /number/);
});

test("missing required field → fail", () => {
  const r = scoreJsonSchema(
    response('{"invoice_id":"INV-1","vendor":"Acme","total":1}'),
    { schema: SCHEMA },
  );
  assert.equal(r.outcome, "fail");
  assert.match(String(r.reason), /due_date/);
});

test("additional property forbidden → fail (the helpful-extra-field catch)", () => {
  const r = scoreJsonSchema(
    response('{"invoice_id":"INV-1","vendor":"Acme","total":1,"due_date":"x","reasoning":"let me think"}'),
    { schema: SCHEMA },
  );
  assert.equal(r.outcome, "fail");
  assert.match(String(r.reason), /reasoning/);
});

test("refusal prose → fail, with refusal recorded as reason", () => {
  const refusal = "I'm sorry, but I cannot extract invoice details from that.";
  const r = scoreJsonSchema(response(refusal), { schema: SCHEMA });
  assert.equal(r.outcome, "fail");
  assert.match(String(r.reason), /not valid JSON/);
});

test("empty body → fail", () => {
  assert.equal(scoreJsonSchema(response(""), { schema: SCHEMA }).outcome, "fail");
  assert.equal(scoreJsonSchema(response(null), { schema: SCHEMA }).outcome, "fail");
});

test("JSON in markdown fence → fail (policy asserted, not stripped)", () => {
  const fenced = "```json\n{\"invoice_id\":\"INV-1\",\"vendor\":\"Acme\",\"total\":1,\"due_date\":\"x\"}\n```";
  const r = scoreJsonSchema(response(fenced), { schema: SCHEMA });
  assert.equal(r.outcome, "fail");
});

test("so-006 array counting: 3 items required — 2 fails, 4 fails (off-by-one check)", () => {
  const lineSchema = {
    type: "array",
    minItems: 3,
    maxItems: 3,
    items: {
      type: "object",
      properties: { sku: { type: "string" }, qty: { type: "integer" } },
      required: ["sku", "qty"],
      additionalProperties: false,
    },
  };

  const three = scoreJsonSchema(
    response('[{"sku":"A","qty":1},{"sku":"B","qty":2},{"sku":"C","qty":3}]'),
    { schema: lineSchema },
  );
  assert.equal(three.outcome, "pass");

  const two = scoreJsonSchema(
    response('[{"sku":"A","qty":1},{"sku":"B","qty":2}]'),
    { schema: lineSchema },
  );
  assert.equal(two.outcome, "fail");

  const four = scoreJsonSchema(
    response('[{"sku":"A","qty":1},{"sku":"B","qty":2},{"sku":"C","qty":3},{"sku":"D","qty":4}]'),
    { schema: lineSchema },
  );
  assert.equal(four.outcome, "fail");
});

test("integer vs number discipline: 1250.5 is not an integer", () => {
  const schema = { type: "object", properties: { qty: { type: "integer" } }, required: ["qty"] };
  assert.equal(scoreJsonSchema(response('{"qty":1250}'), { schema }).outcome, "pass");
  assert.equal(scoreJsonSchema(response('{"qty":1250.5}'), { schema }).outcome, "fail");
});

test("enum adherence: a plausible synonym is a fail by design", () => {
  const schema = { type: "object", properties: { category: { type: "string", enum: ["billing", "shipping", "other"] } }, required: ["category"] };
  assert.equal(scoreJsonSchema(response('{"category":"billing"}'), { schema }).outcome, "pass");
  assert.equal(scoreJsonSchema(response('{"category":"payments"}'), { schema }).outcome, "fail");
});

test("scorer purity: same input → same outcome", () => {
  const body = '{"invoice_id":"INV-1","vendor":"Acme","total":1,"due_date":"x"}';
  const a = scoreJsonSchema(response(body), { schema: SCHEMA });
  const b = scoreJsonSchema(response(body), { schema: SCHEMA });
  assert.deepEqual(a, b);
});

test("union types: [string, null] accepts both, rejects others (so-011/so-012)", () => {
  const schema = { type: "object", properties: { middle_name: { type: ["string", "null"] } }, required: ["middle_name"] };
  assert.equal(scoreJsonSchema(response('{"middle_name":null}'), { schema }).outcome, "pass");
  assert.equal(scoreJsonSchema(response('{"middle_name":"Ray"}'), { schema }).outcome, "pass");
  const wrong = scoreJsonSchema(response('{"middle_name":42}'), { schema });
  assert.equal(wrong.outcome, "fail");
  assert.match(wrong.reason ?? "", /string \| null/);
});

test("maxLength in characters: over → fail, at ceiling → pass (so-010)", () => {
  const schema = { type: "object", properties: { summary: { type: "string", maxLength: 5 } }, required: ["summary"] };
  assert.equal(scoreJsonSchema(response('{"summary":"12345"}'), { schema }).outcome, "pass");
  const over = scoreJsonSchema(response('{"summary":"123456"}'), { schema });
  assert.equal(over.outcome, "fail");
  assert.match(over.reason ?? "", /maximum 5/);
});
