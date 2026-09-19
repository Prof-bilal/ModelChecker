/** Unit tests for argv parsing (PHASES.md Phase 0/1). No network, no credentials. */

import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCliArgs, UsageError } from "./args.js";

test("parses the run command with core flags", () => {
  const parsed = parseCliArgs(["run", "--suite", "core", "--model", "openai/gpt-4o"]);
  assert.equal(parsed.command, "run");
  assert.equal(parsed.values.suite, "core");
  assert.equal(parsed.values.model, "openai/gpt-4o");
});

test("parses --base-url", () => {
  const parsed = parseCliArgs([
    "run",
    "--model",
    "openrouter/unbiased-pareto",
    "--base-url",
    "https://openrouter.ai/api/v1",
  ]);
  assert.equal(parsed.values["base-url"], "https://openrouter.ai/api/v1");
});

test("parses --api-key-env as a NAME, not a key value", () => {
  const parsed = parseCliArgs(["run", "--model", "openai/gpt-4o", "--api-key-env", "MY_KEY_VAR"]);
  assert.equal(parsed.values["api-key-env"], "MY_KEY_VAR");
});

test("unknown flag throws UsageError", () => {
  assert.throws(() => parseCliArgs(["run", "--bogus", "x"]), UsageError);
});

test("positional arguments are rejected except for compare", () => {
  assert.throws(() => parseCliArgs(["run", "extra"]), UsageError);
  const parsed = parseCliArgs(["compare", "run-a", "run-b"]);
  assert.equal(parsed.command, "compare");
  assert.deepEqual(parsed.positionals, ["run-a", "run-b"]);
});

test("no command with --help prints usage without error", () => {
  const parsed = parseCliArgs(["--help"]);
  assert.equal(parsed.help, true);
  assert.equal(parsed.command, undefined);
});
