/** Builds a small, deterministic repository-specific suite from a local
 * profile and a bounded context bundle. It deliberately stays read-only: no
 * repository scripts are run and no files are persisted in the suite store. */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { SuiteCase } from "../types.js";
import type { RepositoryProfile } from "../types.js";

const IGNORED = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".venv", "vendor", ".codeatlas", ".codex"]);
const SOURCE_EXTENSIONS = new Set([".c", ".cc", ".cpp", ".cs", ".go", ".java", ".js", ".jsx", ".kt", ".php", ".py", ".rb", ".rs", ".ts", ".tsx", ".vue"]);

function sensitive(relativePath: string): boolean {
  const base = path.basename(relativePath).toLowerCase();
  return base === ".env" || base.startsWith(".env.") || /\.(pem|key|p12|pfx|crt|cer)$/i.test(base) || /secret|credential/i.test(base);
}

async function contextFiles(profile: RepositoryProfile): Promise<Array<{ path: string; content: string }>> {
  const candidates = new Set<string>(profile.relevantFiles);
  const directories = [""];
  while (directories.length > 0 && candidates.size < 32) {
    const relative = directories.shift() ?? "";
    let entries;
    try {
      entries = await readdir(path.join(profile.root, relative), { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const child = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED.has(entry.name) && !sensitive(child)) directories.push(child);
        continue;
      }
      if (!entry.isFile() || sensitive(child)) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (SOURCE_EXTENSIONS.has(extension) || entry.name === "README.md") candidates.add(child);
      if (candidates.size >= 32) break;
    }
  }

  const selected = [...candidates].sort().slice(0, 12);
  const result: Array<{ path: string; content: string }> = [];
  for (const relative of selected) {
    try {
      const info = await stat(path.join(profile.root, relative));
      if (!info.isFile() || info.size > 16 * 1024) continue;
      result.push({ path: relative, content: await readFile(path.join(profile.root, relative), "utf8") });
    } catch {
      // The profile remains valid if a file disappears during the scan.
    }
  }
  return result;
}

function exactSchema(property: string, value: unknown): Record<string, unknown> {
  return { type: "object", additionalProperties: false, required: [property], properties: { [property]: { enum: [value] } } };
}

function promptFor(question: string, profile: RepositoryProfile, context: string): string {
  return [
    "You are answering a repository-specific benchmark.",
    "Return exactly one JSON object matching the response schema. Do not use Markdown fences or extra text.",
    `Question: ${question}`,
    `Repository profile: ${JSON.stringify(profile)}`,
    "Bounded repository context (paths and contents):",
    context,
  ].join("\n\n");
}

export interface RepositoryBenchmark {
  suite: { meta: { id: string; version: string }; cases: SuiteCase[] };
  contextPaths: string[];
}

export async function buildRepositoryBenchmark(profile: RepositoryProfile): Promise<RepositoryBenchmark> {
  const context = await contextFiles(profile);
  const contextText = context.map((file) => `--- ${file.path} ---\n${file.content}`).join("\n");
  const facts: Array<{ id: string; category: string; question: string; property: string; value: unknown }> = [
    { id: "languages", category: "repository_understanding", question: "Which programming languages are present? Return their names in the profile order.", property: "languages", value: profile.languages.map((item) => item.name) },
    { id: "frameworks", category: "architecture_understanding", question: "Which frameworks are detected? Return the exact sorted list.", property: "frameworks", value: profile.frameworks },
    { id: "project-types", category: "repository_understanding", question: "Which project types are detected? Return the exact sorted list.", property: "project_types", value: profile.projectTypes },
    { id: "package-managers", category: "dependency_understanding", question: "Which package managers are detected? Return the exact sorted list.", property: "package_managers", value: profile.packageManagers },
    { id: "databases", category: "dependency_understanding", question: "Which database technologies are detected? Return the exact sorted list.", property: "databases", value: profile.databaseTechnologies },
    { id: "tests-ci", category: "repository_understanding", question: "Does the repository contain tests and CI configuration? Return both booleans.", property: "tests_ci", value: { has_tests: profile.hasTests, has_ci: profile.hasCi } },
    { id: "architecture-signals", category: "architecture_understanding", question: "Which architecture signals were detected? Return the exact sorted list.", property: "architecture_signals", value: profile.architectureSignals },
    { id: "important-files", category: "code_navigation", question: "Which important manifest/configuration files did the scanner identify? Return the exact sorted list.", property: "important_files", value: profile.relevantFiles },
    { id: "source-size", category: "repository_understanding", question: "How many source files and estimated lines does this repository have? Return both values.", property: "source_size", value: { source_files: profile.repoSize.sourceFiles, estimated_lines: profile.repoSize.estimatedLines } },
    { id: "context-paths", category: "code_navigation", question: "Which paths are present in the bounded context supplied to you? Return them in sorted order.", property: "context_paths", value: context.map((file) => file.path).sort() },
  ];

  const cases = facts.map((fact) => ({
    case_id: `repo-${fact.id}`,
    capability: fact.category,
    version: "1",
    input: { prompt: promptFor(fact.question, profile, contextText) },
    scoring: "json_schema@1" as const,
    scoring_params: { schema: exactSchema(fact.property, fact.value) },
  }));
  return { suite: { meta: { id: "repository", version: "1.0.0" }, cases }, contextPaths: context.map((file) => file.path) };
}
