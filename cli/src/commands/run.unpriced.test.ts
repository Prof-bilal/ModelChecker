/** End-to-end check (PHASES.md Phase 4 verification): a full mock run against
 * the real core suite must write a schema-valid report.json whose cost block
 * states `unpriced` for an unpriced model — never 0, never a fabricated total
 * (Hard Rule 2, EVALUATIONS.md §8.1, D18). No network: the mock adapter is
 * selected explicitly. */

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { runCommand } from "../commands/run.js";
import { validateReport } from "../report/write-json.js";

const UNPRICED_MODEL = "acme/mystery-model"; // absent from the price table by construction

const tmpRoot = path.join(tmpdir(), `modelcheck-unpriced-e2e-${process.pid}`);
after(async () => {
  await rm(tmpRoot, { recursive: true, force: true });
});

test("unpriced model → report cost is unpriced, never zero (end to end)", async () => {
  const { report, reportPath, runDir } = await runCommand({
    suite: "core",
    model: UNPRICED_MODEL,
    adapter: "mock",
  });

  // The report on disk is what the run handed back, and it validates.
  const onDisk = JSON.parse(await readFile(reportPath, "utf8"));
  assert.deepEqual(onDisk, JSON.parse(JSON.stringify(report)));
  validateReport(onDisk);

  assert.equal(onDisk.requested_model, UNPRICED_MODEL);
  assert.equal(onDisk.cost.basis, "unpriced");
  assert.equal(onDisk.cost.total_usd, "unpriced");
  assert.notEqual(onDisk.cost.total_usd, 0);
  assert.equal(typeof onDisk.cost.price_table_ref, "string");

  // No case carries a fabricated number either: mock fixtures return usage,
  // but with no price row every priced case must be the string, not a number.
  const numeric = onDisk.cases.filter((c: { estimated_cost_usd?: unknown }) => typeof c.estimated_cost_usd === "number");
  assert.deepEqual(numeric, [], "no case may carry a numeric cost for an unpriced model");

  // The report landed inside a fresh run directory next to raw/.
  assert.ok(runDir.startsWith(tmpRoot) || runDir.includes("modelcheck-mock-"));
  assert.ok(path.basename(reportPath) === "report.json");
  const htmlPath = path.join(runDir, "report.html");
  const html = await readFile(htmlPath, "utf8");
  assert.match(html, /<!doctype html>/);
  assert.match(html, /raw provider response \(inert text\)/);
});
