/** Comparability tests for suite identity, denominators and parameters. */

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { compareCommand } from "./compare.js";
import { buildFixtureReport } from "../report/fixture-report.js";
import { writeReportJson } from "../report/write-json.js";

const tempDirs: string[] = [];
after(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function reportPath(mutator: (report: ReturnType<typeof buildFixtureReport>) => void = () => {}): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "modelcheck-compare-"));
  tempDirs.push(dir);
  const report = buildFixtureReport();
  mutator(report);
  return writeReportJson(report, dir);
}

async function outputFor(baseline: string, candidate: string): Promise<string> {
  const lines: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => lines.push(args.join(" "));
  try {
    await compareCommand([baseline, candidate]);
  } finally {
    console.error = original;
  }
  return lines.join("\n");
}

test("refuses reports with different suite versions", async () => {
  const baseline = await reportPath();
  const candidate = await reportPath((report) => { report.suite_version = "2.0.0"; });
  await assert.rejects(compareCommand([baseline, candidate]), /suite versions differ/);
});

test("refuses reports with different suite content hashes", async () => {
  const baseline = await reportPath();
  const candidate = await reportPath((report) => { report.suite_content_hash = "b".repeat(64); });
  await assert.rejects(compareCommand([baseline, candidate]), /suite content hashes differ/);
});

test("deltas carry capability denominators", async () => {
  const baseline = await reportPath();
  const candidate = await reportPath((report) => { report.capabilities[0]!.pass += 1; report.capabilities[0]!.fail -= 1; });
  const output = await outputFor(baseline, candidate);
  assert.match(output, /structured_output: \+1 cases of 4 \(same suite version, same parameters\)/);
  assert.match(output, /Estimated cost delta:/);
  assert.match(output, /Latency p50 delta: /);
});

test("different parameters are explicitly flagged", async () => {
  const baseline = await reportPath();
  const candidate = await reportPath((report) => { report.parameters.concurrency = 1; });
  const output = await outputFor(baseline, candidate);
  assert.match(output, /parameters differ/);
  assert.match(output, /same suite version, parameters differ/);
});
