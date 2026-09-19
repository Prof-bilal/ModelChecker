/** Owns expanding a loaded suite into an ordered planned run (cases × repeats). */

import type { PlannedCase, PlannedRun, SuiteMeta } from "../types.js";

export function planRun(suite: SuiteMeta, repeats: number): PlannedRun {
  const repeatsPerCase = Math.max(1, Math.trunc(repeats));

  const cases: PlannedCase[] = [];
  // Deterministic scheduling order (ARCHITECTURE.md §5.2): case order first,
  // repeat index second, so two runs of the same suite issue requests in the
  // same sequence.
  for (const c of suite.cases) {
    for (let i = 0; i < repeatsPerCase; i += 1) {
      cases.push({ case_id: c.case_id, repeat_index: i });
    }
  }

  return {
    suite,
    cases,
    repeats_per_case: repeatsPerCase,
    estimated_requests: cases.length,
  };
}
