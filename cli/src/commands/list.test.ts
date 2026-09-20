/** Local run listing tests, including the rebuildable index fallback. */

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { listCommand } from "./list.js";
import { appendRunIndex } from "../lib/runs.js";

const originalRunsDir = process.env.RUNS_DIR;
const tempDirPromise = mkdtemp(path.join(os.tmpdir(), "modelcheck-list-"));
const tempDirs: string[] = [];

after(async () => {
  if (originalRunsDir === undefined) delete process.env.RUNS_DIR;
  else process.env.RUNS_DIR = originalRunsDir;
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function captureList(): Promise<string> {
  const lines: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => lines.push(args.join(" "));
  try {
    await listCommand();
  } finally {
    console.error = original;
  }
  return lines.join("\n");
}

test("empty index and runs directory produce an empty table", async () => {
  const tempDir = await tempDirPromise;
  tempDirs.push(tempDir);
  process.env.RUNS_DIR = path.join(tempDir, "runs");
  const output = await captureList();
  assert.match(output, /run_id.*label.*model.*suite.*timestamp.*status/);
  assert.doesNotMatch(output, /run-\d/);
});

test("populated index prints the expected table", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "modelcheck-list-index-"));
  tempDirs.push(tempDir);
  process.env.RUNS_DIR = path.join(tempDir, "runs");
  await appendRunIndex({
    run_id: "run-baseline",
    label: "baseline",
    model: "openai/gpt-4o",
    suite_version: "1.0.0",
    timestamp: "2026-09-19T12:00:00Z",
    status: "completed",
    path: path.join(tempDir, "runs", "run-baseline"),
  });
  const output = await captureList();
  assert.match(output, /run-baseline\s+baseline\s+openai\/gpt-4o\s+1\.0\.0\s+2026-09-19T12:00:00Z\s+completed/);
});
