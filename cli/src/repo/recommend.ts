/** Owns evidence-only repository recommendations from comparable local runs. */

import type { CapabilityAggregate, Report, RepositoryProfile } from "../types.js";

export interface CandidateEvidence {
  model: string;
  provider: string;
  runId: string;
  suite: string;
  capabilities: Array<Pick<CapabilityAggregate, "capability" | "scored" | "pass" | "partial" | "fail">>;
}

export interface RepositoryRecommendation {
  recommended?: CandidateEvidence;
  alternatives: CandidateEvidence[];
  reasons: string[];
  limitations: string[];
  evidenceStatus: "tested-with-modelcheck" | "insufficient-local-evidence";
}

function latestPerModel(reports: Report[]): Report[] {
  const latest = new Map<string, Report>();
  for (const report of reports) {
    if (report.status !== "completed" && report.status !== "completed_with_gaps") continue;
    const previous = latest.get(report.requested_model);
    if (previous === undefined || report.finished_at_utc > previous.finished_at_utc) {
      latest.set(report.requested_model, report);
    }
  }
  return [...latest.values()];
}

function candidateFrom(report: Report): CandidateEvidence {
  return {
    model: report.requested_model,
    provider: report.provider,
    runId: report.run_id,
    suite: `${report.suite_id}@${report.suite_version}`,
    capabilities: report.capabilities.map((capability) => ({
      capability: capability.capability,
      scored: capability.scored,
      pass: capability.pass,
      partial: capability.partial,
      fail: capability.fail,
    })).sort((a, b) => a.capability.localeCompare(b.capability)),
  };
}

function passRate(capability: CandidateEvidence["capabilities"][number]): number {
  return capability.scored === 0 ? -1 : capability.pass / capability.scored;
}

function dominates(candidate: CandidateEvidence, other: CandidateEvidence): boolean {
  const otherByCapability = new Map(other.capabilities.map((capability) => [capability.capability, capability]));
  let strictlyBetter = false;
  for (const capability of candidate.capabilities) {
    const comparison = otherByCapability.get(capability.capability);
    if (comparison === undefined || capability.scored !== comparison.scored || capability.scored === 0) return false;
    if (passRate(capability) < passRate(comparison)) return false;
    if (passRate(capability) > passRate(comparison)) strictlyBetter = true;
  }
  return candidate.capabilities.length === other.capabilities.length && strictlyBetter;
}

function workloadReasons(profile: RepositoryProfile): string[] {
  const reasons: string[] = [];
  if (profile.languages.length > 1) reasons.push("The repository is mixed-language and likely needs cross-language reasoning.");
  if (profile.repoSize.sourceFiles >= 50) reasons.push("The source-file count indicates a multi-file workload.");
  if (profile.hasTests) reasons.push("Tests are present, so a future repository trial can use repository-owned verification.");
  if (profile.frameworks.length > 0) reasons.push(`Detected framework boundaries: ${profile.frameworks.join(", ")}.`);
  return reasons;
}

export function recommendModels(profile: RepositoryProfile, reports: Report[]): RepositoryRecommendation {
  const latest = latestPerModel(reports);
  const cohorts = new Map<string, Report[]>();
  for (const report of latest) {
    const key = `${report.suite_id}:${report.suite_version}:${report.suite_content_hash}`;
    const cohort = cohorts.get(key) ?? [];
    cohort.push(report);
    cohorts.set(key, cohort);
  }
  const comparable = [...cohorts.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0]?.[1] ?? [];
  const candidates = comparable.map(candidateFrom).sort((a, b) => a.model.localeCompare(b.model));
  const winners = candidates.filter((candidate) =>
    candidates.length >= 2 && candidates.every((other) => candidate === other || dominates(candidate, other)),
  );
  const recommended = winners.length === 1 ? winners[0] : undefined;
  const limitations = [
    "The shipped core suite measures structured output and tool calling; coding and repository reasoning are not tested.",
    "Repository characteristics describe workload requirements, not model quality.",
    "Only comparable local ModelCheck reports are used; no public leaderboard or fabricated benchmark is substituted.",
  ];

  if (recommended === undefined) {
    return {
      alternatives: candidates,
      reasons: [
        ...workloadReasons(profile),
        candidates.length < 2
          ? "Fewer than two comparable local model evaluations are available, so there is no defensible winner."
          : "The comparable local evaluations do not identify one model that is non-inferior on every tested capability.",
      ],
      limitations,
      evidenceStatus: "insufficient-local-evidence",
    };
  }

  return {
    recommended,
    alternatives: candidates.filter((candidate) => candidate.model !== recommended.model),
    reasons: [
      ...workloadReasons(profile),
      `${recommended.model} is the only candidate non-inferior on every equally-sized tested capability in the selected local report cohort.`,
    ],
    limitations,
    evidenceStatus: "tested-with-modelcheck",
  };
}
