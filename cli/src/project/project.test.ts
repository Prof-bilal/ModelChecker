/** Exercises project workflow and CI contracts using synthetic local responses only. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { stringify } from "yaml";
import { hash, loadCases, validateCase, validateConfig, DEFAULT_THRESHOLDS } from "./config.js";
import { evaluate } from "./evaluate.js";
import { aggregate, compareMetrics, verdictExit } from "./verdict.js";
import { runProject, atomicWrite } from "./runner.js";
import { loadLock } from "./commands.js";
import { parse } from "yaml";
import type { ProjectConfig, Metrics } from "./types.js";

const cli = fileURLToPath(new URL("../index.js", import.meta.url));
const config = (): ProjectConfig => validateConfig({ version: 1, target: { provider: "openai", model: "gpt-4o" }, suite: { paths: ["modelcheck/cases/*.jsonl"] } });
const response = (content: string) => ({ content, tool_calls: null, model: "synthetic-model", raw: { synthetic: true }, latency_ms: 100, usage: { input_tokens: 100, output_tokens: 100 } });

test("config validates strictly, normalizes defaults and rejects invalid thresholds, credentials and runtimes", () => {
  assert.deepEqual(config().thresholds, DEFAULT_THRESHOLDS);
  assert.equal(config().runtime.concurrency, 3);
  for (const runtime of [{ retries: -1 }, { concurrency: 1.5 }, { timeout_ms: 0 }, { unknown: true }]) assert.throws(() => validateConfig({ ...config(), runtime }));
  assert.throws(() => validateConfig({ ...config(), thresholds: { task_success: { warn_drop: .2, fail_drop: .1 } } }));
  assert.throws(() => validateConfig({ ...config(), target: { provider: "openai", model: "x", api_key: "never-accept" } }));
  assert.throws(() => validateConfig({ ...config(), target: { provider: "openai", model: "x", base_url: "https://user:pass@example.com" } }));
  assert.equal(hash({ z: 1, a: 2 }), hash({ a: 2, z: 1 }));
});

test("evaluators cover schema, exact structure, required/forbidden content and ordered tool constraints", () => {
  const cfg = config(); cfg.schemas.answer = { type: "object", required: ["ok"], properties: { ok: { const: true } }, additionalProperties: false };
  const c = validateCase({ id: "schema", input: { messages: [{ role: "user", content: "hello" }] }, expected: { schema: "answer", must_include: ["ok"], must_not_include: ["secret"], exact: { ok: true }, max_tool_calls: 0 } }, cfg);
  assert.ok(evaluate(c, response('{"ok":true}'), cfg).assertions.every((a) => a.pass));
  assert.equal(evaluate(c, response("```json\n{}\n```"), cfg).schema_validity, false);
  const tool = validateCase({ ...c, expected: { tools: [{ name: "lookup", schema: { type: "object", required: ["id"], properties: { id: { type: "integer" } } } }] } }, cfg);
  assert.equal(evaluate(tool, { ...response(""), tool_calls: [{ name: "lookup", arguments: '{"id":1}' }] }, cfg).tool_accuracy, true);
  assert.equal(evaluate(tool, { ...response(""), tool_calls: [{ name: "lookup", arguments: '{"id":"1"}' }] }, cfg).tool_accuracy, false);
  assert.throws(() => validateCase({ ...c, expected: {} }, cfg));
  assert.throws(() => validateCase({ ...c, expected: { schema: "absent" } }, cfg));
  assert.throws(() => validateCase({ ...c, expected: { custom: ["../escape"] } }, cfg));
});

function metrics(rate: number, cost = 1): Metrics {
  return { task_success: { value: rate, n: 100 }, instruction_following: { value: rate, n: 100 }, schema_validity: { value: null, n: 0, reason: "not tested" }, tool_accuracy: { value: null, n: 0, reason: "not tested" }, latency_p95: { value: 100, n: 100 }, cost: { value: cost, n: 100 } };
}
test("threshold boundaries, missing coverage, worst verdict and CI codes are explicit", () => {
  const cfg = config();
  assert.equal(compareMetrics(metrics(.94), metrics(.82), cfg).verdict, "FAIL");
  assert.equal(compareMetrics(metrics(.94), metrics(.93), cfg).verdict, "PASS");
  cfg.thresholds.task_success = { warn_drop: .005, fail_drop: .08 };
  assert.equal(compareMetrics(metrics(.94), metrics(.93), cfg).verdict, "WARN");
  assert.equal(compareMetrics(metrics(.94), metrics(.94, .75), cfg).recommendation, "MIGRATE");
  const unavailable = metrics(.94); unavailable.task_success = { value: null, n: 0 };
  assert.equal(compareMetrics(metrics(.94), unavailable, cfg).verdict, "FAIL");
  assert.equal(compareMetrics(metrics(.94), metrics(.94), cfg, { invalid: true }).recommendation, "HOLD");
  assert.equal(verdictExit("WARN", false), 0); assert.equal(verdictExit("WARN", true), 2); assert.equal(verdictExit("FAIL", false), 1);
  const zero = metrics(.94, 0);
  assert.equal(compareMetrics(zero, metrics(.94, 1), cfg).verdict, "FAIL");
});

test("project verdict summaries match the approved synthetic golden examples", async () => {
  const golden = JSON.parse(await readFile(new URL("../../tests/fixtures/reports/golden/project-verdicts.json", import.meta.url), "utf8"));
  const cfg = config(); cfg.thresholds.task_success = { warn_drop: .005, fail_drop: .08 };
  for (const [name, rate, cost] of [["fail", .82, 1], ["warn", .93, 1], ["cheaper", .94, .75]] as const) {
    const c = compareMetrics(metrics(.94), metrics(rate, cost), cfg);
    assert.deepEqual({ verdict: c.verdict, exit: verdictExit(c.verdict, false), ...(name === "warn" ? { strict_exit: verdictExit(c.verdict, true) } : {}), recommendation: c.recommendation }, golden[name]);
  }
});

test("scaffold → baseline → verify → compare works through the installed CLI boundary, offline", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "modelcheck-project-"));
  const call = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8", timeout: 30000 });
  try {
    assert.equal(call("init", "--yes").status, 0);
    assert.equal(call("init", "--yes").status, 1, "init must preserve existing files");
    const cases = Array.from({ length: 100 }, (_, i) => ({ id: `synthetic-${i}`, input: { messages: [{ role: "user", content: "Reply OK" }] }, expected: { exact: "OK" } }));
    await writeFile(path.join(root, "modelcheck/cases/example.jsonl"), cases.map((c) => JSON.stringify(c)).join("\n") + "\n");
    async function fixtures(name: string, passes: number, tokens = 100): Promise<string> {
      const file = path.join(root, `${name}.jsonl`);
      await writeFile(file, cases.map((c, i) => JSON.stringify({ id: c.id, response: { ...response(i < passes ? "OK" : "NO"), usage: { input_tokens: tokens, output_tokens: tokens } }, latency_ms: 100 })).join("\n") + "\n");
      return file;
    }
    const baseline = await fixtures("baseline", 94), fail = await fixtures("fail", 82), warn = await fixtures("warn", 93), cheap = await fixtures("cheap", 94, 75);
    const cfg = config(); cfg.thresholds.task_success = { warn_drop: .005, fail_drop: .08 };
    await writeFile(path.join(root, "modelcheck/config.yaml"), stringify(cfg));
    const initial = call("baseline", "--offline", "--responses", baseline, "--format", "json");
    assert.equal(initial.status, 0, initial.stderr);
    assert.equal(JSON.parse(initial.stdout).run.metrics.task_success.value, .94);
    const lock = await readFile(path.join(root, "modelcheck.lock"), "utf8");
    const parsedLock = parse(lock);
    const evidencePath = path.resolve(root, parsedLock.artifacts.run);
    const evidence = await readFile(evidencePath, "utf8");
    await writeFile(evidencePath, evidence + "\n");
    await assert.rejects(loadLock(path.join(root, "modelcheck.lock"), root), /evidence hash/);
    await writeFile(evidencePath, evidence);
    assert.equal(call("verify", "--format", "json").status, 1, "fixture locks cannot gate live requests");
    const failed = call("verify", "--offline", "--responses", fail, "--format", "json");
    assert.equal(failed.status, 1, failed.stderr); assert.equal(JSON.parse(failed.stdout).comparison.verdict, "FAIL");
    const failureArtifact = JSON.parse(await readFile(JSON.parse(failed.stdout).verdict_artifact, "utf8"));
    assert.equal(failureArtifact.comparison.verdict, "FAIL");
    assert.deepEqual(failureArtifact.thresholds.task_success, { warn_drop: .005, fail_drop: .08 });
    const warned = call("verify", "--offline", "--responses", warn, "--format", "json");
    assert.equal(warned.status, 0, warned.stderr); assert.equal(JSON.parse(warned.stdout).comparison.verdict, "WARN");
    assert.equal(call("verify", "--offline", "--responses", warn, "--strict").status, 2);
    const compared = call("compare", "--candidate", "openai:gpt-4o", "--offline", "--current-responses", baseline, "--responses", cheap, "--format", "json");
    assert.equal(compared.status, 0, compared.stderr); assert.equal(JSON.parse(compared.stdout).comparison.recommendation, "MIGRATE");
    assert.equal(await readFile(path.join(root, "modelcheck.lock"), "utf8"), lock, "verification never updates the lock");
    assert.equal(call("baseline", "--offline", "--responses", baseline).status, 1, "replacement requires --force");
    await writeFile(path.join(root, "modelcheck/cases/example.jsonl"), JSON.stringify(cases[0]) + "\n");
    const mismatch = call("verify", "--offline", "--responses", baseline, "--format", "json");
    assert.equal(mismatch.status, 1); assert.match(mismatch.stdout, /Suite, schemas/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("offline replay never touches a provider and redacts credentials without corrupting JSON", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "modelcheck-offline-"));
  const originalFetch = globalThis.fetch;
  const previous = process.env.MODELCHECK_SENTINEL_SECRET;
  const secret = 'synthetic-credential-"quoted"';
  process.env.MODELCHECK_SENTINEL_SECRET = secret;
  globalThis.fetch = async () => { throw new Error("Offline test touched the network"); };
  try {
    const cfg = config();
    const c = validateCase({ id: "synthetic", input: { messages: [{ role: "user", content: "OK" }] }, expected: { must_not_include: ["raw_secret"] } }, cfg);
    const fixture = path.join(root, "responses.jsonl");
    await writeFile(fixture, JSON.stringify({ id: c.id, response: response(secret), latency_ms: 100 }) + "\n");
    const result = await runProject({ root, config: cfg, cases: [c], responses: fixture });
    assert.equal(result.mode, "offline"); assert.equal(result.valid, true);
    const text = await readFile(result.artifact, "utf8");
    assert.ok(!text.includes(JSON.stringify(secret).slice(1, -1)));
    const records = text.trim().split("\n").map((line) => JSON.parse(line));
    assert.equal(records[1].response.content, "[REDACTED]");
    assert.equal(result.metrics.latency_p95.value, null);
    const malformed = path.join(root, "missing.jsonl");
    await writeFile(malformed, "");
    await assert.rejects(runProject({ root, config: cfg, cases: [c], responses: malformed }), /exact case id set/);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.MODELCHECK_SENTINEL_SECRET; else process.env.MODELCHECK_SENTINEL_SECRET = previous;
    await rm(root, { recursive: true, force: true });
  }
});

test("trusted custom evaluator uses stdin JSON and contributes to task success", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "modelcheck-custom-"));
  try {
    const script = path.join(root, "modelcheck/evaluators/custom/check");
    await atomicWrite(script, '#!/usr/bin/env node\nlet text="";process.stdin.on("data",c=>text+=c);process.stdin.on("end",()=>console.log(JSON.stringify({pass:JSON.parse(text).response.content==="OK"})));\n');
    await chmod(script, 0o700);
    const cfg = config();
    const c = validateCase({ id: "custom", input: { messages: [{ role: "user", content: "OK" }] }, expected: { custom: ["check"] } }, cfg);
    const result = await runProject({ root, config: cfg, cases: [c], adapter: { identify: () => "synthetic", resolvedModel: () => "synthetic", send: async () => response("OK") } });
    assert.equal(result.valid, true); assert.equal(result.results[0].task_success, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("runner records request failures and evaluator errors; invalid runs cannot become baselines", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "modelcheck-errors-"));
  try {
    const cfg = config(); cfg.runtime.retries = 0;
    const c = validateCase({ id: "synthetic", input: { messages: [{ role: "user", content: "OK" }] }, expected: { exact: "OK" } }, cfg);
    const failed = await runProject({ root, config: cfg, cases: [c], adapter: { identify: () => "synthetic", resolvedModel: () => "synthetic", send: async () => { throw new Error("synthetic failure"); } } });
    assert.equal(failed.valid, false); assert.equal(failed.metrics.task_success.value, null); assert.equal(failed.results[0].status, "request_error");
    const absent = await runProject({ root, config: cfg, cases: [{ ...c, expected: { custom: ["missing"] } }], adapter: { identify: () => "synthetic", resolvedModel: () => "synthetic", send: async () => response("OK") } });
    assert.equal(absent.valid, false); assert.equal(absent.results[0].status, "evaluator_error");
    assert.equal(aggregate([]).schema_validity.value, null);
    await atomicWrite(path.join(root, "modelcheck/cases/cases.jsonl"), JSON.stringify(c) + "\n" + JSON.stringify(c) + "\n");
    await assert.rejects(loadCases(root, cfg), /Duplicate/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
