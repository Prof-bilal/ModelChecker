/** Owns the Scorer contract (PHASES.md Phase 3). A scorer is a pure function
 * from a raw provider response to an outcome: no I/O, no clock, no network. */

import type { Outcome } from "../types.js";

export interface ScorerResult {
  outcome: Extract<Outcome, "pass" | "fail" | "partial">;
  /** 1 for pass, 0 for fail, 0.5 for partial (EVALUATIONS.md §4). */
  score: number;
  reason?: string;
}
