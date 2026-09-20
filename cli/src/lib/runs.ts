/** Owns local run storage paths and the rebuildable run index. */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Report, RunStatus } from "../types.js";

export interface RunIndexEntry {
  run_id: string;
  label?: string;
  model: string;
  suite_version: string;
  timestamp: string;
  status: RunStatus;
  path: string;
}

export function runsDirectory(): string {
  return path.join(storageDirectory(), "runs");
}

export function indexPath(): string {
  return path.join(storageDirectory(), "index.json");
}

function storageDirectory(): string {
  return process.env.RUNS_DIR ?? path.join(process.env.HOME ?? ".", ".modelcheck");
}

export function indexEntryFromReport(report: Report, runPath: string): RunIndexEntry {
  return {
    run_id: report.run_id,
    ...(report.run_label !== undefined ? { label: report.run_label } : {}),
    model: report.requested_model,
    suite_version: report.suite_version,
    timestamp: report.finished_at_utc,
    status: report.status,
    path: runPath,
  };
}

export async function readRunIndex(): Promise<RunIndexEntry[] | undefined> {
  try {
    const raw = await readFile(indexPath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`Run index ${indexPath()} must contain an array.`);
    }
    return parsed as RunIndexEntry[];
  } catch (error) {
    if (isMissingFile(error)) return undefined;
    throw error;
  }
}

export async function appendRunIndex(entry: RunIndexEntry): Promise<void> {
  const existing = (await readRunIndex()) ?? [];
  const withoutEntry = existing.filter((item) => item.run_id !== entry.run_id);
  await mkdir(path.dirname(indexPath()), { recursive: true });
  await writeFile(indexPath(), JSON.stringify([...withoutEntry, entry], null, 2) + "\n", "utf8");
}

export async function scanRunIndex(): Promise<RunIndexEntry[]> {
  let entries: string[];
  try {
    entries = await readdir(runsDirectory());
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }

  const reports: RunIndexEntry[] = [];
  for (const name of entries.sort()) {
    const reportPath = path.join(runsDirectory(), name, "report.json");
    try {
      const report = JSON.parse(await readFile(reportPath, "utf8")) as Report;
      reports.push(indexEntryFromReport(report, path.dirname(reportPath)));
    } catch (error) {
      if (!isMissingFile(error)) {
        // A non-report directory is not a run; list remains rebuildable.
        continue;
      }
    }
  }
  return reports.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
