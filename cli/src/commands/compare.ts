/** Owns comparison of two completed runs. */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { UsageError } from "../lib/args.js";
import { runsDirectory } from "../lib/runs.js";
import type { Report } from "../types.js";
import { validateReport } from "../report/write-json.js";

export async function compareCommand(positionals: string[] = []): Promise<void> {
  if (positionals.length !== 2) {
    throw new UsageError("compare requires exactly two run ids or report paths. Run modelcheck compare <runA> <runB>.");
  }
  const [baseline, candidate] = await Promise.all(positionals.map(loadReport));
  if (baseline.suite_version !== candidate.suite_version) {
    throw new UsageError(`Cannot compare runs: suite versions differ (${baseline.suite_version} vs ${candidate.suite_version}).`);
  }
  if (baseline.suite_content_hash !== candidate.suite_content_hash) {
    throw new UsageError("Cannot compare runs: suite content hashes differ. The reports may not use the same cases or scoring parameters.");
  }

  const sameParameters = JSON.stringify(baseline.parameters) === JSON.stringify(candidate.parameters);
  const basis = sameParameters ? "same suite version, same parameters" : "same suite version, parameters differ";
  console.error(`Comparing ${baseline.run_id} → ${candidate.run_id}`);
  if (!sameParameters) console.error("Warning: parameters differ; deltas are shown but are not like-for-like.");

  const baselineCapabilities = new Map(baseline.capabilities.map((cap) => [cap.capability, cap]));
  for (const candidateCapability of candidate.capabilities) {
    const previous = baselineCapabilities.get(candidateCapability.capability);
    if (previous === undefined) {
      console.error(`  ${candidateCapability.capability}: not tested in baseline; no delta computed`);
      continue;
    }
    const delta = candidateCapability.pass - previous.pass;
    console.error(`  ${candidateCapability.capability}: ${signed(delta)} cases of ${candidateCapability.planned} (${basis})`);
  }

  printCostDelta(baseline, candidate);
  console.error(`Latency p50 delta: ${deltaValue(candidate.latency.p50_ms, baseline.latency.p50_ms)} ms (n=${candidate.latency.n} vs ${baseline.latency.n})`);
  if (typeof baseline.latency.p95_ms === "number" && typeof candidate.latency.p95_ms === "number") {
    console.error(`Latency p95 delta: ${deltaValue(candidate.latency.p95_ms, baseline.latency.p95_ms)} ms (n=${candidate.latency.n} vs ${baseline.latency.n})`);
  } else {
    console.error("Latency p95 delta: not available (p95 requires at least 20 scored samples in each run)");
  }
}

export async function loadReport(reference: string): Promise<Report> {
  const reportPath = reference.endsWith("report.json")
    ? reference
    : path.join(runsDirectory(), reference, "report.json");
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(reportPath, "utf8"));
  } catch {
    throw new UsageError(`Could not load report for "${reference}". Expected ${reportPath}.`);
  }
  try {
    validateReport(parsed);
  } catch (error) {
    throw new UsageError(`Report "${reference}" is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
  return parsed;
}

function printCostDelta(baseline: Report, candidate: Report): void {
  if (typeof baseline.cost.total_usd !== "number" || typeof candidate.cost.total_usd !== "number") {
    console.error("Estimated cost delta: not available (one or both runs are unpriced)");
    return;
  }
  console.error(`Estimated cost delta: ${signed(candidate.cost.total_usd - baseline.cost.total_usd, 6)} USD`);
}

function signed(value: number, decimals = 0): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}`;
}

function deltaValue(candidate: number, baseline: number): string {
  return signed(candidate - baseline, 2);
}
