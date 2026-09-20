/** Owns the 7 mandatory limitation strings (EVALUATIONS.md §10). They are part
 * of the artefact: every report carries all seven, rendered in its body. */

/** §10.1 Sample size. `n` is the number of scored cases in the run; the
 * one-case swing is 100/n points, reported to at most one decimal (D11). */
export function sampleSizeLimitation(n: number): string {
  const points = n > 0 ? Math.round((100 / n) * 10) / 10 : 0;
  return `Results are based on ${n} case(s) in this run. A one-case difference is roughly ${points} points.`;
}

/** The full §10 list, in order. Every report carries all seven strings. */
export function mandatoryLimitations(opts: { scoredCases: number }): string[] {
  return [
    sampleSizeLimitation(opts.scoredCases),
    "This suite is a fixed set of cases. It does not represent your production traffic.",
    "Provider outputs may vary between requests. Reproducing this run reproduces the procedure, not necessarily the outputs.",
    "Capabilities not listed were not tested. They are not zero.",
    "This suite does not control for training-data contamination.",
    "Latency and cost reflect this provider, endpoint and parameter set.",
    "This result describes this model version at this time. Provider aliases can change what a model name serves.",
  ];
}
