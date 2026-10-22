/** Owns metric aggregation, strict threshold comparisons, and migration recommendations. */
import type { Comparison, Metric, Metrics, ProjectConfig, ProjectResult, Verdict } from "./types.js";

export function aggregate(results: ProjectResult[]): Metrics {
  const rate = (key: "task_success" | "schema_validity" | "instruction_following" | "tool_accuracy") => {
    const measured = results.filter((r) => r.status === "scored" && r[key] !== null);
    return { value: measured.length ? measured.filter((r) => r[key]).length / measured.length : null, n: measured.length, ...(measured.length ? {} : { reason: "not tested" }) };
  };
  const latencies = results.filter((r) => r.status === "scored").map((r) => r.latency_ms).sort((a, b) => a - b);
  const costs = results.filter((r) => r.estimated_cost_usd !== null);
  return {
    task_success: rate("task_success"), schema_validity: rate("schema_validity"), instruction_following: rate("instruction_following"), tool_accuracy: rate("tool_accuracy"),
    latency_p95: { value: latencies.length >= 20 ? latencies[Math.ceil(latencies.length * 0.95) - 1] : null, n: latencies.length, ...(latencies.length >= 20 ? {} : { reason: "p95 requires at least 20 scored cases" }) },
    cost: { value: costs.length === results.length && costs.length ? costs.reduce((sum, r) => sum + r.estimated_cost_usd!, 0) / costs.length : null, n: costs.length, ...(costs.length === results.length ? {} : { reason: "estimated charge unavailable for one or more cases" }) },
  };
}
const severity: Record<Verdict, number> = { PASS: 0, WARN: 1, FAIL: 2 };
export function compareMetrics(baseline: Metrics, candidate: Metrics, config: ProjectConfig, options: { invalid?: boolean; failed_cases?: string[]; config_changed?: boolean } = {}): Comparison {
  const metrics = (Object.keys(baseline) as Metric[]).map((metric) => {
    const a = baseline[metric], b = candidate[metric];
    const performance = metric === "cost" || metric === "latency_p95";
    let verdict: Verdict = "PASS";
    let delta: number | null = null;
    let reason: string | undefined;
    if (a.value === null || b.value === null) {
      reason = a.reason ?? b.reason ?? "metric unavailable";
      if (a.value !== null && b.value === null) verdict = "FAIL";
    } else {
      delta = performance ? (a.value === 0 ? (b.value === 0 ? 0 : null) : (b.value - a.value) / a.value) : b.value - a.value;
      const threshold = config.thresholds[metric];
      if (delta === null) { verdict = "FAIL"; reason = "relative increase from zero is undefined"; }
      else {
        const regression = performance ? delta : -delta;
        if (regression > (threshold?.fail_drop ?? threshold?.fail_increase ?? Infinity) + 1e-12) verdict = "FAIL";
        else if (regression > (threshold?.warn_drop ?? threshold?.warn_increase ?? Infinity) + 1e-12) verdict = "WARN";
      }
    }
    return { metric, baseline: a, candidate: b, delta, verdict, ...(reason ? { reason } : {}) };
  });
  const worst = metrics.reduce<Verdict>((a, m) => severity[m.verdict] > severity[a] ? m.verdict : a, options.invalid ? "FAIL" : "PASS");
  const uncertain = metrics.some((m) => (m.metric === "cost" || m.metric === "latency_p95" || m.baseline.value !== null) && (m.candidate.value === null || m.baseline.value === null));
  const improvement = metrics.some((m) => m.delta !== null && ((m.metric === "cost" || m.metric === "latency_p95") ? m.delta < -1e-12 : m.delta > 1e-12));
  return {
    verdict: worst, metrics, failed_cases: options.failed_cases ?? [], invalid: options.invalid ?? false, config_changed: options.config_changed ?? false,
    recommendation: worst === "FAIL" || candidate.task_success.n !== baseline.task_success.n ? "HOLD" : worst === "WARN" || uncertain ? "STAGED MIGRATION" : improvement ? "MIGRATE" : "HOLD",
  };
}
export function verdictExit(verdict: Verdict, strict: boolean): number { return verdict === "FAIL" ? 1 : verdict === "WARN" && strict ? 2 : 0; }
