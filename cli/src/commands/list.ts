/** Owns listing locally stored runs. */

import { readRunIndex, scanRunIndex, type RunIndexEntry } from "../lib/runs.js";

export async function listCommand(): Promise<void> {
  const entries = (await readRunIndex()) ?? (await scanRunIndex());
  console.error(renderRunTable(entries));
}

export function renderRunTable(entries: RunIndexEntry[]): string {
  const headers = ["run_id", "label", "model", "suite", "timestamp", "status"];
  const rows = entries.map((entry) => [
    entry.run_id,
    entry.label ?? "",
    entry.model,
    entry.suite_version,
    entry.timestamp,
    entry.status,
  ]);
  const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0)));
  const format = (row: string[]) => row.map((value, index) => value.padEnd(widths[index] ?? value.length)).join("  ").trimEnd();
  return [format(headers), format(widths.map((width) => "-".repeat(width))), ...rows.map(format)].join("\n");
}
