/** Unit tests for the suite loader (PHASES.md Phase 1). No network, no credentials. */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canonicalJson,
  loadSuite,
  suiteContentHash,
  SuiteLoadError,
} from "./suite-loader.js";

test("valid suite loads with meta, cases and content hash", async () => {
  const suite = await loadSuite("core", "1.0.0");

  assert.equal(suite.id, "core");
  assert.equal(suite.version, "1.0.0");
  assert.equal(suite.cases.length, 3);

  const ids = suite.cases.map((c) => c.case_id);
  assert.deepEqual(ids, ["so-001", "tc-001", "tc-003"]);

  const capabilities = new Set(suite.cases.map((c) => c.capability));
  assert.ok(capabilities.has("structured_output"));
  assert.ok(capabilities.has("tool_calling"));

  assert.match(suite.content_hash, /^[0-9a-f]{64}$/);
});

test("tool_calling cases declare tools; structured_output case does not require them", async () => {
  const suite = await loadSuite("core", "1.0.0");

  const so = suite.cases.find((c) => c.case_id === "so-001");
  assert.ok(so);
  assert.equal(so.scoring, "json_schema@1");
  assert.ok(so.scoring_params.schema);

  const tc = suite.cases.filter((c) => c.scoring === "tool_call_match@1");
  assert.equal(tc.length, 2);
  for (const c of tc) {
    assert.ok(Array.isArray(c.tools) && c.tools.length >= 3, `${c.case_id} must declare tools`);
  }
});

test("invalid suite id throws SuiteLoadError", async () => {
  await assert.rejects(
    () => loadSuite("does-not-exist", "1.0.0"),
    SuiteLoadError,
  );
});

test("invalid version throws SuiteLoadError", async () => {
  await assert.rejects(
    () => loadSuite("core", "9.9.9"),
    SuiteLoadError,
  );
});

test("path traversal in suite id is rejected", async () => {
  await assert.rejects(
    () => loadSuite("../config", "1.0.0"),
    SuiteLoadError,
  );
});

test("content hash is deterministic across loads", async () => {
  const a = await loadSuite("core", "1.0.0");
  const b = await loadSuite("core", "1.0.0");
  assert.equal(a.content_hash, b.content_hash);
});

test("content hash is stable under key reordering", () => {
  const a = { id: "core", version: "1.0.0", cases: [{ case_id: "so-001", input: { prompt: "x" } }] };
  const b = { cases: [{ input: { prompt: "x" }, case_id: "so-001" }], version: "1.0.0", id: "core" };
  assert.equal(suiteContentHash(a), suiteContentHash(b));
});

test("content hash changes when a case changes", () => {
  const a = { cases: [{ case_id: "so-001", input: "x" }] };
  const b = { cases: [{ case_id: "so-001", input: "y" }] };
  assert.notEqual(suiteContentHash(a), suiteContentHash(b));
});

test("canonicalJson sorts keys and is valid JSON", () => {
  const canonical = canonicalJson({ b: 1, a: [true, null, "x"], c: { d: 1.5 } });
  assert.deepEqual(JSON.parse(canonical), { a: [true, null, "x"], b: 1, c: { d: 1.5 } });
  assert.equal(canonical, canonicalJson(JSON.parse(canonical)));
  assert.ok(!canonical.includes(" "), "canonical JSON must not contain whitespace");
});
