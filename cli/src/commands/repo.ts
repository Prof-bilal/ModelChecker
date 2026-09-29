/** Owns the repository profile, recommendation, and explicit evaluation command. */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { runCommand, type RunResult } from "./run.js";
import { UsageError } from "../lib/args.js";
import { readRunIndex, scanRunIndex } from "../lib/runs.js";
import { recommendModels, type RepositoryRecommendation } from "../repo/recommend.js";
import { scanRepository } from "../repo/scanner.js";
import { buildRepositoryBenchmark } from "../repo/benchmark.js";
import type { Report, RepositoryProfile } from "../types.js";

export const REPOSITORY_PROVIDERS = ["openai", "anthropic", "openrouter", "groq", "xai", "deepseek"] as const;
export type RepositoryProvider = (typeof REPOSITORY_PROVIDERS)[number];

export interface RepositoryCommandResult {
  profile: RepositoryProfile;
  recommendation?: RepositoryRecommendation;
  evaluation?: Report;
  model?: string;
  provider?: string;
  benchmark?: { suite: string; cases: number; contextPaths: string[] };
}

export interface RepositoryCommandDependencies {
  scan: typeof scanRepository;
  loadReports: () => Promise<Report[]>;
  runEvaluation: (values: Record<string, unknown>) => Promise<RunResult>;
}

function isReport(value: unknown): value is Report {
  return typeof value === "object" && value !== null &&
    typeof (value as Partial<Report>).requested_model === "string" &&
    Array.isArray((value as Partial<Report>).capabilities) &&
    typeof (value as Partial<Report>).suite_content_hash === "string";
}

export async function loadLocalReports(): Promise<Report[]> {
  const entries = (await readRunIndex()) ?? (await scanRunIndex());
  const reports: Report[] = [];
  for (const entry of entries) {
    try {
      const parsed: unknown = JSON.parse(await readFile(path.join(entry.path, "report.json"), "utf8"));
      if (isReport(parsed)) reports.push(parsed);
    } catch {
      // The run index is rebuildable and may contain an old/deleted entry.
    }
  }
  return reports;
}

function normalizeProvider(value: string): RepositoryProvider {
  const normalized = value.toLowerCase() === "x-ai" ? "xai" : value.toLowerCase();
  if (!(REPOSITORY_PROVIDERS as readonly string[]).includes(normalized)) {
    throw new UsageError(`Provider "${value}" is unsupported for "repo". Pass one of: ${REPOSITORY_PROVIDERS.join(", ")}.`);
  }
  return normalized as RepositoryProvider;
}

const KNOWN_GATEWAYS = new Set(["openai", "anthropic", "openrouter", "groq", "xai", "x-ai", "deepseek", "opencode", "commandcode"]);

/** Converts the repo command's separate route argument back into the existing
 * gateway/wire-id convention. OpenRouter preserves vendor/model as its wire id. */
export function modelForProvider(model: string, providerValue: string): { model: string; provider: RepositoryProvider } {
  const provider = normalizeProvider(providerValue);
  const trimmed = model.trim();
  if (trimmed === "" || /\s/.test(trimmed)) {
    throw new UsageError(`Model "${model}" is invalid. Use the existing gateway/wire-id form without whitespace.`);
  }
  if (provider === "openrouter") {
    if (trimmed === "openrouter" || !trimmed.includes("/")) {
      throw new UsageError(`Model "${model}" is unsupported through OpenRouter. Pass a vendor/model id, e.g. anthropic/claude-sonnet-4.5.`);
    }
    return { model: trimmed.startsWith("openrouter/") ? trimmed : `openrouter/${trimmed}`, provider };
  }

  const slash = trimmed.indexOf("/");
  if (slash === -1) {
    throw new UsageError(`Model "${model}" is invalid. Use the existing gateway/wire-id form, e.g. ${provider}/<model>.`);
  }
  const prefix = trimmed.slice(0, slash).toLowerCase();
  const normalizedPrefix = prefix === "x-ai" ? "xai" : prefix;
  if (KNOWN_GATEWAYS.has(prefix) && normalizedPrefix !== provider) {
    throw new UsageError(`Model "${model}" targets gateway "${prefix}", so it is unsupported with provider "${provider}".`);
  }
  if (normalizedPrefix !== provider) {
    throw new UsageError(`Model "${model}" is unsupported with provider "${provider}". Use ${provider}/<model>.`);
  }
  if (trimmed.slice(slash + 1).length === 0) {
    throw new UsageError(`Model "${model}" is missing its wire id.`);
  }
  return { model: `${provider}/${trimmed.slice(slash + 1)}`, provider };
}

function list(values: string[]): string {
  return values.length === 0 ? "None detected" : values.join(", ");
}

function renderProfile(profile: RepositoryProfile): string[] {
  return [
    "Repository Analysis",
    "───────────────────",
    `Repository: ${profile.root}`,
    `Languages: ${list(profile.languages.map((language) => `${language.name} (${language.files})`))}`,
    `Frameworks: ${list(profile.frameworks)}`,
    `Project types: ${list(profile.projectTypes)}`,
    `Package managers: ${list(profile.packageManagers)}`,
    `Database: ${list(profile.databaseTechnologies)}`,
    `Tests: ${profile.hasTests ? "Yes" : "No"}`,
    `CI: ${profile.hasCi ? "Yes" : "No"}`,
    `Files: ${profile.repoSize.files} (${profile.repoSize.sourceFiles} source, ~${profile.repoSize.estimatedLines} lines)${profile.repoSize.truncated ? " — scan limit reached" : ""}`,
  ];
}

function renderCapabilityEvidence(report: Report): string[] {
  return report.capabilities.map((capability) =>
    `  ${capability.capability}: ${capability.pass}/${capability.scored} passed, ${capability.partial} partial, ${capability.fail} failed (${capability.planned} planned)`,
  );
}

export function renderRepositoryResult(result: RepositoryCommandResult): string {
  const lines = renderProfile(result.profile);
  if (result.evaluation !== undefined) {
    const report = result.evaluation;
    const passed = report.cases.filter((item) => item.outcome === "pass").length;
    const failed = report.cases.filter((item) => item.outcome === "fail").length;
    const partial = report.cases.filter((item) => item.outcome === "partial").length;
    const requestErrors = report.cases.filter((item) => item.outcome === "request_error" || item.outcome === "timeout").length;
    const averageLatency = report.cases.length === 0 ? 0 : Math.round(report.cases.reduce((sum, item) => sum + item.latency_ms, 0) / report.cases.length);
    lines.push(
      "",
      "Model",
      "─────",
      `Model: ${result.model ?? report.requested_model}`,
      `Provider: ${result.provider ?? report.provider}`,
      "",
      "Evaluation Results",
      "──────────────────",
      `Tasks: ${report.planned_count}`,
      `Passed: ${passed}`,
      `Failed: ${failed}`,
      `Partial: ${partial}`,
      `Request errors/timeouts: ${requestErrors}`,
      `Average latency: ${averageLatency} ms`,
    `Estimated cost: ${report.cost.total_usd === "unpriced" ? "unpriced" : `$${report.cost.total_usd.toFixed(6)}`}`,
      `Repository-specific benchmark: ${report.suite_id}@${report.suite_version} (${report.planned_count} cases)`,
      ...renderCapabilityEvidence(report),
      "",
      "Recommendation/Assessment",
      "─────────────────────────",
      "The measured results above cover ModelCheck's structured-output and tool-calling suite.",
      "Repository coding fit, multi-file reasoning, and framework-specific performance were not tested; this model is not labelled best merely because it was supplied.",
    );
    return lines.join("\n");
  }

  const recommendation = result.recommendation!;
  lines.push("", "Model Recommendation", "────────────────────");
  if (recommendation.recommended === undefined) {
    lines.push("Recommended: No defensible winner yet");
  } else {
    lines.push(`Recommended: ${recommendation.recommended.model}`);
    const evidence = recommendation.recommended.capabilities
      .map((capability) => `${capability.capability} ${capability.pass}/${capability.scored}`)
      .join(", ");
    lines.push(`Measured evidence: ${evidence} (${recommendation.recommended.suite}, run ${recommendation.recommended.runId})`);
  }
  lines.push("", "Evidence:", ...recommendation.reasons.map((reason) => `  • ${reason}`));
  if (recommendation.alternatives.length > 0) {
    lines.push("", "Candidates from comparable local runs:");
    for (const candidate of recommendation.alternatives) {
      const evidence = candidate.capabilities.map((capability) => `${capability.capability} ${capability.pass}/${capability.scored}`).join(", ");
      lines.push(`  • ${candidate.model} — ${evidence} (${candidate.suite}, run ${candidate.runId})`);
    }
  }
  lines.push("", "Limitations:", ...recommendation.limitations.map((limitation) => `  • ${limitation}`));
  return lines.join("\n");
}

export async function repoCommand(
  positionals: string[],
  values: Record<string, unknown> = {},
  dependencies: RepositoryCommandDependencies = {
    scan: scanRepository,
    loadReports: loadLocalReports,
    runEvaluation: runCommand,
  },
): Promise<RepositoryCommandResult> {
  const [repositoryPath, requestedModel, requestedProvider] = positionals;
  if (repositoryPath === undefined || repositoryPath.length === 0) {
    throw new UsageError(`Repository path is required. Use modelcheck repo <project-repo> [<model-name> <provider-name>].`);
  }
  const profile = await dependencies.scan(repositoryPath);
  if (requestedModel === undefined && requestedProvider === undefined) {
    const recommendation = recommendModels(profile, await dependencies.loadReports());
    const result = { profile, recommendation };
    if (values.json === true) console.log(JSON.stringify(result, null, 2));
    else console.error(renderRepositoryResult(result));
    return result;
  }
  if (requestedModel === undefined || requestedModel.length === 0) {
    throw new UsageError(`Model is required when a provider is supplied. Use modelcheck repo <project-repo> <model-name> <provider-name>.`);
  }
  if (requestedProvider === undefined || requestedProvider.length === 0) {
    throw new UsageError(`Provider is required when a model is supplied. Use modelcheck repo <project-repo> <model-name> <provider-name>.`);
  }
  const target = modelForProvider(requestedModel, requestedProvider);
  const benchmark = await buildRepositoryBenchmark(profile);
  const run = await dependencies.runEvaluation({ ...values, suite: "core", repoSuite: benchmark.suite, model: target.model });
  const result = {
    profile,
    evaluation: run.report,
    model: target.model,
    provider: target.provider,
    benchmark: { suite: `${benchmark.suite.meta.id}@${benchmark.suite.meta.version}`, cases: benchmark.suite.cases.length, contextPaths: benchmark.contextPaths },
  };
  if (values.json === true) console.log(JSON.stringify(result, null, 2));
  else console.error(renderRepositoryResult(result));
  return result;
}
